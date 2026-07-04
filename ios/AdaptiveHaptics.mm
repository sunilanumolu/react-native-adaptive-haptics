#import "AdaptiveHaptics.h"

#import <UIKit/UIFeedbackGenerator.h>
#import <UIKit/UIImpactFeedbackGenerator.h>
#import <UIKit/UINotificationFeedbackGenerator.h>
#import <UIKit/UISelectionFeedbackGenerator.h>
#import <UIKit/UIAccessibility.h>
#import <CoreHaptics/CoreHaptics.h>
#import <AVFoundation/AVFoundation.h>

@interface AdaptiveHaptics ()
@property (nonatomic, strong) UIImpactFeedbackGenerator *impactLight;
@property (nonatomic, strong) UIImpactFeedbackGenerator *impactMedium;
@property (nonatomic, strong) UIImpactFeedbackGenerator *impactHeavy;
@property (nonatomic, strong) UIImpactFeedbackGenerator *impactRigid;
@property (nonatomic, strong) UIImpactFeedbackGenerator *impactSoft;
@property (nonatomic, strong) UINotificationFeedbackGenerator *notification;
@property (nonatomic, strong) UISelectionFeedbackGenerator *selection;
@property (nonatomic, strong) CHHapticEngine *customEngine;
@property (nonatomic, assign) BOOL customEngineRunning;

// Private method declarations
- (void)startCustomEngine;
- (void)handleAppDidBecomeActive;
- (void)handleAudioSessionInterruption:(NSNotification *)notification;
- (void)playCustomPattern:(NSString *)json;
- (void)playCustomPatternFromFile:(NSString *)filename;
- (nullable CHHapticPattern *)convertToCHHapticPattern:(NSArray<NSDictionary *> *)array;
@end

@implementation AdaptiveHaptics

