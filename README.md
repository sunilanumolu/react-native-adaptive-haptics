# react-native-adaptive-haptics

[![npm version](https://img.shields.io/npm/v/react-native-adaptive-haptics)](https://www.npmjs.com/package/react-native-adaptive-haptics)
[![license](https://img.shields.io/npm/l/react-native-adaptive-haptics)](LICENSE)
[![platforms](https://img.shields.io/badge/platforms-Android%20%7C%20iOS-blue)](https://www.npmjs.com/package/react-native-adaptive-haptics)

> **Write what you mean, not how to do it.**

The best cross-platform haptic feedback library for React Native. A **semantic-first** API that eliminates platform-specific code — describe the _feeling_ you want, and the library chooses the best native implementation.

```ts
import { haptics } from 'react-native-adaptive-haptics';

// No Platform.OS checks. No iOS vs Android branching.
haptics.impact('light'); // button press
haptics.success(); // task completed
haptics.error(); // something went wrong
```

## Requirements

| Platform     | Minimum Version      |
| ------------ | -------------------- |
| React Native | 0.71+                |
| iOS          | 13.0                 |
| Android      | API 23 (Android 6.0) |

## Features

- 🎯 **Semantic API** — `success()`, `warning()`, `error()`, `impact('light')`, `selection()`
- ⚡ **Zero-latency** — `prepare()` pre-warms generators before they're needed
- 🎨 **Custom pattern DSL** — declarative patterns with intensity, sharpness, and duration
- 📁 **.ahap file support** — load patterns designed in Apple's Haptic Composer
- ♿ **Accessibility-first** — respects Reduce Motion, System Haptics, and Vibration settings
- 🧩 **Graceful degradation** — iOS-only styles (`rigid`, `soft`) fall back on Android
- 🏗️ **New Architecture** — TurboModule (Fabric) with synchronous native dispatch

## Installation

```sh
npm install react-native-adaptive-haptics
# or
yarn add react-native-adaptive-haptics
# or
pnpm add react-native-adaptive-haptics
```

For iOS, run pod install:

```sh
cd ios && pod install
```

### Android Permissions

Add the VIBRATE permission to `AndroidManifest.xml` (the library declares it, but for clarity):

```xml
<uses-permission android:name="android.permission.VIBRATE" />
```

## Quick Start

The library supports two import styles — pick the one that fits your codebase:

```ts
// Namespaced (recommended for discoverability)
import { haptics } from 'react-native-adaptive-haptics';
haptics.impact('medium');

// Tree-shakeable (smaller bundle when using only a few functions)
import { impact, success } from 'react-native-adaptive-haptics';
impact('medium');
success();
```

Full example with pre-warming:

```ts
import { haptics } from 'react-native-adaptive-haptics';
import { Pressable } from 'react-native';

function MyButton() {
  return (
    <Pressable
      onPressIn={() => haptics.prepare('impact')}  // pre-warm for zero latency
      onPress={() => haptics.impact('medium')}      // instant feedback
    >
      <Text>Tap me</Text>
    </Pressable>
  );
}
```

## API Reference

### Semantic Feedback

| Method                     | Use Case             | iOS                            | Android (waveform)                  |
| -------------------------- | -------------------- | ------------------------------ | ----------------------------------- |
| `haptics.selection()`      | Picker/toggle change | `UISelectionFeedbackGenerator` | 25ms tick at 40% amplitude          |
| `haptics.impact('light')`  | Light button tap     | `.light` generator             | 40ms pulse at 47% amplitude         |
| `haptics.impact('medium')` | Default interaction  | `.medium` generator            | 70ms pulse at 78% amplitude         |
| `haptics.impact('heavy')`  | Strong confirmation  | `.heavy` generator             | 100ms pulse at full amplitude       |
| `haptics.impact('rigid')`  | iOS 13+ rigid feel   | `.rigid` generator             | 80ms pulse (degrades to heavy feel) |
| `haptics.impact('soft')`   | iOS 13+ soft feel    | `.soft` generator              | 30ms pulse (degrades to light feel) |
| `haptics.success()`        | Task completed       | `.success` notification        | Double-pulse: `[0,35,80,35]`        |
| `haptics.warning()`        | Caution state        | `.warning` notification        | Double-pulse: `[0,45,70,45]`        |
| `haptics.error()`          | Failure state        | `.error` notification          | Triple-pulse: `[0,35,55,35,55,35]`  |

### Preparation

```ts
// Pre-warm specific generators (call onPressIn or screen mount)
haptics.prepare('impact'); // all impact generators
haptics.prepare('notification'); // notification generator
haptics.prepare('selection'); // selection generator
haptics.prepare('custom'); // CHHapticEngine (iOS)

// Pre-warm ALL generators at once
haptics.prepareAll();
```

> **Why prepare?** iOS `UIFeedbackGenerator` has a small cold-start latency (~5-15ms). Calling `prepare()` on touch down eliminates this entirely, giving users instant tactile feedback.

### Custom Patterns

Custom patterns require the iOS `CHHapticEngine` to be running. **Always call `prepare('custom')` first** — otherwise the pattern silently falls back to a medium impact with no warning.

```ts
// Pre-warm the engine (call onPressIn, screen mount, or right before playback)
haptics.prepare('custom');

// Play a declarative pattern
haptics.custom([
  { intensity: 0.8, sharpness: 0.5, duration: 100 },
  { delay: 50 },
  { intensity: 1.0, sharpness: 1.0, duration: 150, type: 'continuous' },
]);
```

For patterns designed in Apple's Haptic Composer (iOS only; no-ops gracefully on Android):

```ts
haptics.prepare('custom');
haptics.customFromFile('heartbeat.ahap');
```

> **Note:** `.ahap` files are an Apple format. Use `haptics.custom(...)` for cross-platform patterns. `customFromFile` provides API symmetry but only plays on iOS.

<details>
<summary><b>Bundling .ahap files for iOS</b></summary>

AHAP files must be added to the Xcode app bundle — Metro does not bundle them automatically.

1. Create a `haptics/` folder inside your iOS project (e.g. `ios/YourApp/haptics/`)
2. Place your `.ahap` files there
3. In Xcode: right-click your app target → **Add Files to "YourApp"** → select the `.ahap` files
4. Ensure **"Copy items if needed"** is unchecked and your app target is checked
5. Verify the files appear in **Build Phases → Copy Bundle Resources**

</details>

### Control

```ts
// Disable all haptics (in-app mute)
haptics.setEnabled(false);

// Check device capability
if (haptics.supportsHaptics()) {
  haptics.impact('medium');
}
```

#### `haptics.getCapability()`

Returns detailed info about the device's haptic hardware:

```ts
interface HapticsCapability {
  /** Whether the device has any haptic hardware. */
  available: boolean;
  /** Platform name ('ios' | 'android'). */
  platform: string;
  /** Whether amplitude control is available (Android 8+). */
  amplitudeControl?: boolean;
}
```

```ts
const cap = haptics.getCapability();
// iOS:     { available: true, platform: 'ios' }
// Android: { available: true, platform: 'android', amplitudeControl: true }
```

## Platform Mapping

The library automatically maps semantic calls to the best available native primitive.
Android uses **custom waveform patterns** (rather than predefined effects) for consistent
feel across OEMs (Samsung, Pixel, OnePlus, etc.). All timings are manually tuned.

On Android API <26, the same timing arrays are used but without per-segment amplitude
control (the system applies its own default intensity).

| Semantic           | iOS                            | Android                                          |
| ------------------ | ------------------------------ | ------------------------------------------------ |
| `selection()`      | `UISelectionFeedbackGenerator` | Waveform `[0,25,10,1]` @ 40% amplitude           |
| `impact('light')`  | `.light`                       | Waveform `[0,40,10,1]` @ 47% amplitude           |
| `impact('medium')` | `.medium`                      | Waveform `[0,70,10,1]` @ 78% amplitude           |
| `impact('heavy')`  | `.heavy`                       | Waveform `[0,100,10,1]` @ 100% amplitude         |
| `impact('rigid')`  | `.rigid` (iOS 13+)             | Waveform `[0,80,10,1]` @ 100% (heavy fallback)   |
| `impact('soft')`   | `.soft` (iOS 13+)              | Waveform `[0,30,10,1]` @ 35% (light fallback)    |
| `success()`        | `.success` notification        | Double-pulse `[0,35,80,35]`                      |
| `warning()`        | `.warning` notification        | Double-pulse `[0,45,70,45]`                      |
| `error()`          | `.error` notification          | Triple-pulse `[0,35,55,35,55,35]`                |

Fallback timings are **manually tuned on reference devices** (Pixel, Samsung, OnePlus), not guessed.

## Accessibility

- **iOS**: Respects System Haptics toggle and Reduce Motion automatically. Custom `CHHapticEngine` patterns are suppressed when Reduce Motion is enabled.
- **Android**: Respects system vibration settings and intensity controls (Android 12+).
- Use `haptics.setEnabled(false)` for in-app haptic muting independent of system settings.

## Architecture

- **TurboModule (New Architecture)** — synchronous native dispatch for zero-overhead haptics
- **Objective-C** (iOS) — `UIFeedbackGenerator` + `CHHapticEngine`
- **Kotlin** (Android) — `VibratorManager` + `VibrationEffect`
- **Codegen** — TypeScript spec generates Obj-C and Kotlin interfaces

## Comparison

| Feature                 | expo-haptics | react-native-haptic-feedback | **adaptive-haptics** |
| ----------------------- | ------------ | ---------------------------- | -------------------- |
| Semantic API            | ⚠️ [¹](#s1)  | ⚠️ [²](#s2)                  | ✅                   |
| Custom pattern DSL      | ❌           | ✅ [²](#s2)                  | ✅                   |
| `prepare()` pre-warming | ❌           | ❌                           | ✅                   |
| .ahap file support      | ❌           | ✅ [²](#s2)                  | ✅                   |
| Tuned fallback table    | ❌           | ❌                           | ✅                   |
| TurboModule (Fabric)    | ❌           | ❌                           | ✅                   |

> <a id="s1">¹</a> **expo-haptics** has semantic methods (`selectionAsync`, `notificationAsync`, `impactAsync`) but requires verbose enum constants (`Haptics.ImpactFeedbackStyle.Light`) instead of string literals.
>
> <a id="s2">²</a> **react-native-haptic-feedback** supports semantic types via `trigger("impactLight")`, custom patterns via `triggerPattern(events[])` + `pattern("oO.O")`, and AHAP files via `playAHAP` / `playHaptic` — but its API is less structured (single `trigger()` dispatch) and has no pre-warming.

## Roadmap

Planned enhancements for future releases:

- [ ] **Synchronous TurboModule annotation** — Mark native methods as `RCTSync` to skip the async bridge queue entirely, enabling true zero-latency dispatch
- [ ] **Calibration screen** — Interactive example screen where contributors can tune vibration timings on new devices and PR their findings
- [ ] **Pattern playground** — Sliders for intensity, sharpness, and duration with live preview and "Copy DSL" export
- [ ] **Haptic debug monitor** — Optional on-screen overlay logging triggered haptic events (type, timings) for remote testing without vibration
- [ ] **Reanimated worklet support** — JSI function to call haptics directly from UI thread worklets without `runOnJS`

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

## Troubleshooting

<details>
<summary><b>Haptics don't fire on iOS simulator</b></summary>

Core Haptics and the Taptic Engine are **not available in the iOS Simulator**. Test on a physical device.

</details>

<details>
<summary><b>Android vibration isn't working</b></summary>

1. Ensure the `VIBRATE` permission is declared in `AndroidManifest.xml` (the library auto-declares it, but check your merged manifest)
2. Check that your device's vibration is enabled in system settings
3. On Android 12+, vibration intensity can be lowered globally — check **Settings → Sound & Vibration**

</details>

<details>
<summary><b>`supportsHaptics()` returns `false` on an iPhone</b></summary>

This is normal on older devices: iPhones before the 6s and certain iPad models lack a Taptic Engine. The library gracefully no-ops — your app won't crash, but no feedback will play.

</details>

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
