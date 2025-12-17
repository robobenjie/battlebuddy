/**
 * Shared utilities for displaying combat statistics with modifiers
 */

/**
 * Calculate effective hit value (after applying modifiers)
 * Returns the final hit threshold (2-6) and formatted string
 */
export function getEffectiveHitValue(
  weaponWS: number | undefined,
  hitModifier: number = 0
): { value: number; display: string } {
  const baseWS = weaponWS || -99; // Use -99 to make missing WS obvious
  const effectiveValue = Math.max(2, Math.min(6, baseWS - hitModifier));

  return {
    value: effectiveValue,
    display: `${effectiveValue}+`
  };
}

/**
 * Calculate effective wound value (after applying modifiers)
 * Returns the final wound threshold (2-6) and formatted string
 */
export function getEffectiveWoundValue(
  weaponStrength: number,
  targetToughness: number,
  woundModifier: number = 0,
  hasLance: boolean = false,
  unitHasCharged: boolean = false
): { value: number; display: string } {
  // Calculate base wound threshold
  let base: number;
  if (weaponStrength >= targetToughness * 2) base = 2;
  else if (weaponStrength > targetToughness) base = 3;
  else if (weaponStrength === targetToughness) base = 4;
  else if (weaponStrength >= targetToughness / 2) base = 5;
  else base = 6;

  // Apply lance keyword if applicable
  if (hasLance && unitHasCharged) {
    base = Math.max(2, base - 1);
  }

  // Apply rule modifiers
  const effectiveValue = Math.max(2, Math.min(6, base - woundModifier));

  return {
    value: effectiveValue,
    display: `${effectiveValue}+`
  };
}

/**
 * Format modifier sources as a string (e.g., "Tank Hunters, Waaagh!")
 */
export function formatModifierSources(
  ruleIds: string[] = [],
  activeRules: Array<{ id: string; name: string }> = []
): string {
  return ruleIds
    .map(id => activeRules.find(r => r.id === id)?.name)
    .filter(name => name)
    .join(', ');
}

/**
 * Format modifier display for UI (e.g., "+1 Tank Hunters" or "-1 Super Runts")
 */
export function formatModifierDisplay(
  modifier: number,
  sources: string
): string | null {
  if (modifier === 0 || !sources) return null;
  const sign = modifier > 0 ? '+' : '';
  return `${sign}${modifier} ${sources}`;
}
