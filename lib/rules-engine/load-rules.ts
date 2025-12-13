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
  'weirdboy': ['da-jump'],
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

/**
 * Get all rules for a unit from the database
 * Includes: unit rules, attached leader rules, model rules, and weapon rules
 *
 * @param unit - Unit object with rules loaded (should include leaders, models, weapons relationships)
 * @param options - Optional filters
 * @returns Array of parsed Rule objects (deduplicated)
 */
export function getAllUnitRules(
  unit: any,
  options?: {
    includeLeaders?: boolean;      // Default: true
    includeModelRules?: boolean;   // Default: true
    includeWeaponRules?: boolean;  // Default: true
  }
): Rule[] {
  const allRules: Rule[] = [];
  const addedRuleIds = new Set<string>(); // Track which rules we've already added to avoid duplicates

  const {
    includeLeaders = true,
    includeModelRules = true,
    includeWeaponRules = true
  } = options || {};

  // Helper to add rules with deduplication
  const addRules = (rules: Rule | Rule[]) => {
    const ruleArray = Array.isArray(rules) ? rules : [rules];
    for (const rule of ruleArray) {
      if (!addedRuleIds.has(rule.id)) {
        addedRuleIds.add(rule.id);
        allRules.push(rule);
      }
    }
  };

  // Get unit rules
  if (unit?.unitRules) {
    for (const rule of unit.unitRules) {
      if (rule?.ruleObject) {
        try {
          const parsedRule = JSON.parse(rule.ruleObject);
          addRules(parsedRule);
        } catch (e) {
          console.error('Failed to parse unit rule:', rule.name, e);
        }
      }
    }
  }

  // Get attached leaders' unit rules (leaders transfer their abilities to bodyguard units)
  if (includeLeaders && unit?.leaders) {
    console.log('📋 Loading leader rules for unit:', unit.name || unit.id);
    console.log('   Leaders found:', unit.leaders.length);
    for (const leader of unit.leaders) {
      console.log('   Processing leader:', leader.name || leader.id);

      // Get leader's unit rules
      if (leader?.unitRules) {
        console.log('   Leader has', leader.unitRules.length, 'unit rules');
        for (const rule of leader.unitRules) {
          if (rule?.ruleObject) {
            try {
              const parsedRule = JSON.parse(rule.ruleObject);
              console.log('   ✅ Loaded leader unit rule:', rule.name);
              addRules(parsedRule);
            } catch (e) {
              console.error('Failed to parse leader unit rule:', rule.name, e);
            }
          }
        }
      } else {
        console.log('   ⚠️ Leader has no unitRules');
      }

      // Get leader's model rules (rules are often attached to the leader's model)
      if (leader?.models) {
        console.log('   Leader has', leader.models.length, 'models');
        for (const model of leader.models) {
          if (model?.modelRules) {
            console.log('   Leader model has', model.modelRules.length, 'model rules');
            for (const rule of model.modelRules) {
              if (rule?.ruleObject) {
                try {
                  const parsedRule = JSON.parse(rule.ruleObject);
                  console.log('   ✅ Loaded leader model rule:', rule.name);
                  addRules(parsedRule);
                } catch (e) {
                  console.error('Failed to parse leader model rule:', rule.name, e);
                }
              }
            }
          }
        }
      }
    }
  } else if (includeLeaders) {
    console.log('📋 No leaders found for unit:', unit.name || unit.id);
  }

  // Get model rules from all models in the unit
  if (includeModelRules && unit?.models) {
    for (const model of unit.models) {
      if (model?.modelRules) {
        for (const rule of model.modelRules) {
          if (rule?.ruleObject) {
            try {
              const parsedRule = JSON.parse(rule.ruleObject);
              addRules(parsedRule);
            } catch (e) {
              console.error('Failed to parse model rule:', rule.name, e);
            }
          }
        }
      }

      // Get weapon rules from this model's weapons
      if (includeWeaponRules && model?.weapons) {
        for (const weapon of model.weapons) {
          if (weapon?.weaponRules) {
            for (const rule of weapon.weaponRules) {
              if (rule?.ruleObject) {
                try {
                  const parsedRule = JSON.parse(rule.ruleObject);
                  addRules(parsedRule);
                } catch (e) {
                  console.error('Failed to parse weapon rule:', rule.name, e);
                }
              }
            }
          }
        }
      }
    }
  }

  return allRules;
}
