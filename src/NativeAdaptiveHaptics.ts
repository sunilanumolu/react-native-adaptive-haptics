import {
  TurboModuleRegistry,
  NativeModules,
  type TurboModule,
} from 'react-native';

/**
 * TurboModule spec for react-native-adaptive-haptics.
 *
 * All haptic-triggering methods are synchronous (void return) to ensure
 * zero added latency — the native side immediately dispatches to the
 * UI thread. The codegen generates Obj-C and Kotlin interfaces from this spec.
 */
export interface Spec extends TurboModule {
  /**
   * Trigger an impact feedback with the given style.
   * Maps to UIImpactFeedbackGenerator on iOS and VibrationEffect on Android.
   */
  impact(style: string): void;

  /**
   * Trigger a notification feedback (success/warning/error).
   * Maps to UINotificationFeedbackGenerator on iOS and waveform patterns on Android.
   */
  notify(type: string): void;

  /**
   * Trigger a selection feedback (picker/toggle change).
   * Maps to UISelectionFeedbackGenerator on iOS and EFFECT_TICK on Android.
   */
  triggerSelection(): void;

  /**
   * Pre-warm generators for the given type.
   * Call on gesture start (onPressIn) or screen mount to eliminate cold-start latency.
   */
  prepare(type: string): void;

  /**
   * Play a custom haptic pattern (JSON-serialized CustomPattern array).
   * On iOS this compiles to CHHapticPattern; on Android to VibrationEffect waveform.
   */
  custom(patternJson: string): void;

  /**
   * Play a custom pattern from a bundled .ahap file.
   * iOS natively supports .ahap; Android does a best-effort translation.
   */
  customFromFile(filename: string): void;

  /**
   * Enable or disable all haptic output.
   * Useful for in-app mute toggles (games, keyboards).
   * Note: System-level settings (iOS System Haptics, Android vibration) are
   * always respected regardless of this toggle.
   */
  setEnabled(enabled: boolean): void;

  /**
   * Synchronously check whether the device has haptic hardware.
   * Returns false on devices without a Taptic Engine / vibrator motor.
   */
  supportsHaptics(): boolean;

  /**
   * Check whether the device supports amplitude control for vibration.
   * iOS always returns false (UIFeedbackGenerator handles it internally).
   * Android returns vibrator.hasAmplitudeControl() (API 26+).
   */
  hasAmplitudeControl(): boolean;
}

// Try TurboModule first (New Architecture), fall back to NativeModules (old bridge).
// This ensures backward compatibility with RN ≥ 0.68.
const NativeHaptics = (TurboModuleRegistry.get<Spec>('AdaptiveHaptics') ??
  NativeModules.AdaptiveHaptics) as Spec;

if (!NativeHaptics) {
  throw new Error(
    'react-native-adaptive-haptics: Native module not found. ' +
      'Make sure you have rebuilt your app after installing the package. ' +
      'For iOS, run `cd ios && pod install`.'
  );
}

export default NativeHaptics;
