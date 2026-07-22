-keep class de.cldf.app.NativeJsBridge { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.shazam.shazamkit.** { *; }
-dontwarn com.shazam.shazamkit.**
