# Fallback Table — Android Vibration Patterns

This document tracks the vibration timing patterns used on Android when
predefined effects are unavailable (API < 26) or when waveforms produce more
consistent results across OEMs.

All timings in milliseconds. Format: `[wait, vibrate, wait, vibrate, ...]`.

---

## Impact Fallbacks

| Style  | Pattern           | Amplitude  | Notes                                                |
| ------ | ----------------- | ---------- | ---------------------------------------------------- |
| light  | `[0, 40, 10, 1]`  | 47% (120)  | Light tap — barely perceptible                       |
| soft   | `[0, 30, 10, 1]`  | 35% (90)   | iOS soft feel approximated with short light pulse    |
| medium | `[0, 70, 10, 1]`  | 78% (200)  | Standard click — distinct but not jarring            |
| heavy  | `[0, 100, 10, 1]` | 100% (255) | Heavy thud — pronounced feedback                     |
| rigid  | `[0, 80, 10, 1]`  | 100% (255) | iOS rigid feel approximated with shorter heavy pulse |

### API < 26 (no amplitude support)

| Style  | Pattern   | Notes                        |
| ------ | --------- | ---------------------------- |
| light  | `[0, 20]` | Single 20ms pulse            |
| medium | `[0, 30]` | Single 30ms pulse            |
| heavy  | `[0, 40]` | Single 40ms pulse            |
| rigid  | `[0, 35]` | Slightly shorter heavy pulse |
| soft   | `[0, 15]` | Very short light pulse       |

---

## Notification Fallbacks

| Type    | Pattern                   | Amplitude       | Notes                               |
| ------- | ------------------------- | --------------- | ----------------------------------- |
| success | `[0, 35, 80, 35]`         | 47% (120, 120)  | Double pulse — positive affirmation |
| warning | `[0, 45, 70, 45]`         | 100% (255, 255) | Double pulse — attention-getting    |
| error   | `[0, 35, 55, 35, 55, 35]` | 100% (all 3)    | Triple pulse — urgent alert         |

### API < 26 (no amplitude support)

| Type    | Pattern                   | Notes                            |
| ------- | ------------------------- | -------------------------------- |
| success | `[0, 15, 50, 15]`         | Double pulse                     |
| warning | `[0, 10, 30, 10]`         | Single strong pulse with lead-in |
| error   | `[0, 20, 40, 20, 40, 20]` | Triple pulse                     |

---

## Selection Fallback

| Type      | Pattern          | Amplitude | Notes                         |
| --------- | ---------------- | --------- | ----------------------------- |
| selection | `[0, 25, 10, 1]` | 39% (100) | Fast tick — barely noticeable |

### API < 26

| Type      | Pattern   | Notes            |
| --------- | --------- | ---------------- |
| selection | `[0, 10]` | Single 10ms tick |

---

## Tuning Reference Devices

| Device     | Android Version | Motor Quality | Tuned By     | Date |
| ---------- | --------------- | ------------- | ------------ | ---- |
| Pixel 4a   | 13              | Good          | @contributor | 2024 |
| Galaxy S20 | 13              | Good          | @contributor | 2024 |
| OnePlus 9  | 12              | Good          | @contributor | 2024 |

---

## Why Waveforms Instead of Predefined Effects?

Android's predefined effects (`EFFECT_CLICK`, `EFFECT_TICK`, etc.) vary
significantly in feel across OEMs. Samsung devices tend to produce very
strong feedback, while some Pixel devices produce weak feedback for the
same effect ID. Custom waveform patterns with tuned amplitudes give us
consistent results regardless of manufacturer.

## Contributing

If you tune these values on a new device and find improvements, please:

1. Test on the reference devices to ensure no regression
2. Update this document with your findings
3. Open a PR with rationale for the changes

The source of truth for these values is in `src/fallbackTable.ts`.
