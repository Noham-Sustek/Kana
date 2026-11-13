#!/usr/bin/env bash
# APK Android signé (Linux ou WSL) : build web en mode android, synchro Capacitor, Gradle.
# Prérequis : Node, JDK 21 (JAVA_HOME), SDK Android (ANDROID_HOME), et pour signer :
#   KANA_KEYSTORE (chemin du .jks) + KANA_KEYSTORE_PASSWORD. Sans eux : APK de debug.
# Résultat : android/app/build/outputs/apk/{release,debug}/
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build:android
cd android
if [ -n "${KANA_KEYSTORE:-}" ]; then
  bash ./gradlew --no-daemon assembleRelease
  ls -l app/build/outputs/apk/release/*.apk
else
  echo "KANA_KEYSTORE absent : APK de debug (non signé pour la publication)."
  bash ./gradlew --no-daemon assembleDebug
  ls -l app/build/outputs/apk/debug/*.apk
fi
