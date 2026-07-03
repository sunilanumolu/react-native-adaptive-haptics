/**
 * Semantic impact styles.
 * - 'light', 'medium', 'heavy': available on all platforms
 * - 'rigid', 'soft': iOS 13+ only; gracefully degrade on Android
 */
export type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

/**
 * Semantic notification types for task feedback.
 */
export type NotificationType = 'success' | 'warning' | 'error';

/**
 * Generator types that can be pre-warmed via prepare().
 */
export type PrepareType = 'impact' | 'notification' | 'selection' | 'custom';

// ---------------------------------------------------------------------------
// Custom Pattern DSL
// ---------------------------------------------------------------------------

/**
 * A transient haptic event — a single tap-like pulse.
 */
export interface HapticEventTransient {
  /** Event intensity from 0 (none) to 1 (max). */
  intensity: number;
  /** Event sharpness from 0 (round) to 1 (crisp). */
  sharpness: number;
  /** Duration in milliseconds. */
  duration: number;
  /** Defaults to 'transient' when omitted. */
  type?: 'transient';
}

/**
 * A continuous haptic event — a sustained texture (e.g. heartbeat, rolling thunder).
 * On iOS this creates an intensity ramp; on Android it maps to a waveform with amplitude.
 */
export interface HapticEventContinuous {
  intensity: number;
  sharpness: number;
  duration: number;
  type: 'continuous';
}

/**
 * A pause between haptic events, in milliseconds.
 */
export interface HapticDelay {
  delay: number;
}

/**
 * A single element in a custom haptic pattern.
 */
export type HapticPatternEvent = HapticEventTransient | HapticEventContinuous;

/**
 * A declarative custom haptic pattern — an array of events and delays.
 *
 * @example
 * ```ts
 * haptics.custom([
 *   { intensity: 0.8, sharpness: 0.5, duration: 100 },
 *   { delay: 50 },
 *   { intensity: 1.0, sharpness: 1.0, duration: 150 },
 * ]);
 * ```
 */
export type CustomPattern = (HapticPatternEvent | HapticDelay)[];

// ---------------------------------------------------------------------------
// Capability & State
// ---------------------------------------------------------------------------

/**
 * Result of the device capability check.
 */
export interface HapticsCapability {
  /** Whether the device has any haptic hardware. */
  available: boolean;
  /** Platform name ('ios' | 'android'). */
  platform: string;
  /** Whether amplitude control is available (Android 8+). */
  amplitudeControl?: boolean;
}
