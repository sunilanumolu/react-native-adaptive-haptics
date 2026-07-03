package com.adaptivehaptics

import com.facebook.react.bridge.ReactApplicationContext

class AdaptiveHapticsModule(reactContext: ReactApplicationContext) :
  NativeAdaptiveHapticsSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeAdaptiveHapticsSpec.NAME
  }
}