- (instancetype)init {
  self = [super init];
  if (self) {
    _impactLight = [[UIImpactFeedbackGenerator alloc] initWithStyle:UIImpactFeedbackStyleLight];
    _impactMedium = [[UIImpactFeedbackGenerator alloc] initWithStyle:UIImpactFeedbackStyleMedium];
    _impactHeavy = [[UIImpactFeedbackGenerator alloc] initWithStyle:UIImpactFeedbackStyleHeavy];

    if (@available(iOS 13.0, *)) {
      _impactRigid = [[UIImpactFeedbackGenerator alloc] initWithStyle:UIImpactFeedbackStyleRigid];
      _impactSoft = [[UIImpactFeedbackGenerator alloc] initWithStyle:UIImpactFeedbackStyleSoft];
    } else {
      _impactRigid = [[UIImpactFeedbackGenerator alloc] initWithStyle:UIImpactFeedbackStyleMedium];
      _impactSoft = [[UIImpactFeedbackGenerator alloc] initWithStyle:UIImpactFeedbackStyleLight];
    }

    _notification = [[UINotificationFeedbackGenerator alloc] init];
    _selection = [[UISelectionFeedbackGenerator alloc] init];
    _customEngineRunning = NO;
  }
  return self;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

#pragma mark - NativeAdaptiveHapticsSpec

- (void)impact:(NSString *)style {
  dispatch_async(dispatch_get_main_queue(), ^{
    if ([style isEqualToString:@"light"]) {
      [self.impactLight impactOccurred];
    } else if ([style isEqualToString:@"medium"]) {
      [self.impactMedium impactOccurred];
    } else if ([style isEqualToString:@"heavy"]) {
      [self.impactHeavy impactOccurred];
    } else if ([style isEqualToString:@"rigid"]) {
      [self.impactRigid impactOccurred];
    } else if ([style isEqualToString:@"soft"]) {
      [self.impactSoft impactOccurred];
    } else {
      [self.impactMedium impactOccurred];
    }
  });
}

- (void)notify:(NSString *)type {
  dispatch_async(dispatch_get_main_queue(), ^{
    if ([type isEqualToString:@"success"]) {
      [self.notification notificationOccurred:UINotificationFeedbackTypeSuccess];
    } else if ([type isEqualToString:@"warning"]) {
      [self.notification notificationOccurred:UINotificationFeedbackTypeWarning];
    } else if ([type isEqualToString:@"error"]) {
      [self.notification notificationOccurred:UINotificationFeedbackTypeError];
    }
  });
}

- (void)triggerSelection {
  dispatch_async(dispatch_get_main_queue(), ^{
    [self.selection selectionChanged];
  });
}

- (void)prepare:(NSString *)type {
  dispatch_async(dispatch_get_main_queue(), ^{
    if ([type isEqualToString:@"impact"]) {
      [self.impactLight prepare];
      [self.impactMedium prepare];
      [self.impactHeavy prepare];
      [self.impactRigid prepare];
      [self.impactSoft prepare];
    } else if ([type isEqualToString:@"notification"]) {
      [self.notification prepare];
    } else if ([type isEqualToString:@"selection"]) {
      [self.selection prepare];
    } else if ([type isEqualToString:@"custom"]) {
      [self startCustomEngine];
    }
  });
}

- (void)custom:(NSString *)patternJson {
  // Reduce Motion gates custom patterns only — UIFeedbackGenerator-based
  // APIs (impact/notify/selection) produce system-native feedback that
  // iOS itself already suppresses under Reduce Motion, so no double-gating needed.
  if (UIAccessibilityIsReduceMotionEnabled()) return;

  dispatch_async(dispatch_get_main_queue(), ^{
    [self playCustomPattern:patternJson];
  });
}

- (void)customFromFile:(NSString *)filename {
  if (UIAccessibilityIsReduceMotionEnabled()) return;

  dispatch_async(dispatch_get_main_queue(), ^{
    [self playCustomPatternFromFile:filename];
  });
}

- (void)setEnabled:(BOOL)enabled {
  // No-op on iOS — UIFeedbackGenerator respects system-level
  // "System Haptics" toggle automatically.
}

- (NSNumber *)supportsHaptics {
  // UIKit feedback generators (impact, notification, selection) are available on all
  // iOS devices. CoreHaptics may be unavailable on some devices/simulators, but our
  // custom pattern methods fall back gracefully. Always return YES so the JS guard
  // doesn't block the UIKit-based API.
  return @(YES);
}

- (NSNumber *)hasAmplitudeControl {
  // iOS does not expose amplitude control — UIFeedbackGenerator handles
  // intensity internally through the generator styles.
  return @(NO);
}

#pragma mark - CHHapticEngine Lifecycle

- (void)startCustomEngine {
  if (@available(iOS 13.0, *)) {
    if (self.customEngine != nil) {
      [self.customEngine startWithCompletionHandler:^(NSError * _Nullable error) {
        self.customEngineRunning = (error == nil);
      }];
      return;
    }

    if (![CHHapticEngine capabilitiesForHardware].supportsHaptics) return;

    NSError *error = nil;
    CHHapticEngine *engine = [[CHHapticEngine alloc] initAndReturnError:&error];
    if (!engine || error) return;

    engine.playsHapticsOnly = YES;
    engine.autoShutdownEnabled = YES;

    __weak AdaptiveHaptics *weakSelf = self;
    engine.stoppedHandler = ^(CHHapticEngineStoppedReason reason) {
      weakSelf.customEngineRunning = NO;
    };

    engine.resetHandler = ^{
      [weakSelf.customEngine startWithCompletionHandler:^(NSError * _Nullable err) {
        weakSelf.customEngineRunning = (err == nil);
      }];
    };

    [engine startWithCompletionHandler:^(NSError * _Nullable err) {
      weakSelf.customEngineRunning = (err == nil);
    }];

    self.customEngine = engine;

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleAppDidBecomeActive)
                                                 name:UIApplicationDidBecomeActiveNotification
                                               object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleAudioSessionInterruption:)
                                                 name:AVAudioSessionInterruptionNotification
                                               object:nil];
  }
}

- (void)handleAppDidBecomeActive {
  if (!self.customEngine || self.customEngineRunning) return;
  [self.customEngine startWithCompletionHandler:^(NSError * _Nullable error) {
    self.customEngineRunning = (error == nil);
  }];
}

- (void)handleAudioSessionInterruption:(NSNotification *)notification {
  NSDictionary *info = notification.userInfo;
  NSUInteger rawType = [info[AVAudioSessionInterruptionTypeKey] unsignedIntegerValue];
  AVAudioSessionInterruptionType type = (AVAudioSessionInterruptionType)rawType;
  if (type == AVAudioSessionInterruptionTypeEnded && self.customEngine && !self.customEngineRunning) {
    [self.customEngine startWithCompletionHandler:^(NSError * _Nullable error) {
      self.customEngineRunning = (error == nil);
    }];
  }
}

#pragma mark - Custom Pattern Playback

