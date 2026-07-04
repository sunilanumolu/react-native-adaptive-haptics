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
 * Android: Waveform [0,25,10,1]
 *         (amplitude control on API ≥26; same timings on <26 without amplitude)
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
 * | Style    | iOS                                    | Android waveform + amplitude           |
 * |----------|----------------------------------------|----------------------------------------|
 * | `light`  | UIImpactFeedbackGenerator(.light)      | [0,40,10,1] @ 47% amplitude            |
 * | `medium` | UIImpactFeedbackGenerator(.medium)     | [0,70,10,1] @ 78% amplitude            |
 * | `heavy`  | UIImpactFeedbackGenerator(.heavy)      | [0,100,10,1] @ 100% amplitude          |
 * | `rigid`  | UIImpactFeedbackGenerator(.rigid)      | [0,80,10,1] @ 100% (heavy feel)        |
 * | `soft`   | UIImpactFeedbackGenerator(.soft)       | [0,30,10,1] @ 35% (light feel)         |
 *
 * On API <26 the same timing arrays are used but without amplitude control.
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
 * Android: double-pulse waveform [0,35,80,35]
 *         (amplitude control on API ≥26; same timings on <26 without amplitude)
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
 * Android: double-pulse waveform [0,45,70,45]
 *         (amplitude control on API ≥26; same timings on <26 without amplitude)
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
 * Android: triple-pulse waveform [0,35,55,35,55,35]
 *         (amplitude control on API ≥26; same timings on <26 without amplitude)
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
    amplitudeControl: NativeAdaptiveHaptics.hasAmplitudeControl(),
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
