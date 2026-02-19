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
    name: string;
    categories: string[];
    leaderId?: string;      // If unit is being led
    isLeader?: boolean;     // If this unit is itself a leader (CHARACTER)
    isAttachedLeader?: boolean; // True when this is a leader currently attached to a bodyguard
  };

  defender: {
    unitId: string;
    armyId: string;
    name: string;
    categories: string[];
    modelCount: number;
    T: number;
    SV: number;
    INV?: number;
    leaderId?: string;      // If unit is being led
    isLeader?: boolean;     // If this unit is itself a leader (CHARACTER)
    isAttachedLeader?: boolean; // True when this is a leader currently attached to a bodyguard
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

  // Combat role - whose rules are being evaluated
  combatRole: 'attacker' | 'defender';

  // Active rules
  activeRules: Rule[];

  // Army states (Waaagh!, etc.) - scoped to attacking army
  armyStates: ArmyState[];

  // User-provided input values for conditional rules
  userInputs: Record<string, any>;

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
  combatRole?: 'attacker' | 'defender'; // Defaults to 'attacker'
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
    combatRole = 'attacker', // Default to attacker
    options,
    rules,
    armyStates
  } = params;

  // Army states are already scoped to the attacker's army by the query
  // (extracted from game.armies[].states where army matches attacker.armyId)
  // No need to filter again since armyId field no longer exists (using links now)
  const attackerArmyStates = armyStates;

  // Helper to check if unit is a CHARACTER (leader)
  const isCharacter = (unit: any) => {
    return unit.categories?.some((cat: string) => cat.toLowerCase() === 'character');
  };

  // Helper to check if unit has a leader attached
  const getLeaderId = (unit: any) => {
    // Check if leaderId field exists (direct field)
    if (unit.leaderId) return unit.leaderId;

    // Check if leaders array exists and has items (relationship)
    if (unit.leaders && unit.leaders.length > 0) {
      return unit.leaders[0].id; // Return first leader's ID
    }

    return undefined;
  };

  // Helper to check if this unit is a leader currently attached to a bodyguard
  const getIsAttachedLeader = (unit: any) => {
    const unitIsLeader = unit.isLeader !== undefined ? unit.isLeader : isCharacter(unit);
    const hasBodyguardUnits = Array.isArray(unit.bodyguardUnits) && unit.bodyguardUnits.length > 0;
    return !!unitIsLeader && hasBodyguardUnits;
  };

  return {
    // Spread options (modelsFiring, withinHalfRange, etc.)
    ...options,

    // Participants
    attacker: {
      unitId: attacker.id,
      armyId: attacker.armyId,
      name: attacker.name || '',
      categories: attacker.categories || [],
      leaderId: getLeaderId(attacker),
      // Use passed-in isLeader if available, otherwise check if unit is a CHARACTER
      isLeader: (() => {
        const result = attacker.isLeader !== undefined ? attacker.isLeader : isCharacter(attacker);
        console.log('🔍 buildCombatContext: attacker.isLeader input:', attacker.isLeader, 'isCharacter:', isCharacter(attacker), 'final result:', result);
        return result;
      })(),
      isAttachedLeader: getIsAttachedLeader(attacker),
    },

    defender: {
      unitId: defender.id,
      armyId: defender.armyId,
      name: defender.name || '',
      categories: defender.categories || [],
      modelCount: defender.models?.length || 0,
      T: defender.models?.[0]?.T || 0,
      SV: defender.models?.[0]?.SV || 0,
      INV: defender.models?.[0]?.INV,
      leaderId: getLeaderId(defender),
      // Use passed-in isLeader if available, otherwise check if unit is a CHARACTER
      isLeader: defender.isLeader !== undefined ? defender.isLeader : isCharacter(defender),
      isAttachedLeader: getIsAttachedLeader(defender),
    },

    weapon,

    // Game state
    game: {
      id: game.id,
      currentTurn: game.currentTurn || 1,
      currentPhase: game.currentPhase || '',
    },

    combatPhase,

    combatRole,

    // Active rules
    activeRules: rules,

    // Army states (filtered to attacking army)
    armyStates: attackerArmyStates,

    // User inputs
    userInputs: options.userInputs || {},

    // Modifier stack
    modifiers: new ModifierStack(),
  };
}
