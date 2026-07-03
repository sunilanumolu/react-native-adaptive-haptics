package com.adaptivehaptics

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.facebook.react.bridge.ReactApplicationContext
import org.json.JSONArray
import org.json.JSONObject

class AdaptiveHapticsModule(reactContext: ReactApplicationContext) :
  NativeAdaptiveHapticsSpec(reactContext) {

  private val vibrator: Vibrator by lazy {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val manager = reactContext.getSystemService(VibratorManager::class.java)
      manager.defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      reactContext.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }
  }

  private var enabled = true

  // -----------------------------------------------------------------------
  // Impact
  // -----------------------------------------------------------------------

  override fun impact(style: String) {
    if (!enabled || !vibrator.hasVibrator()) return

    // Android drops pairs with timing=0 (docs: "Timing values of 0 will cause
    // the pair to be ignored"). We need 3+ surviving pairs for Pixel 10, so use
    // a 4-element pattern where 3 remain after the leading 0 is dropped.
    val (timings, amplitudes) = when (style) {
      "light"  -> longArrayOf(0, 40, 10, 1)  to intArrayOf(0, 120, 0, 0)
      "soft"   -> longArrayOf(0, 30, 10, 1)  to intArrayOf(0, 90, 0, 0)
      "medium" -> longArrayOf(0, 70, 10, 1)  to intArrayOf(0, 200, 0, 0)
      "heavy"  -> longArrayOf(0, 100, 10, 1) to intArrayOf(0, 255, 0, 0)
      "rigid"  -> longArrayOf(0, 80, 10, 1)  to intArrayOf(0, 255, 0, 0)
      else     -> longArrayOf(0, 50, 10, 1)  to intArrayOf(0, 160, 0, 0)
    }
    safeVibrateWaveform(timings, amplitudes)
  }

  // -----------------------------------------------------------------------
  // Notification (success / warning / error)
  // -----------------------------------------------------------------------

  override fun notify(type: String) {
    if (!enabled || !vibrator.hasVibrator()) return

    // Distinct waveform patterns — clearly different feel for each notification type.
    // Timings: alternating [wait, vibrate, wait, vibrate, ...] in milliseconds.
    val (timings, amplitudes) = when (type) {
      "success" -> longArrayOf(0, 35, 80, 35) to
                   intArrayOf(0, 120, 0, 120)
      "warning" -> longArrayOf(0, 45, 70, 45) to
                   intArrayOf(0, 255, 0, 255)
      "error"   -> longArrayOf(0, 35, 55, 35, 55, 35) to
                   intArrayOf(0, 255, 0, 255, 0, 255)
      else      -> longArrayOf(0, 25, 10, 1) to
                   intArrayOf(0, VibrationEffect.DEFAULT_AMPLITUDE, 0, 0)
    }
    safeVibrateWaveform(timings, amplitudes)
  }

  // -----------------------------------------------------------------------
  // Selection
  // -----------------------------------------------------------------------

  override fun triggerSelection() {
    if (!enabled || !vibrator.hasVibrator()) return

    // 4-element waveform: [0] is dropped by Android, leaving 3 effective pairs
    safeVibrateWaveform(longArrayOf(0, 25, 10, 1), intArrayOf(0, 100, 0, 0))
  }

  // -----------------------------------------------------------------------
  // Prepare (no-op on Android, exists for API symmetry)
  // -----------------------------------------------------------------------

  override fun prepare(type: String) {
    // Android predefined effects don't benefit from pre-warming.
    // Custom engine preparation could cache effects here in future versions.
  }

  // -----------------------------------------------------------------------
  // Custom patterns
  // -----------------------------------------------------------------------

  override fun custom(patternJson: String) {
    if (!enabled || !vibrator.hasVibrator()) return

    try {
      val pattern = JSONArray(patternJson)
      playCustomPattern(pattern)
    } catch (_: Exception) {
      // Silently fall back — malformed JSON shouldn't crash
    }
  }

  override fun customFromFile(filename: String) {
    if (!enabled || !vibrator.hasVibrator()) return

    // Best-effort .ahap translation for Android.
    // .ahap files are Apple Haptic and Audio Pattern JSON files.
    // We attempt to parse the file from assets and extract Pattern events,
    // converting CHHapticEvent entries into VibrationEffect waveform segments.
    try {
      val assetManager = reactApplicationContext.assets
      val inputStream = assetManager.open(filename)
      val json = inputStream.bufferedReader().use { it.readText() }
      val ahap = JSONObject(json)

      // .ahap structure: { "Version": 1.0, "Metadata": {...}, "Pattern": [...] }
      val patternArray = ahap.optJSONArray("Pattern")
      if (patternArray != null) {
        playAHAPPattern(patternArray)
      } else {
        // Fall back to a medium impact if AHAP parsing fails
        impact("medium")
      }
    } catch (_: Exception) {
      // File not found, malformed JSON, etc. — fall back gracefully
      impact("medium")
    }
  }

  /**
   * Parse an AHAP Pattern array and convert to VibrationEffect waveform.
   *
   * AHAP events have:
   *   - Event: { EventType: "HapticTransient"|"HapticContinuous",
   *              EventParameters: [{ ParameterID: "HapticIntensity", ParameterValue: 0.8 }, ...],
   *              EventDuration?: seconds, Time: seconds }
   *   - EventType "HapticTransient" → short tap
   *   - EventType "HapticContinuous" → sustained vibration of EventDuration
   */
  private fun playAHAPPattern(pattern: JSONArray) {
    val timings = mutableListOf<Long>()
    val amplitudes = mutableListOf<Int>()
    var lastTimeSeconds = 0.0

    for (i in 0 until pattern.length()) {
      val event = pattern.getJSONObject(i)

      // Skip non-haptic events (e.g., audio events in AHAP files)
      val eventType = event.optString("EventType", "")
      if (eventType != "HapticTransient" && eventType != "HapticContinuous") continue

      val timeSeconds = event.optDouble("Time", lastTimeSeconds)
      val durationSeconds = if (eventType == "HapticContinuous") {
        event.optDouble("EventDuration", 0.05)
      } else {
        0.0 // Transients are instantaneous
      }

      // Extract intensity from EventParameters
      var intensity = 0.5
      val params = event.optJSONArray("EventParameters")
      if (params != null) {
        for (j in 0 until params.length()) {
          val param = params.getJSONObject(j)
          if (param.optString("ParameterID") == "HapticIntensity") {
            intensity = param.optDouble("ParameterValue", 0.5)
            break
          }
        }
      }

      val gapMs = ((timeSeconds - lastTimeSeconds) * 1000).toLong()
      val durationMs = (durationSeconds * 1000).toLong().coerceAtLeast(1)
      val amplitude = (intensity * 255).toInt().coerceIn(1, 255)

      // Add silence gap between events
      if (gapMs > 0 && timings.isNotEmpty()) {
        timings.add(gapMs)
        amplitudes.add(0)
      }

      // Add the vibrate segment
      if (timings.isEmpty()) {
        timings.add(0)
        amplitudes.add(0)
      }
      timings.add(durationMs)
      amplitudes.add(amplitude)

      lastTimeSeconds = timeSeconds + durationSeconds
    }

    if (timings.isEmpty()) {
      impact("medium")
      return
    }

    val timingsArray = timings.toLongArray()
    val amplitudesArray = amplitudes.toIntArray()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      safeVibrateWaveform(timingsArray, amplitudesArray)
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(timingsArray, -1)
    }
  }

  /**
   * Convert our declarative JSON pattern to a VibrationEffect waveform.
   *
   * Each event with intensity/sharpness/duration becomes a segment.
   * Delays add silent gaps. Amplitude = intensity * 255 (capped).
   */
  private fun playCustomPattern(pattern: JSONArray) {
    val timings = mutableListOf<Long>()
    val amplitudes = mutableListOf<Int>()

    for (i in 0 until pattern.length()) {
      val item = pattern.getJSONObject(i)

      if (item.has("delay")) {
        // Add a silent gap
        val delayMs = item.getLong("delay")
        if (timings.isNotEmpty()) {
          // The last element was a vibrate; add a zero-amplitude gap
          timings.add(delayMs)
          amplitudes.add(0)
        } else {
          // Leading delay
          timings.add(0)
          amplitudes.add(0)
          timings.add(delayMs)
          amplitudes.add(0)
        }
        continue
      }

      val intensity = item.optDouble("intensity", 0.5)
      val duration = item.optLong("duration", 50)

      val amplitude = (intensity * 255).toInt().coerceIn(1, 255)

      if (timings.isEmpty() || timings.last() != 0L) {
        // First segment or after a delay — add a wait before vibrating
        timings.add(0)
        amplitudes.add(0)
      }

      timings.add(duration)
      amplitudes.add(amplitude)
    }

    if (timings.isEmpty()) return

    val timingsArray = timings.toLongArray()
    val amplitudesArray = amplitudes.toIntArray()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      safeVibrateWaveform(timingsArray, amplitudesArray)
    } else {
      // Pre-API 26: no amplitude support, just use timings
      @Suppress("DEPRECATION")
      vibrator.vibrate(timingsArray, -1)
    }
  }

  // -----------------------------------------------------------------------
  // Control & capability
  // -----------------------------------------------------------------------

  override fun setEnabled(isEnabled: Boolean) {
    enabled = isEnabled
    if (!isEnabled) {
      vibrator.cancel()
    }
  }

  override fun supportsHaptics(): Boolean {
    return vibrator.hasVibrator()
  }

  override fun hasAmplitudeControl(): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.hasAmplitudeControl()
    } else {
      false
    }
  }

  // -----------------------------------------------------------------------
  // Safe helpers (catch SecurityException)
  // -----------------------------------------------------------------------

  private fun safeVibrateWaveform(timings: LongArray, amplitudes: IntArray) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        vibrator.vibrate(
          VibrationEffect.createWaveform(timings, amplitudes, -1)
        )
      } else {
        @Suppress("DEPRECATION")
        vibrator.vibrate(timings, -1)
      }
    } catch (_: SecurityException) {
      // App lacks VIBRATE permission — no-op gracefully
    }
  }

  companion object {
    const val NAME = NativeAdaptiveHapticsSpec.NAME
  }
}

