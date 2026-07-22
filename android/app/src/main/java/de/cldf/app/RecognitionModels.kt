package de.cldf.app

data class RecognizedSong(
    val title: String,
    val artist: String?,
    val shazamId: String?,
    val isrc: String?,
    val appleMusicId: String?,
    val appleMusicUrl: String?,
    val artworkUrl: String?,
    val webUrl: String?
)

sealed interface RecognitionOutcome {
    data class Match(val song: RecognizedSong) : RecognitionOutcome
    data object NoMatch : RecognitionOutcome
    data class Failure(val message: String) : RecognitionOutcome
}

interface MusicRecognizer {
    suspend fun recognize(onStatus: (String) -> Unit): RecognitionOutcome
    fun cancel()
}
