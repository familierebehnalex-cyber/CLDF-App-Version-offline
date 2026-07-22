package de.cldf.app

import android.webkit.JavascriptInterface

class NativeJsBridge(private val activity: MainActivity) {
    @JavascriptInterface
    fun startShazamRecognition() {
        activity.runOnUiThread { activity.requestShazamRecognition() }
    }

    @JavascriptInterface
    fun cancelShazamRecognition() {
        activity.runOnUiThread { activity.cancelShazamRecognition() }
    }

    @JavascriptInterface
    fun isShazamAvailable(): Boolean = BuildConfig.SHAZAM_ENABLED

    @JavascriptInterface
    fun appVersion(): String = BuildConfig.VERSION_NAME
}
