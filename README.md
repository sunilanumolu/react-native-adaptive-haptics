# react-native-adaptive-haptics

> **Write what you mean, not how to do it.**

The best cross-platform haptic feedback library for React Native. A **semantic-first** API that eliminates platform-specific code — describe the _feeling_ you want, and the library chooses the best native implementation.

```ts
import { haptics } from 'react-native-adaptive-haptics';

// No Platform.OS checks. No iOS vs Android branching.
haptics.impact('light'); // button press
haptics.success(); // task completed
haptics.error(); // something went wrong
```

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

```ts
haptics.custom([
  { intensity: 0.8, sharpness: 0.5, duration: 100 },
  { delay: 50 },
  { intensity: 1.0, sharpness: 1.0, duration: 150, type: 'continuous' },
]);
```

For patterns designed in Apple's Haptic Composer (iOS only; no-ops gracefully on Android):

```ts
haptics.customFromFile('heartbeat.ahap');
```

> **Note:** `.ahap` files are an Apple format. Use `haptics.custom(...)` for cross-platform patterns. `customFromFile` provides API symmetry but only plays on iOS.

### Control

```ts
// Disable all haptics (in-app mute)
haptics.setEnabled(false);

// Check device capability
if (haptics.supportsHaptics()) {
  haptics.impact('medium');
}

// Get detailed capability info
const cap = haptics.getCapability();
// { available: true, platform: 'ios' }
// On Android 8+: { available: true, platform: 'android', amplitudeControl: true }
```

## Platform Mapping

The library automatically maps semantic calls to the best available native primitive.
Android uses **custom waveform patterns** (rather than predefined effects) for consistent
feel across OEMs (Samsung, Pixel, OnePlus, etc.). All timings are manually tuned.

| Semantic           | iOS                            | Android (API ≥26)                              | Android <26          |
| ------------------ | ------------------------------ | ---------------------------------------------- | -------------------- |
| `selection()`      | `UISelectionFeedbackGenerator` | Waveform `[0,25,10,1]` @ 40% amplitude         | `vibrate(25ms)`      |
| `impact('light')`  | `.light`                       | Waveform `[0,40,10,1]` @ 47% amplitude         | `vibrate(40ms)`      |
| `impact('medium')` | `.medium`                      | Waveform `[0,70,10,1]` @ 78% amplitude         | `vibrate(70ms)`      |
| `impact('heavy')`  | `.heavy`                       | Waveform `[0,100,10,1]` @ 100% amplitude       | `vibrate(100ms)`     |
| `impact('rigid')`  | `.rigid` (iOS 13+)             | Waveform `[0,80,10,1]` @ 100% (heavy fallback) | `vibrate(80ms)`      |
| `impact('soft')`   | `.soft` (iOS 13+)              | Waveform `[0,30,10,1]` @ 35% (light fallback)  | `vibrate(30ms)`      |
| `success()`        | `.success` notification        | Double-pulse `[0,35,80,35]`                    | `[0,15,50,15]`       |
| `warning()`        | `.warning` notification        | Double-pulse `[0,45,70,45]`                    | `[0,10,30,10]`       |
| `error()`          | `.error` notification          | Triple-pulse `[0,35,55,35,55,35]`              | `[0,20,40,20,40,20]` |

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
| Semantic API            | ❌           | ❌                           | ✅                   |
| Custom pattern DSL      | ❌           | ❌                           | ✅                   |
| `prepare()` pre-warming | ❌           | ❌                           | ✅                   |
| .ahap file support      | ❌           | ❌                           | ✅                   |
| Tuned fallback table    | ❌           | ❌                           | ✅                   |
| TurboModule (Fabric)    | ❌           | ❌                           | ✅                   |

## Roadmap

Planned enhancements for future releases:

- [ ] **Synchronous TurboModule annotation** — Mark native methods as `RCTSync` to skip the async bridge queue entirely, enabling true zero-latency dispatch
- [ ] **Calibration screen** — Interactive example screen where contributors can tune vibration timings on new devices and PR their findings
- [ ] **Pattern playground** — Sliders for intensity, sharpness, and duration with live preview and "Copy DSL" export
- [ ] **Haptic debug monitor** — Optional on-screen overlay logging triggered haptic events (type, timings) for remote testing without vibration
- [ ] **Reanimated worklet support** — JSI function to call haptics directly from UI thread worklets without `runOnJS`

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

## License

MIT

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
