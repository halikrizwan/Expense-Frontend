#!/usr/bin/env sh
set -e

ANDROID_FONT_DIR="android/app/src/main/assets/fonts"
FONT_SRC_DIR="node_modules/react-native-vector-icons/Fonts"

if [ -d "$FONT_SRC_DIR" ]; then
  mkdir -p "$ANDROID_FONT_DIR"
  cp "$FONT_SRC_DIR"/*.ttf "$ANDROID_FONT_DIR"/
  echo "Copied vector icon fonts to Android assets"
fi
