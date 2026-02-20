export function shouldMarkWeaponsOnDone(params: {
  currentPlayerId?: string;
  initiatorPlayerId?: string;
}): boolean {
  const { currentPlayerId, initiatorPlayerId } = params;

  // No session initiator context (legacy/local flow): preserve existing behavior.
  if (!initiatorPlayerId) return true;

  return !!currentPlayerId && currentPlayerId === initiatorPlayerId;
}

export interface WeaponAvailabilityState {
  id: string;
  name: string;
  modelId: string;
  turnsFired?: string[];
  isPistol: boolean;
}

export function calculateRemainingRangedWeaponGroupsAfterFiring(params: {
  allWeapons: WeaponAvailabilityState[];
  currentlyAvailableWeaponNames: string[];
  selectedWeaponName: string;
  turnPlayerId: string;
}): number {
  const {
    allWeapons,
    currentlyAvailableWeaponNames,
    selectedWeaponName,
    turnPlayerId
  } = params;

  const currentlyFired = (weapon: WeaponAvailabilityState) =>
    weapon.turnsFired?.includes(turnPlayerId) ?? false;

  const modelsThatFiredPistols = new Set(
    allWeapons.filter(w => w.isPistol && currentlyFired(w)).map(w => w.modelId)
  );
  const modelsThatFiredNonPistols = new Set(
    allWeapons.filter(w => !w.isPistol && currentlyFired(w)).map(w => w.modelId)
  );

  const selectedWeapons = allWeapons.filter(w => w.name === selectedWeaponName);
  const selectedIsPistol = selectedWeapons[0]?.isPistol ?? false;

  const weaponsToMark = selectedWeapons.filter((weapon) => {
    if (currentlyFired(weapon)) return false;
    if (selectedIsPistol) return !modelsThatFiredNonPistols.has(weapon.modelId);
    return !modelsThatFiredPistols.has(weapon.modelId);
  });
  const weaponsToMarkIds = new Set(weaponsToMark.map(w => w.id));

  const projectedModelsThatFiredPistols = new Set(modelsThatFiredPistols);
  const projectedModelsThatFiredNonPistols = new Set(modelsThatFiredNonPistols);
  for (const weapon of weaponsToMark) {
    if (weapon.isPistol) {
      projectedModelsThatFiredPistols.add(weapon.modelId);
    } else {
      projectedModelsThatFiredNonPistols.add(weapon.modelId);
    }
  }

  const isGroupFiredAfterShot = (weaponName: string) => {
    const group = allWeapons.filter(w => w.name === weaponName);
    return group.every(w => currentlyFired(w) || weaponsToMarkIds.has(w.id));
  };

  const isGroupDisabledAfterShot = (weaponName: string) => {
    if (isGroupFiredAfterShot(weaponName)) return true;
    const group = allWeapons.filter(w => w.name === weaponName);
    return group.some((weapon) =>
      weapon.isPistol
        ? projectedModelsThatFiredNonPistols.has(weapon.modelId)
        : projectedModelsThatFiredPistols.has(weapon.modelId)
    );
  };

  return currentlyAvailableWeaponNames.filter(
    (weaponName) => !isGroupDisabledAfterShot(weaponName)
  ).length;
}

export function shouldExitCalculatorOnDigitalDiceClose(params: {
  remainingAvailableWeaponCount: number;
}): boolean {
  const { remainingAvailableWeaponCount } = params;
  return remainingAvailableWeaponCount === 0;
}

export function shouldExitCalculatorOnDone(params: {
  shouldMarkWeapons: boolean;
  remainingAvailableWeaponCountAfterDone: number;
}): boolean {
  const { shouldMarkWeapons, remainingAvailableWeaponCountAfterDone } = params;

  // Defender/non-initiator should always return to phase view after Done.
  if (!shouldMarkWeapons) return true;

  return shouldExitCalculatorOnDigitalDiceClose({
    remainingAvailableWeaponCount: remainingAvailableWeaponCountAfterDone
  });
}
