package de.cldf.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Process
import androidx.annotation.RequiresPermission
import androidx.core.content.ContextCompat
import com.shazam.shazamkit.AudioSampleRateInHz
import com.shazam.shazamkit.DeveloperToken
import com.shazam.shazamkit.DeveloperTokenProvider
import com.shazam.shazamkit.MatchResult
import com.shazam.shazamkit.ShazamKit
import com.shazam.shazamkit.ShazamKitResult
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

class ShazamKitMusicRecognizer(private val context: Context) : MusicRecognizer {
    private val cancelled = AtomicBoolean(false)
    @Volatile private var audioRecord: AudioRecord? = null
    @Volatile private var activeJob: Job? = null

    @RequiresPermission(Manifest.permission.RECORD_AUDIO)
    override suspend fun recognize(onStatus: (String) -> Unit): RecognitionOutcome = coroutineScope {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            return@coroutineScope RecognitionOutcome.Failure("Mikrofonberechtigung fehlt.")
        }
        cancelled.set(false)

        try {
            onStatus("ShazamKit wird vorbereitet …")
            val tokenRepository = TokenRepository()
            val provider = DeveloperTokenProvider { DeveloperToken(tokenRepository.getToken()) }
            val catalog = ShazamKit.createShazamCatalog(provider, Locale.GERMANY)

            val sampleRate = 48_000
            val bufferSize = AudioRecord.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            ).coerceAtLeast(4096)

            val session = when (val created = ShazamKit.createStreamingSession(
                catalog,
                AudioSampleRateInHz.SAMPLE_RATE_48000,
                bufferSize
            )) {
                is ShazamKitResult.Success -> created.data
                is ShazamKitResult.Failure -> return@coroutineScope RecognitionOutcome.Failure(
                    "ShazamKit konnte nicht gestartet werden: ${created.reason.message ?: created.reason}"
                )
            }

            val outcome = CompletableDeferred<RecognitionOutcome>()
            val resultJob = launch {
                session.recognitionResults().collect { result ->
                    when (result) {
                        is MatchResult.Match -> {
                            val item = result.matchedMediaItems.firstOrNull() ?: return@collect
                            val title = item.title?.trim().orEmpty()
                            if (title.isEmpty()) return@collect
                            outcome.complete(
                                RecognitionOutcome.Match(
                                    RecognizedSong(
                                        title = title,
                                        artist = item.artist,
                                        shazamId = item.shazamID,
                                        isrc = item.isrc,
                                        appleMusicId = item.appleMusicID,
                                        appleMusicUrl = item.appleMusicURL?.toString(),
                                        artworkUrl = item.artworkURL?.toString(),
                                        webUrl = item.webURL?.toString()
                                    )
                                )
                            )
                        }
                        is MatchResult.Error -> outcome.complete(
                            RecognitionOutcome.Failure(
                                "Fehler bei der Musikerkennung: ${result.exception.message ?: result.exception}"
                            )
                        )
                        is MatchResult.NoMatch -> Unit
                    }
                }
            }

            val recordingJob = launch(Dispatchers.IO) {
                Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
                val record = createAudioRecord(sampleRate, bufferSize)
                audioRecord = record
                val buffer = ByteArray(bufferSize)
                var totalBytes = 0L
                record.startRecording()
                onStatus("ShazamKit hört etwa 12 Sekunden zu …")
                while (isActive && !cancelled.get() && !outcome.isCompleted) {
                    val read = record.read(buffer, 0, buffer.size)
                    if (read > 0) {
                        val timestampMs = totalBytes * 1000L / (sampleRate * 2L)
                        session.matchStream(buffer, read, timestampMs)
                        totalBytes += read
                    } else if (read < 0) {
                        outcome.complete(RecognitionOutcome.Failure("Mikrofon-Lesefehler: $read"))
                    }
                }
            }
            activeJob = recordingJob

            val completed = withTimeoutOrNull(15_000L) { outcome.await() } ?: RecognitionOutcome.NoMatch
            recordingJob.cancelAndJoin()
            resultJob.cancelAndJoin()
            releaseRecorder()
            completed
        } catch (error: Throwable) {
            releaseRecorder()
            if (cancelled.get()) RecognitionOutcome.Failure("Erkennung abgebrochen.")
            else RecognitionOutcome.Failure(error.message ?: "Unbekannter ShazamKit-Fehler.")
        }
    }

    @RequiresPermission(Manifest.permission.RECORD_AUDIO)
    private fun createAudioRecord(sampleRate: Int, bufferSize: Int): AudioRecord {
        fun build(source: Int) = AudioRecord.Builder()
            .setAudioSource(source)
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(sampleRate)
                    .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
                    .build()
            )
            .setBufferSizeInBytes(bufferSize * 2)
            .build()

        val unprocessed = runCatching { build(MediaRecorder.AudioSource.UNPROCESSED) }.getOrNull()
        if (unprocessed?.state == AudioRecord.STATE_INITIALIZED) return unprocessed
        unprocessed?.release()

        return build(MediaRecorder.AudioSource.MIC).also {
            check(it.state == AudioRecord.STATE_INITIALIZED) { "Das Mikrofon konnte nicht initialisiert werden." }
        }
    }

    override fun cancel() {
        cancelled.set(true)
        activeJob?.cancel()
        releaseRecorder()
    }

    private fun releaseRecorder() {
        val record = audioRecord ?: return
        audioRecord = null
        runCatching { if (record.recordingState == AudioRecord.RECORDSTATE_RECORDING) record.stop() }
        runCatching { record.release() }
    }
}
