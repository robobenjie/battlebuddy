import { CombatResult, TargetStats } from './combat-calculator-engine';

export interface RollDisplayForSession {
  hitModifier?: number;
  woundModifier?: number;
  addedKeywords?: string[];
  modifierSources?: {
    hit?: string[];
    wound?: string[];
    keywords?: Array<{ keyword: string; source: string }>;
    damageReroll?: string[];
    rerollHit?: string[];
    rerollWound?: string[];
  };
  activeRules?: Array<{ id: string; name: string }>;
  hitThresholdOverride?: number;
  woundThresholdOverride?: number;
}

export function buildCombatSessionResultsPayload(params: {
  combatResult: CombatResult;
  targetStats: TargetStats;
  effectiveTargetStats: TargetStats;
  selectedTargetId?: string;
  selectedWeaponId?: string;
  rollDisplay?: RollDisplayForSession;
}) {
  return {
    stage: 'results' as const,
    combatResult: params.combatResult,
    targetStats: params.targetStats,
    effectiveTargetStats: params.effectiveTargetStats,
    selectedTargetId: params.selectedTargetId,
    selectedWeaponId: params.selectedWeaponId,
    rollDisplay: params.rollDisplay
  };
}
