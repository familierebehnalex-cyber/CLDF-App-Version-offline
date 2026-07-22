package de.cldf.app

import android.content.Context

object MusicRecognizerProvider {
    fun create(context: Context): MusicRecognizer = DemoMusicRecognizer()
}

private class DemoMusicRecognizer : MusicRecognizer {
    override suspend fun recognize(onStatus: (String) -> Unit): RecognitionOutcome {
        return RecognitionOutcome.Failure(
            "ShazamKit ist in diesem Demo-Build nicht enthalten. Öffne in Android Studio die Build-Variante shazamDebug."
        )
    }

    override fun cancel() = Unit
}
