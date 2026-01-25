import type { CombatResult } from './combat-calculator-engine';

export type DiceRollPhase = 'attacks' | 'saves' | 'fnp';
export type CombatPhaseAdvance = 'show-saves' | 'show-fnp';

export interface DiceRollEvent {
  playerId: string;
  playerName: string;
  timestamp: number;
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
  combatResult: CombatResult;
  phase: DiceRollPhase;
}

export interface CombatPhaseEvent {
  playerId: string;
  playerName: string;
  timestamp: number;
  phase: CombatPhaseAdvance;
}
