export interface MeleeWeaponLike {
  id: string;
  name: string;
  range: number;
  modelId: string;
  keywords?: string[];
  turnsFired?: string[];
}

export function isExtraAttacksWeapon(weapon: Pick<MeleeWeaponLike, 'keywords'>): boolean {
  return (weapon.keywords || []).some((keyword) => keyword.toLowerCase().includes('extra attacks'));
}

export function isWeaponFiredThisTurn(
  weapon: Pick<MeleeWeaponLike, 'turnsFired'>,
  turnPlayerId: string
): boolean {
  return !!(weapon.turnsFired || []).includes(turnPlayerId);
}

export function isMeleeWeaponInstanceEligible(
  weapon: MeleeWeaponLike,
  allMeleeWeapons: MeleeWeaponLike[],
  turnPlayerId: string
): boolean {
  if (weapon.range !== 0) return false;
  if (isWeaponFiredThisTurn(weapon, turnPlayerId)) return false;

  if (isExtraAttacksWeapon(weapon)) {
    return true;
  }

  const modelHasUsedPrimaryWeapon = allMeleeWeapons.some((candidate) => {
    if (candidate.range !== 0) return false;
    if (candidate.modelId !== weapon.modelId) return false;
    if (isExtraAttacksWeapon(candidate)) return false;
    return isWeaponFiredThisTurn(candidate, turnPlayerId);
  });

  return !modelHasUsedPrimaryWeapon;
}

export function isMeleeWeaponGroupDisabled(
  weaponName: string,
  allMeleeWeapons: MeleeWeaponLike[],
  turnPlayerId: string
): boolean {
  const group = allMeleeWeapons.filter((weapon) => weapon.name === weaponName && weapon.range === 0);
  if (group.length === 0) return true;

  return !group.some((weapon) => isMeleeWeaponInstanceEligible(weapon, allMeleeWeapons, turnPlayerId));
}

export function hasRemainingEligibleMeleeWeapons(
  allMeleeWeapons: MeleeWeaponLike[],
  turnPlayerId: string
): boolean {
  return allMeleeWeapons.some((weapon) =>
    isMeleeWeaponInstanceEligible(weapon, allMeleeWeapons, turnPlayerId)
  );
}

export function getUnitMeleeWeaponsWithModelIds(unit: any): MeleeWeaponLike[] {
  return (unit?.models || []).flatMap((model: any) =>
    (model.weapons || [])
      .filter((weapon: any) => weapon.range === 0)
      .map((weapon: any) => ({
        ...weapon,
        modelId: model.id
      }))
  );
}
