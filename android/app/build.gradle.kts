plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

fun String.asBuildConfigString(): String = "\"" + replace("\\", "\\\\").replace("\"", "\\\"") + "\""

val cldfAppUrl = providers.gradleProperty("CLDF_APP_URL")
    .orElse("https://familierebehnalex-cyber.github.io/CLDF-App-Version-offline/")
    .get()
val shazamTokenEndpoint = providers.gradleProperty("CLDF_SHAZAM_TOKEN_ENDPOINT").orElse("").get()
val shazamStaticToken = providers.gradleProperty("CLDF_SHAZAM_STATIC_TOKEN").orElse("").get()

android {
    namespace = "de.cldf.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "de.cldf.app"
        minSdk = 21
        targetSdk = 35
        versionCode = 4713
        versionName = "4.7.13"

        buildConfigField("String", "CLDF_APP_URL", cldfAppUrl.asBuildConfigString())
        buildConfigField("String", "SHAZAM_TOKEN_ENDPOINT", shazamTokenEndpoint.asBuildConfigString())
        buildConfigField("String", "SHAZAM_STATIC_TOKEN", shazamStaticToken.asBuildConfigString())
    }

    flavorDimensions += "recognition"
    productFlavors {
        create("demo") {
            dimension = "recognition"
            applicationIdSuffix = ".demo"
            versionNameSuffix = "-demo"
            buildConfigField("Boolean", "SHAZAM_ENABLED", "false")
        }
        create("shazam") {
            dimension = "recognition"
            buildConfigField("Boolean", "SHAZAM_ENABLED", "true")
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { buildConfig = true }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.10.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // Wird nur beim Flavor "shazam" benötigt.
    add("shazamImplementation", files("libs/shazamkit-android-release.aar"))
    add("shazamImplementation", "com.squareup.okhttp3:okhttp:4.12.0")
    add("shazamImplementation", "com.squareup.retrofit2:retrofit:2.11.0")
    add("shazamImplementation", "com.squareup.retrofit2:converter-gson:2.11.0")
}
