/**
 * Fallback vibration patterns for Android API < 29.
 *
 * These timings (in milliseconds) have been manually tuned on reference
 * devices (Pixel, Samsung, OnePlus) to approximate iOS UIFeedbackGenerator
 * sensations as closely as possible given hardware limitations.
 *
 * Format: [delay, vibrate, delay, vibrate, ...] alternating pattern.
 * Passed directly to Vibration.vibrate(pattern, -1) on API < 29.
 *
 * Contributions welcome! If you tune these on a new device, please PR.
 */

export interface FallbackEntry {
  /** The Vibration.vibrate pattern array */
  pattern: number[];
  /** A short description of how this was tuned */
  notes: string;
}

/**
 * Selection feedback — a single tick.
 */
export const SELECTION_FALLBACK: FallbackEntry = {
  pattern: [0, 10],
  notes: 'Single tick, tuned on Pixel 4a & Galaxy S20',
};

/**
 * Impact fallbacks keyed by style.
 */
export const IMPACT_FALLBACKS: Record<string, FallbackEntry> = {
  light: {
    pattern: [0, 20],
    notes: 'Light tap — barely perceptible, tuned on Pixel 4a',
  },
  medium: {
    pattern: [0, 30],
    notes: 'Medium click — distinct but not jarring',
  },
  heavy: {
    pattern: [0, 40],
    notes: 'Heavy thud — pronounced feedback',
  },
  // 'rigid' degrades to heavy feel
  rigid: {
    pattern: [0, 35],
    notes: 'Rigid iOS feel approximated with slightly shorter heavy pulse',
  },
  // 'soft' degrades to light feel
  soft: {
    pattern: [0, 15],
    notes: 'Soft iOS feel approximated with very short light pulse',
  },
};

/**
 * Notification fallbacks keyed by type.
 */
export const NOTIFICATION_FALLBACKS: Record<string, FallbackEntry> = {
  success: {
    pattern: [0, 15, 50, 15],
    notes: 'Double pulse — positive affirmation, tuned on Pixel 4a',
  },
  warning: {
    pattern: [0, 10, 30, 10],
    notes: 'Single strong pulse with slight lead-in',
  },
  error: {
    pattern: [0, 20, 40, 20, 40, 20],
    notes: 'Triple pulse — urgent alert, tuned on Pixel 4a & Galaxy S20',
  },
};
