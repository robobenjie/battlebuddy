import { describe, expect, it } from 'vitest';
import {
  shouldMarkWeaponsOnDone,
  shouldExitCalculatorOnDigitalDiceClose,
  shouldExitCalculatorOnDone,
  calculateRemainingRangedWeaponGroupsAfterFiring
} from '../lib/combat-session-utils';

describe('shouldMarkWeaponsOnDone', () => {
  it('returns true when there is no initiator (legacy/local flow)', () => {
    expect(
      shouldMarkWeaponsOnDone({ currentPlayerId: 'p1', initiatorPlayerId: undefined })
    ).toBe(true);
  });

  it('returns true for the initiator player', () => {
    expect(
      shouldMarkWeaponsOnDone({ currentPlayerId: 'p1', initiatorPlayerId: 'p1' })
    ).toBe(true);
  });

  it('returns false for non-initiator players', () => {
    expect(
      shouldMarkWeaponsOnDone({ currentPlayerId: 'p2', initiatorPlayerId: 'p1' })
    ).toBe(false);
  });
});

describe('shouldExitCalculatorOnDigitalDiceClose', () => {
  it('returns true when there are no available weapons left', () => {
    expect(
      shouldExitCalculatorOnDigitalDiceClose({ remainingAvailableWeaponCount: 0 })
    ).toBe(true);
  });

  it('returns false when there is at least one available weapon', () => {
    expect(
      shouldExitCalculatorOnDigitalDiceClose({ remainingAvailableWeaponCount: 1 })
    ).toBe(false);
  });
});

describe('shouldExitCalculatorOnDone', () => {
  it('returns true for non-initiator viewers', () => {
    expect(
      shouldExitCalculatorOnDone({
        shouldMarkWeapons: false,
        remainingAvailableWeaponCountAfterDone: 3
      })
    ).toBe(true);
  });

  it('returns true for initiator when no weapons remain after done', () => {
    expect(
      shouldExitCalculatorOnDone({
        shouldMarkWeapons: true,
        remainingAvailableWeaponCountAfterDone: 0
      })
    ).toBe(true);
  });

  it('returns false for initiator when weapons remain after done', () => {
    expect(
      shouldExitCalculatorOnDone({
        shouldMarkWeapons: true,
        remainingAvailableWeaponCountAfterDone: 1
      })
    ).toBe(false);
  });
});

describe('calculateRemainingRangedWeaponGroupsAfterFiring', () => {
  it('counts zero remaining when firing non-pistol disables the only pistol option on same model', () => {
    const remaining = calculateRemainingRangedWeaponGroupsAfterFiring({
      allWeapons: [
        { id: 'r1', name: 'Rokkit', modelId: 'm1', isPistol: false, turnsFired: [] },
        { id: 'p1', name: 'Slugga', modelId: 'm1', isPistol: true, turnsFired: [] }
      ],
      currentlyAvailableWeaponNames: ['Rokkit', 'Slugga'],
      selectedWeaponName: 'Rokkit',
      turnPlayerId: '1-p1'
    });

    expect(remaining).toBe(0);
  });

  it('disables grouped pistol weapon if any instance is blocked by non-pistol firing', () => {
    const remaining = calculateRemainingRangedWeaponGroupsAfterFiring({
      allWeapons: [
        { id: 'r1', name: 'Rokkit', modelId: 'm1', isPistol: false, turnsFired: [] },
        { id: 'p1', name: 'Slugga', modelId: 'm1', isPistol: true, turnsFired: [] },
        { id: 'p2', name: 'Slugga', modelId: 'm2', isPistol: true, turnsFired: [] }
      ],
      currentlyAvailableWeaponNames: ['Rokkit', 'Slugga'],
      selectedWeaponName: 'Rokkit',
      turnPlayerId: '1-p1'
    });

    expect(remaining).toBe(0);
  });
});
