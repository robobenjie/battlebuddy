import { Rule } from './rules-engine';

export interface RollDisplayModifierSources {
  hit?: string[];
  wound?: string[];
  keywords?: Array<{ keyword: string; source: string }>;
  damageReroll?: string[];
  rerollHit?: string[];
  rerollWound?: string[];
}

export interface RollDisplayPayload {
  hitModifier: number;
  woundModifier: number;
  addedKeywords: string[];
  modifierSources: RollDisplayModifierSources;
  activeRules: Array<{ id: string; name: string }>;
  hitThresholdOverride: number;
  woundThresholdOverride: number;
}

/**
 * Builds the roll display payload for room sync and dice result rendering.
 * NOTE: this currently mirrors the existing behavior in CombatCalculatorPage.
 */
export function buildRollDisplayPayload(params: {
  hitModifier: number;
  woundModifier: number;
  addedKeywords: string[];
  computedModifierSources: RollDisplayModifierSources;
  appliedRules: Rule[];
  hitThresholdOverride: number;
  woundThresholdOverride: number;
}): RollDisplayPayload {
  return {
    hitModifier: params.hitModifier,
    woundModifier: params.woundModifier,
    addedKeywords: params.addedKeywords,
    modifierSources: params.computedModifierSources,
    activeRules: params.appliedRules.map(rule => ({ id: rule.id, name: rule.name })),
    hitThresholdOverride: params.hitThresholdOverride,
    woundThresholdOverride: params.woundThresholdOverride
  };
}