- (void)playCustomPattern:(NSString *)json {
  if (@available(iOS 13.0, *)) {
    // Only gate on engine existence — not on customEngineRunning.
    // prepare('custom') starts the engine asynchronously; if custom() fires
    // before the completion handler runs, customEngineRunning is still NO
    // even though the engine may already accept players. We try anyway
    // and let createPlayerWithPattern:error: be the real gate.
    if (!self.customEngine) {
      [self.impactMedium impactOccurred];
      return;
    }

    NSData *data = [json dataUsingEncoding:NSUTF8StringEncoding];
    if (!data) return;

    NSError *error = nil;
    NSArray *patternArray = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
    if (error || ![patternArray isKindOfClass:[NSArray class]]) return;

    CHHapticPattern *pattern = [self convertToCHHapticPattern:patternArray];
    if (!pattern) {
      [self.impactMedium impactOccurred];
      return;
    }

    id<CHHapticPatternPlayer> player = [self.customEngine createPlayerWithPattern:pattern error:&error];
    if (error || !player) {
      [self.impactMedium impactOccurred];
      return;
    }

    [player startAtTime:0 error:nil];
  } else {
    [self.impactMedium impactOccurred];
  }
}

- (void)playCustomPatternFromFile:(NSString *)filename {
  if (@available(iOS 13.0, *)) {
    // Same reasoning as playCustomPattern: — gate on engine existence only,
    // not on the async customEngineRunning flag.
    if (!self.customEngine) {
      [self.impactMedium impactOccurred];
      return;
    }

    NSString *name = [filename stringByDeletingPathExtension];
    NSString *ext = [filename pathExtension];
    NSURL *url = [[NSBundle mainBundle] URLForResource:name withExtension:ext];
    if (!url) {
      [self.impactMedium impactOccurred];
      return;
    }

    NSError *error = nil;
    NSData *fileData = [NSData dataWithContentsOfURL:url];
    if (!fileData) {
      [self.impactMedium impactOccurred];
      return;
    }
    NSDictionary *patternDict = [NSJSONSerialization JSONObjectWithData:fileData options:0 error:&error];
    if (error || !patternDict) {
      [self.impactMedium impactOccurred];
      return;
    }
    CHHapticPattern *pattern = [[CHHapticPattern alloc] initWithDictionary:patternDict error:&error];
    if (error || !pattern) {
      [self.impactMedium impactOccurred];
      return;
    }

    id<CHHapticPatternPlayer> player = [self.customEngine createPlayerWithPattern:pattern error:&error];
    if (error || !player) {
      [self.impactMedium impactOccurred];
      return;
    }

    [player startAtTime:0 error:nil];
  } else {
    [self.impactMedium impactOccurred];
  }
}

- (nullable CHHapticPattern *)convertToCHHapticPattern:(NSArray<NSDictionary *> *)array {
  NSMutableArray<CHHapticEvent *> *events = [NSMutableArray array];
  NSTimeInterval currentTime = 0;

  for (NSDictionary *item in array) {
    NSNumber *delay = item[@"delay"];
    if (delay) {
      currentTime += [delay doubleValue] / 1000.0;
      continue;
    }

    NSNumber *intensity = item[@"intensity"];
    NSNumber *sharpness = item[@"sharpness"];
    NSNumber *durationMs = item[@"duration"];
    if (!intensity || !sharpness || !durationMs) continue;

    NSTimeInterval duration = [durationMs doubleValue] / 1000.0;
    NSString *eventTypeStr = item[@"type"];
    CHHapticEventType eventType = [eventTypeStr isEqualToString:@"continuous"]
      ? CHHapticEventTypeHapticContinuous
      : CHHapticEventTypeHapticTransient;

    CHHapticEventParameter *intensityParam = [[CHHapticEventParameter alloc]
      initWithParameterID:CHHapticEventParameterIDHapticIntensity
                    value:[intensity floatValue]];
    CHHapticEventParameter *sharpnessParam = [[CHHapticEventParameter alloc]
      initWithParameterID:CHHapticEventParameterIDHapticSharpness
                    value:[sharpness floatValue]];

    CHHapticEvent *event = [[CHHapticEvent alloc]
      initWithEventType:eventType
             parameters:@[intensityParam, sharpnessParam]
           relativeTime:currentTime
               duration:duration];

    [events addObject:event];
    currentTime += duration;
  }

  if (events.count == 0) return nil;

  NSError *error = nil;
  return [[CHHapticPattern alloc] initWithEvents:events parameters:@[] error:&error];
}

#pragma mark - TurboModule

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeAdaptiveHapticsSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"AdaptiveHaptics";
}

@end
