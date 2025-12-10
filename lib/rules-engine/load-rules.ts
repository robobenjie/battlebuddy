/**
 * Helper utilities for loading rules into the database
 */

import { Rule } from './types';
import { db } from '../db';

// Import rule JSON files
import orkUnitAbilities from '../../data/rules/orks/unit-abilities.json';
import orkArmyRules from '../../data/rules/orks/army-rules.json';
import orkDetachmentRules from '../../data/rules/orks/detachment-rules.json';

export const ORKS_RULES = {
  unitAbilities: orkUnitAbilities as Rule[],
  armyRules: orkArmyRules as Rule[],
  detachmentRules: orkDetachmentRules as Rule[]
};

/**
 * Get all Ork rules
 */
export function getAllOrkRules(): Rule[] {
  return [
    ...ORKS_RULES.unitAbilities,
    ...ORKS_RULES.armyRules,
    ...ORKS_RULES.detachmentRules
  ];
}

/**
 * Get rule by ID
 */
export function getRuleById(ruleId: string): Rule | undefined {
  return getAllOrkRules().find(r => r.id === ruleId);
}

/**
 * Get rules by IDs
 */
export function getRulesByIds(ruleIds: string[]): Rule[] {
  const allRules = getAllOrkRules();
  return ruleIds.map(id => allRules.find(r => r.id === id)).filter(r => r !== undefined) as Rule[];
}

/**
 * Unit name to rule mapping for Orks
 * This maps unit names to their rule IDs
 */
export const ORKS_UNIT_RULES: Record<string, string[]> = {
  'tankbustas': ['tank-hunters'],
  'warboss': ['might-is-right', 'da-biggest-and-da-best'],
  'zogrod': ['super-runts'],
  // Add more units as needed
};

/**
 * Get rules for a unit by name
 */
export function getRulesForUnit(unitName: string): Rule[] {
  const normalizedName = unitName.toLowerCase().trim();
  const ruleIds = ORKS_UNIT_RULES[normalizedName] || [];
  return getRulesByIds(ruleIds);
}

/**
 * Get army-wide rules for Orks
 */
export function getOrkArmyRules(): Rule[] {
  return ORKS_RULES.armyRules;
}

/**
 * Get detachment rules for Orks
 */
export function getOrkDetachmentRules(): Rule[] {
  return ORKS_RULES.detachmentRules;
}
