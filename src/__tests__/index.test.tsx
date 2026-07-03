import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock the native module before importing the library
jest.mock('../NativeAdaptiveHaptics', () => ({
  __esModule: true,
  default: {
    impact: jest.fn(),
    notify: jest.fn(),
    triggerSelection: jest.fn(),
    prepare: jest.fn(),
    custom: jest.fn(),
    customFromFile: jest.fn(),
    setEnabled: jest.fn(),
    supportsHaptics: jest.fn(() => true),
  },
}));

import {
  haptics,
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
} from '../index';

describe('react-native-adaptive-haptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setEnabled(true);
  });

  describe('semantic API', () => {
    it('selection() calls native triggerSelection', () => {
      selection();
      expect(
        require('../NativeAdaptiveHaptics').default.triggerSelection
      ).toHaveBeenCalledTimes(1);
    });

    it('impact("light") calls native impact with "light"', () => {
      impact('light');
      expect(
        require('../NativeAdaptiveHaptics').default.impact
      ).toHaveBeenCalledWith('light');
    });

    it('impact("medium") calls native impact with "medium"', () => {
      impact('medium');
      expect(
        require('../NativeAdaptiveHaptics').default.impact
      ).toHaveBeenCalledWith('medium');
    });

    it('impact("heavy") calls native impact with "heavy"', () => {
      impact('heavy');
      expect(
        require('../NativeAdaptiveHaptics').default.impact
      ).toHaveBeenCalledWith('heavy');
    });

    it('impact("rigid") calls native impact with "rigid"', () => {
      impact('rigid');
      expect(
        require('../NativeAdaptiveHaptics').default.impact
      ).toHaveBeenCalledWith('rigid');
    });

    it('impact("soft") calls native impact with "soft"', () => {
      impact('soft');
      expect(
        require('../NativeAdaptiveHaptics').default.impact
      ).toHaveBeenCalledWith('soft');
    });

    it('success() calls native notify with "success"', () => {
      success();
      expect(
        require('../NativeAdaptiveHaptics').default.notify
      ).toHaveBeenCalledWith('success');
    });

    it('warning() calls native notify with "warning"', () => {
      warning();
      expect(
        require('../NativeAdaptiveHaptics').default.notify
      ).toHaveBeenCalledWith('warning');
    });

    it('error() calls native notify with "error"', () => {
      error();
      expect(
        require('../NativeAdaptiveHaptics').default.notify
      ).toHaveBeenCalledWith('error');
    });
  });

  describe('preparation', () => {
    it('prepare("impact") calls native prepare with "impact"', () => {
      prepare('impact');
      expect(
        require('../NativeAdaptiveHaptics').default.prepare
      ).toHaveBeenCalledWith('impact');
    });

    it('prepare("notification") calls native prepare with "notification"', () => {
      prepare('notification');
      expect(
        require('../NativeAdaptiveHaptics').default.prepare
      ).toHaveBeenCalledWith('notification');
    });

    it('prepare("selection") calls native prepare with "selection"', () => {
      prepare('selection');
      expect(
        require('../NativeAdaptiveHaptics').default.prepare
      ).toHaveBeenCalledWith('selection');
    });

    it('prepareAll() calls prepare for all types', () => {
      prepareAll();
      const native = require('../NativeAdaptiveHaptics').default;
      expect(native.prepare).toHaveBeenCalledWith('impact');
      expect(native.prepare).toHaveBeenCalledWith('notification');
      expect(native.prepare).toHaveBeenCalledWith('selection');
      expect(native.prepare).toHaveBeenCalledWith('custom');
      expect(native.prepare).toHaveBeenCalledTimes(4);
    });
  });

  describe('custom patterns', () => {
    it('custom() serializes pattern to JSON and calls native', () => {
      const pattern = [
        { intensity: 0.8, sharpness: 0.5, duration: 100 },
        { delay: 50 },
        { intensity: 1.0, sharpness: 1.0, duration: 150 },
      ];
      custom(pattern);
      expect(
        require('../NativeAdaptiveHaptics').default.custom
      ).toHaveBeenCalledWith(JSON.stringify(pattern));
    });

    it('customFromFile() passes filename to native', () => {
      customFromFile('heartbeat.ahap');
      expect(
        require('../NativeAdaptiveHaptics').default.customFromFile
      ).toHaveBeenCalledWith('heartbeat.ahap');
    });
  });

  describe('control & capability', () => {
    it('setEnabled(false) calls native setEnabled with false', () => {
      setEnabled(false);
      expect(
        require('../NativeAdaptiveHaptics').default.setEnabled
      ).toHaveBeenCalledWith(false);
    });

    it('setEnabled(false) suppresses subsequent haptic calls', () => {
      setEnabled(false);
      jest.clearAllMocks();
      impact('medium');
      success();
      selection();
      // Native methods should NOT be called
      const native = require('../NativeAdaptiveHaptics').default;
      expect(native.impact).not.toHaveBeenCalled();
      expect(native.notify).not.toHaveBeenCalled();
      expect(native.triggerSelection).not.toHaveBeenCalled();
    });

    it('supportsHaptics() returns native value', () => {
      expect(supportsHaptics()).toBe(true);
    });

    it('getCapability() returns platform and availability', () => {
      const cap = getCapability();
      expect(cap.available).toBe(true);
      expect(cap.platform).toBeDefined();
    });
  });

  describe('haptics namespace', () => {
    it('exports all methods via haptics object', () => {
      expect(haptics.selection).toBe(selection);
      expect(haptics.impact).toBe(impact);
      expect(haptics.success).toBe(success);
      expect(haptics.warning).toBe(warning);
      expect(haptics.error).toBe(error);
      expect(haptics.prepare).toBe(prepare);
      expect(haptics.prepareAll).toBe(prepareAll);
      expect(haptics.custom).toBe(custom);
      expect(haptics.customFromFile).toBe(customFromFile);
      expect(haptics.setEnabled).toBe(setEnabled);
      expect(haptics.supportsHaptics).toBe(supportsHaptics);
      expect(haptics.getCapability).toBe(getCapability);
    });
  });
});
