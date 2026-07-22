package de.cldf.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var statusView: TextView
    private lateinit var recognizer: MusicRecognizer
    private var recognitionJob: Job? = null
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var bridgeScript: String = ""

    private val microphonePermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) startRecognition()
        else sendBridgeError("Mikrofonzugriff wurde nicht erlaubt.")
    }

    private val filePicker = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = fileChooserCallback ?: return@registerForActivityResult
        fileChooserCallback = null
        callback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data))
    }

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        statusView = findViewById(R.id.nativeStatus)
        recognizer = MusicRecognizerProvider.create(this)
        bridgeScript = assets.open("native-bridge.js").bufferedReader().use { it.readText() }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            allowContentAccess = true
            setSupportZoom(false)
        }
        webView.addJavascriptInterface(NativeJsBridge(this), "CLDFAndroid")
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                view.evaluateJavascript(bridgeScript, null)
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                val appHost = Uri.parse(BuildConfig.CLDF_APP_URL).host
                return if (uri.scheme == "https" && uri.host == appHost) {
                    false
                } else {
                    runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                    true
                }
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    val allowed = request.resources.filter { resource ->
                        when (resource) {
                            PermissionRequest.RESOURCE_AUDIO_CAPTURE ->
                                ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                            PermissionRequest.RESOURCE_VIDEO_CAPTURE ->
                                ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
                            else -> false
                        }
                    }.toTypedArray()
                    if (allowed.isNotEmpty()) request.grant(allowed) else request.deny()
                }
            }

            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = filePathCallback
                return runCatching {
                    filePicker.launch(fileChooserParams.createIntent())
                    true
                }.getOrElse {
                    fileChooserCallback = null
                    false
                }
            }
        }

        if (savedInstanceState == null) webView.loadUrl(BuildConfig.CLDF_APP_URL)
        else webView.restoreState(savedInstanceState)
    }

    fun requestShazamRecognition() {
        if (!BuildConfig.SHAZAM_ENABLED) {
            sendBridgeError("Dieser Build ist die Demo-Version. Für echte Erkennung bitte den Flavor „shazam“ bauen.")
            return
        }
        if (recognitionJob?.isActive == true) {
            cancelShazamRecognition()
            return
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            microphonePermission.launch(Manifest.permission.RECORD_AUDIO)
        } else {
            startRecognition()
        }
    }

    private fun startRecognition() {
        recognitionJob = lifecycleScope.launch {
            sendBridgeStatus("ShazamKit hört zu …")
            when (val outcome = recognizer.recognize(::sendBridgeStatus)) {
                is RecognitionOutcome.Match -> sendBridgeResult(outcome.song)
                RecognitionOutcome.NoMatch -> sendBridgeNoMatch()
                is RecognitionOutcome.Failure -> sendBridgeError(outcome.message)
            }
            hideNativeStatus()
        }
    }

    fun cancelShazamRecognition() {
        recognizer.cancel()
        recognitionJob?.cancel()
        recognitionJob = null
        sendBridgeStatus("Erkennung abgebrochen.")
        hideNativeStatus(900)
    }

    private fun sendBridgeResult(song: RecognizedSong) {
        val json = JSONObject().apply {
            put("title", song.title)
            put("artist", song.artist ?: JSONObject.NULL)
            put("shazamId", song.shazamId ?: JSONObject.NULL)
            put("isrc", song.isrc ?: JSONObject.NULL)
            put("appleMusicId", song.appleMusicId ?: JSONObject.NULL)
            put("appleMusicUrl", song.appleMusicUrl ?: JSONObject.NULL)
            put("artworkUrl", song.artworkUrl ?: JSONObject.NULL)
            put("webUrl", song.webUrl ?: JSONObject.NULL)
        }
        evaluate("window.CLDFNativeShazam?.receiveResult(${json});")
    }

    private fun sendBridgeNoMatch() = evaluate("window.CLDFNativeShazam?.receiveNoMatch();")

    private fun sendBridgeError(message: String) {
        val quoted = JSONObject.quote(message)
        evaluate("window.CLDFNativeShazam?.receiveError($quoted);")
        showNativeStatus(message)
        hideNativeStatus(2400)
    }

    private fun sendBridgeStatus(message: String) {
        evaluate("window.CLDFNativeShazam?.receiveStatus(${JSONObject.quote(message)});")
        showNativeStatus(message)
    }

    private fun evaluate(script: String) = runOnUiThread { webView.evaluateJavascript(script, null) }

    private fun showNativeStatus(message: String) = runOnUiThread {
        statusView.text = message
        statusView.visibility = View.VISIBLE
    }

    private fun hideNativeStatus(delayMs: Long = 400) = statusView.postDelayed({
        statusView.visibility = View.GONE
    }, delayMs)

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        recognizer.cancel()
        webView.removeJavascriptInterface("CLDFAndroid")
        webView.destroy()
        super.onDestroy()
    }
}
