package de.cldf.app

import android.util.Base64
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class TokenRepository {
    @Volatile private var cachedToken: String? = null

    fun getToken(): String {
        cachedToken?.takeIf(::isUsable)?.let { return it }

        val token = when {
            BuildConfig.SHAZAM_TOKEN_ENDPOINT.isNotBlank() -> fetchFromEndpoint(BuildConfig.SHAZAM_TOKEN_ENDPOINT)
            BuildConfig.SHAZAM_STATIC_TOKEN.isNotBlank() -> BuildConfig.SHAZAM_STATIC_TOKEN.trim()
            else -> throw IllegalStateException(
                "Kein ShazamKit-Token konfiguriert. CLDF_SHAZAM_TOKEN_ENDPOINT oder CLDF_SHAZAM_STATIC_TOKEN setzen."
            )
        }
        require(token.count { it == '.' } == 2) { "Der Token ist kein gültig aufgebautes JWT." }
        cachedToken = token
        return token
    }

    private fun fetchFromEndpoint(endpoint: String): String {
        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 7000
            readTimeout = 7000
            setRequestProperty("Accept", "application/json, text/plain")
        }
        return try {
            val status = connection.responseCode
            val body = (if (status in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()?.use { it.readText() }.orEmpty().trim()
            if (status !in 200..299) error("Token-Server antwortet mit HTTP $status.")
            if (body.startsWith("{")) JSONObject(body).getString("token").trim() else body
        } finally {
            connection.disconnect()
        }
    }

    private fun isUsable(token: String): Boolean {
        return runCatching {
            val payload = token.split('.')[1]
            val decoded = Base64.decode(payload, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
            val exp = JSONObject(String(decoded, Charsets.UTF_8)).optLong("exp", 0L)
            exp == 0L || exp > (System.currentTimeMillis() / 1000L) + 300L
        }.getOrDefault(false)
    }
}
