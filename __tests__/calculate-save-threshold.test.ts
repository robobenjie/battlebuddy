/**
 * Test for calculateSaveThreshold function
 * This function is used by DiceRollResults to determine which save to display
 */

import { describe, it, expect } from 'vitest';
import { calculateSaveThreshold } from '../lib/dice-utils';

describe('calculateSaveThreshold', () => {
  describe('invulnerable save selection', () => {
    it('should use invuln when it is better than modified armor save', () => {
      // Target: 6+ armor, 5+ invuln
      // Weapon: -1 AP
      // Modified armor: 6 - (-1) = 7+ (impossible)
      // Invuln: 5+
      // Should use invuln (5+)
      const result = calculateSaveThreshold(6, -1, 5);

      expect(result.threshold).toBe(5);
      expect(result.usingInvulnerable).toBe(true);
    });

    it('should use invuln when modified armor save equals invuln', () => {
      // Target: 5+ armor, 5+ invuln
      // Weapon: 0 AP
      // Modified armor: 5 - 0 = 5+
      // Invuln: 5+
      // Should use invuln (both are same, invuln preferred)
      const result = calculateSaveThreshold(5, 0, 5);

      expect(result.threshold).toBe(5);
      expect(result.usingInvulnerable).toBe(true);
    });

    it('should use armor save when it is better than invuln', () => {
      // Target: 3+ armor, 5+ invuln
      // Weapon: -1 AP
      // Modified armor: 3 - (-1) = 4+
      // Invuln: 5+
      // Should use armor (4+)
      const result = calculateSaveThreshold(3, -1, 5);

      expect(result.threshold).toBe(4);
      expect(result.usingInvulnerable).toBe(false);
    });

    it('should use invuln when high AP makes armor save worse', () => {
      // Target: 3+ armor, 5+ invuln
      // Weapon: -3 AP
      // Modified armor: 3 - (-3) = 6+
      // Invuln: 5+
      // Should use invuln (5+)
      const result = calculateSaveThreshold(3, -3, 5);

      expect(result.threshold).toBe(5);
      expect(result.usingInvulnerable).toBe(true);
    });

    it('should use invuln when armor save is impossible (7+)', () => {
      // Target: 4+ armor, 4+ invuln
      // Weapon: -4 AP
      // Modified armor: 4 - (-4) = 8+ (impossible)
      // Invuln: 4+
      // Should use invuln (4+)
      const result = calculateSaveThreshold(4, -4, 4);

      expect(result.threshold).toBe(4);
      expect(result.usingInvulnerable).toBe(true);
    });
  });

  describe('no invulnerable save', () => {
    it('should use armor save when no invuln exists', () => {
      // Target: 3+ armor, no invuln
      // Weapon: -1 AP
      // Modified armor: 3 - (-1) = 4+
      const result = calculateSaveThreshold(3, -1, undefined);

      expect(result.threshold).toBe(4);
      expect(result.usingInvulnerable).toBe(false);
    });

    it('should return 7 (impossible) when armor save is 7+ and no invuln', () => {
      // Target: 5+ armor, no invuln
      // Weapon: -3 AP
      // Modified armor: 5 - (-3) = 8+ (impossible)
      const result = calculateSaveThreshold(5, -3, undefined);

      expect(result.threshold).toBe(7);
      expect(result.usingInvulnerable).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle 0 AP correctly', () => {
      // Target: 4+ armor, 5+ invuln
      // Weapon: 0 AP
      // Modified armor: 4 - 0 = 4+
      // Should use armor (4+)
      const result = calculateSaveThreshold(4, 0, 5);

      expect(result.threshold).toBe(4);
      expect(result.usingInvulnerable).toBe(false);
    });

    it('should handle positive AP (improvement) correctly', () => {
      // Target: 3+ armor, 5+ invuln
      // Weapon: +1 AP (improves save, unusual but possible)
      // Modified armor: 3 - 1 = 2+
      // Should use armor (2+)
      const result = calculateSaveThreshold(3, 1, 5);

      expect(result.threshold).toBe(2);
      expect(result.usingInvulnerable).toBe(false);
    });

    it('should handle very high AP correctly', () => {
      // Target: 2+ armor, 6+ invuln
      // Weapon: -6 AP
      // Modified armor: 2 - (-6) = 8+ (impossible)
      // Invuln: 6+
      // Should use invuln (6+)
      const result = calculateSaveThreshold(2, -6, 6);

      expect(result.threshold).toBe(6);
      expect(result.usingInvulnerable).toBe(true);
    });
  });
});
