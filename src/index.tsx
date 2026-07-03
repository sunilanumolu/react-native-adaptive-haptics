import NativeAdaptiveHaptics from './NativeAdaptiveHaptics';
import type {
  CustomPattern,
  HapticsCapability,
  ImpactStyle,
  PrepareType,
} from './types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

let _enabled = true;

function guard(): boolean {
  if (!_enabled) {
    return false;
  }
  // Even if the device lacks haptics, calling the native methods is harmless
  // (they no-op on unsupported hardware). We still short-circuit for perf.
  if (!NativeAdaptiveHaptics.supportsHaptics()) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Public semantic API
// ---------------------------------------------------------------------------

/**
 * Trigger a selection haptic — use for picker changes, toggle switches, etc.
 *
 * iOS: UISelectionFeedbackGenerator
 * Android ≥29: VibrationEffect.EFFECT_TICK
 * Android <29: 10 ms pulse
 */
export function selection(): void {
  if (!guard()) {
    return;
  }
  NativeAdaptiveHaptics.triggerSelection();
}

/**
 * Trigger an impact haptic with the given style.
 *
 * | Style    | iOS                                    | Android ≥29                    | Android <29    |
 * |----------|----------------------------------------|--------------------------------|----------------|
 * | `light`  | UIImpactFeedbackGenerator(.light)      | EFFECT_CLICK                   | vibrate(20ms)  |
 * | `medium` | UIImpactFeedbackGenerator(.medium)     | EFFECT_HEAVY_CLICK             | vibrate(30ms)  |
 * | `heavy`  | UIImpactFeedbackGenerator(.heavy)      | EFFECT_DOUBLE_CLICK            | vibrate(40ms)  |
 * | `rigid`  | UIImpactFeedbackGenerator(.rigid)      | EFFECT_HEAVY_CLICK (fallback)  | vibrate(35ms)  |
 * | `soft`   | UIImpactFeedbackGenerator(.soft)       | EFFECT_TICK (fallback)         | vibrate(15ms)  |
 *
 * `rigid` and `soft` are iOS 13+ only and gracefully degrade on Android.
 */
export function impact(style: ImpactStyle): void {
  if (!guard()) {
    return;
  }
  NativeAdaptiveHaptics.impact(style);
}

/**
 * Trigger a success notification haptic — use when a task completes.
 *
 * iOS: UINotificationFeedbackGenerator(.success)
 * Android ≥29: double-pulse waveform [0,30,80,30]
 * Android <29: double-pulse [0,15,50,15]
 */
export function success(): void {
  if (!guard()) {
    return;
  }
  NativeAdaptiveHaptics.notify('success');
}

/**
 * Trigger a warning notification haptic — use for caution states.
 *
 * iOS: UINotificationFeedbackGenerator(.warning)
 * Android ≥29: single strong pulse [0,60]
 * Android <29: single pulse [0,10,30,10]
 */
export function warning(): void {
  if (!guard()) {
    return;
  }
  NativeAdaptiveHaptics.notify('warning');
}

/**
 * Trigger an error notification haptic — use for failure states.
 *
 * iOS: UINotificationFeedbackGenerator(.error)
 * Android ≥29: triple-pulse waveform [0,30,60,30,60,30]
 * Android <29: triple-pulse [0,20,40,20,40,20]
 */
export function error(): void {
  if (!guard()) {
    return;
  }
  NativeAdaptiveHaptics.notify('error');
}

/**
 * Pre-warm haptic generators to eliminate cold-start latency.
 *
 * - `'impact'`: prepares all UIImpactFeedbackGenerator instances
 * - `'notification'`: prepares UINotificationFeedbackGenerator
 * - `'selection'`: prepares UISelectionFeedbackGenerator
 * - `'custom'`: starts CHHapticEngine (iOS only)
 *
 * Best practice: call `prepare('impact')` on `onPressIn` of a Pressable,
 * or `prepare('notification')` on screen mount before a critical action.
 *
 * On Android, preparation is a no-op for predefined effects but exists
 * for API symmetry.
 */
export function prepare(type: PrepareType): void {
  if (!_enabled) {
    return;
  }
  NativeAdaptiveHaptics.prepare(type);
}

/**
 * Convenience: pre-warm all generator types at once.
 * Safe to call on screen mount — negligible memory overhead.
 */
export function prepareAll(): void {
  prepare('impact');
  prepare('notification');
  prepare('selection');
  prepare('custom');
}

// ---------------------------------------------------------------------------
// Custom pattern API
// ---------------------------------------------------------------------------

/**
 * Play a declarative custom haptic pattern.
 *
 * Each event in the pattern is an object with `intensity` (0–1),
 * `sharpness` (0–1), and `duration` (ms). Insert `{ delay: number }`
 * objects to add pauses between events.
 *
 * Set `type: 'continuous'` for sustained textures like heartbeat or
 * rolling thunder.
 *
 * @example
 * ```ts
 * haptics.custom([
 *   { intensity: 0.8, sharpness: 0.5, duration: 100 },
 *   { delay: 50 },
 *   { intensity: 1.0, sharpness: 1.0, duration: 150 },
 * ]);
 * ```
 *
 * iOS: compiled into CHHapticPattern
 * Android: converted to VibrationEffect waveform (amplitude = intensity × 255)
 */
export function custom(pattern: CustomPattern): void {
  if (!guard()) {
    return;
  }
  NativeAdaptiveHaptics.custom(JSON.stringify(pattern));
}

/**
 * Play a custom haptic pattern from a bundled `.ahap` file
 * (Apple Haptic and Audio Pattern).
 *
 * Designers can author patterns in Apple's Haptic Composer, drop the
 * `.ahap` file into the app bundle, and play it with this method.
 * On Android, the library does a best-effort translation of the AHAP
 * content into a VibrationEffect waveform.
 *
 * @param filename - The name of the `.ahap` file (without path), e.g. `"heartbeat.ahap"`.
 */
export function customFromFile(filename: string): void {
  if (!guard()) {
    return;
  }
  NativeAdaptiveHaptics.customFromFile(filename);
}

// ---------------------------------------------------------------------------
// Control & capability
// ---------------------------------------------------------------------------

/**
 * Enable or disable all haptic output globally.
 *
 * System-level settings (iOS System Haptics, Android Vibration) are
 * ALWAYS respected regardless of this toggle. This is intended for
 * in-app mute features (games, keyboards).
 */
export function setEnabled(enabled: boolean): void {
  _enabled = enabled;
  NativeAdaptiveHaptics.setEnabled(enabled);
}

/**
 * Synchronously check whether the device supports haptic feedback.
 *
 * Returns `false` on iPhone 6s and earlier, iPads without Taptic Engine,
 * iPod touch 7th gen, and Android devices without a vibrator motor.
 *
 * Even on devices that return `true`, haptic quality varies by hardware —
 * budget Android motors may produce weak feedback.
 */
export function supportsHaptics(): boolean {
  return NativeAdaptiveHaptics.supportsHaptics();
}

/**
 * Get detailed capability information about the device's haptic hardware.
 * Synchronous — no Promise needed.
 */
export function getCapability(): HapticsCapability {
  // Import inline to avoid circular dependency
  const { Platform } = require('react-native');
  return {
    available: NativeAdaptiveHaptics.supportsHaptics(),
    platform: Platform.OS,
    amplitudeControl: NativeAdaptiveHaptics.hasAmplitudeControl
      ? NativeAdaptiveHaptics.hasAmplitudeControl()
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Convenience namespace export
// ---------------------------------------------------------------------------

/**
 * The main haptics object — all semantic methods in one namespace.
 *
 * ```ts
 * import { haptics } from 'react-native-adaptive-haptics';
 *
 * haptics.prepare('impact');
 * haptics.impact('medium');
 * haptics.success();
 * ```
 */
export const haptics = {
  selection,
  impact,
  success,
  warning,
  error,
  prepare,
  prepareAll,
  custom,
  customFromFile,
  setEnabled,
  supportsHaptics,
  getCapability,
} as const;

// Re-export types for consumers
export type {
  CustomPattern,
  HapticsCapability,
  HapticDelay,
  HapticEventContinuous,
  HapticEventTransient,
  HapticPatternEvent,
  ImpactStyle,
  NotificationType,
  PrepareType,
} from './types';

// Re-export fallback table for advanced use / debugging
export {
  IMPACT_FALLBACKS,
  NOTIFICATION_FALLBACKS,
  SELECTION_FALLBACK,
} from './fallbackTable';
export type { FallbackEntry } from './fallbackTable';
