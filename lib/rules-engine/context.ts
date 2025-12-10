/**
 * Combat context for rule evaluation
 */

import { Rule, ArmyState } from './types';
import { ModifierStack } from './modifier-stack';
import { CombatOptions, WeaponStats, TargetStats } from '../combat-calculator-engine';

export interface CombatContext extends CombatOptions {
  // Participants
  attacker: {
    unitId: string;
    armyId: string;
    categories: string[];
    leaderId?: string;      // If unit is being led
  };

  defender: {
    unitId: string;
    armyId: string;
    categories: string[];
    modelCount: number;
    T: number;
    SV: number;
    INV?: number;
  };

  weapon: WeaponStats;

  // Game state
  game: {
    id: string;
    currentTurn: number;
    currentPhase: string;
  };

  // Combat phase
  combatPhase: 'shooting' | 'melee';

  // Active rules
  activeRules: Rule[];

  // Army states (Waaagh!, etc.) - scoped to attacking army
  armyStates: ArmyState[];

  // Modifier stack
  modifiers: ModifierStack;
}

/**
 * Build a combat context from the current game state
 */
export function buildCombatContext(params: {
  attacker: any;
  defender: any;
  weapon: WeaponStats;
  game: any;
  combatPhase: 'shooting' | 'melee';
  options: CombatOptions;
  rules: Rule[];
  armyStates: ArmyState[];
}): CombatContext {
  const {
    attacker,
    defender,
    weapon,
    game,
    combatPhase,
    options,
    rules,
    armyStates
  } = params;

  // Filter army states to only those for the attacking army
  const attackerArmyStates = armyStates.filter(
    state => state.armyId === attacker.armyId
  );

  return {
    // Spread options (modelsFiring, withinHalfRange, etc.)
    ...options,

    // Participants
    attacker: {
      unitId: attacker.id,
      armyId: attacker.armyId,
      categories: attacker.categories || [],
      leaderId: attacker.leaderId,
    },

    defender: {
      unitId: defender.id,
      armyId: defender.armyId,
      categories: defender.categories || [],
      modelCount: defender.models?.length || 0,
      T: defender.models?.[0]?.T || 0,
      SV: defender.models?.[0]?.SV || 0,
      INV: defender.models?.[0]?.INV,
    },

    weapon,

    // Game state
    game: {
      id: game.id,
      currentTurn: game.currentTurn || 1,
      currentPhase: game.currentPhase || '',
    },

    combatPhase,

    // Active rules
    activeRules: rules,

    // Army states (filtered to attacking army)
    armyStates: attackerArmyStates,

    // Modifier stack
    modifiers: new ModifierStack(),
  };
}
