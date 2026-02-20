import { describe, expect, it } from 'vitest';
import {
  hasRemainingEligibleMeleeWeapons,
  isMeleeWeaponGroupDisabled,
  type MeleeWeaponLike
} from '../lib/melee-weapon-sequencing';

describe('melee weapon sequencing', () => {
  const turnPlayerId = '2-player-1';

  it('keeps alternate melee groups available when only one profile has fought (boyz + nob power klaw)', () => {
    const meleeWeapons: MeleeWeaponLike[] = [
      { id: 'w1', name: 'Choppa', range: 0, modelId: 'boy-1', turnsFired: [turnPlayerId] },
      { id: 'w2', name: 'Choppa', range: 0, modelId: 'boy-2', turnsFired: [turnPlayerId] },
      { id: 'w3', name: 'Power Klaw', range: 0, modelId: 'nob-1', turnsFired: [] }
    ];

    expect(isMeleeWeaponGroupDisabled('Choppa', meleeWeapons, turnPlayerId)).toBe(true);
    expect(isMeleeWeaponGroupDisabled('Power Klaw', meleeWeapons, turnPlayerId)).toBe(false);
    expect(hasRemainingEligibleMeleeWeapons(meleeWeapons, turnPlayerId)).toBe(true);
  });

  it('does not allow a second non-extra melee weapon from the same model', () => {
    const meleeWeapons: MeleeWeaponLike[] = [
      { id: 'w1', name: 'Chainsword', range: 0, modelId: 'sergeant-1', turnsFired: [turnPlayerId] },
      { id: 'w2', name: 'Power Fist', range: 0, modelId: 'sergeant-1', turnsFired: [] }
    ];

    expect(isMeleeWeaponGroupDisabled('Power Fist', meleeWeapons, turnPlayerId)).toBe(true);
    expect(hasRemainingEligibleMeleeWeapons(meleeWeapons, turnPlayerId)).toBe(false);
  });

  it('still allows extra attacks weapons after the model used its primary melee weapon', () => {
    const meleeWeapons: MeleeWeaponLike[] = [
      { id: 'w1', name: 'Claw', range: 0, modelId: 'monster-1', turnsFired: [turnPlayerId] },
      { id: 'w2', name: 'Tail', range: 0, modelId: 'monster-1', keywords: ['Extra Attacks'], turnsFired: [] }
    ];

    expect(isMeleeWeaponGroupDisabled('Tail', meleeWeapons, turnPlayerId)).toBe(false);
    expect(hasRemainingEligibleMeleeWeapons(meleeWeapons, turnPlayerId)).toBe(true);
  });
});
