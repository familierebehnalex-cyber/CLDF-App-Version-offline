package de.cldf.app

import android.content.Context

object MusicRecognizerProvider {
    fun create(context: Context): MusicRecognizer = ShazamKitMusicRecognizer(context.applicationContext)
}
