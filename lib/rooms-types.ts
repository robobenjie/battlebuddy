import type { CombatResult, TargetStats } from './combat-calculator-engine';

export type DiceRollPhase = 'attacks' | 'saves' | 'fnp';
export type CombatPhaseAdvance = 'show-saves' | 'show-fnp';
export type CombatSessionScreen = 'combat-calculator' | 'digital-dice';

export interface CombatSessionPayload {
  stage?: 'menu' | 'results';
  combatResult?: CombatResult;
  targetStats?: TargetStats;
  effectiveTargetStats?: TargetStats;
  selectedTargetId?: string;
  selectedWeaponId?: string;
}

export interface CombatSessionRecord {
  id: string;
  screen: CombatSessionScreen;
  createdAt: number;
  updatedAt: number;
  initiatorPlayerId?: string;
  initiatorPlayerName?: string;
  attackerUnitId?: string;
  attackerArmyId?: string;
  defenderUnitId?: string;
  weaponId?: string;
  weaponName?: string;
  weaponType?: string;
  phase?: DiceRollPhase;
  version?: number;
  payload?: CombatSessionPayload;
}

export interface DiceRollEvent {
  playerId: string;
  playerName: string;
  timestamp: number;
  sessionId?: string;
  sessionVersion?: number;
  attackerUnitId: string;
  attackerUnitName: string;
  defenderUnitId: string;
  defenderUnitName: string;
  weaponId: string;
  weaponName: string;
  targetStats: {
    T: number;
    SV: number;
    INV?: number;
    FNP?: number;
    modelCount: number;
  };
  effectiveTargetStats?: TargetStats;
  combatResult: CombatResult;
  phase: DiceRollPhase;
  rollDisplay?: {
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
  };
}

export interface CombatPhaseEvent {
  playerId: string;
  playerName: string;
  timestamp: number;
  sessionId?: string;
  sessionVersion?: number;
  phase: CombatPhaseAdvance;
}
