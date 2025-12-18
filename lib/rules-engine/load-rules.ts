/**
 * Helper utilities for loading rules into the database
 */

import { Rule } from './types';
import { db } from '../db';

/**
 * Note: Rule collections have been moved to test-rules.json for testing and examples.
 * Production rules are stored in the InstantDB database and loaded via queries.
 */

/**
 * Unit name to rule mapping for Orks (DEPRECATED - rules now in database)
 * This maps unit names to their rule IDs
 */
export const ORKS_UNIT_RULES: Record<string, string[]> = {
  'tankbustas': ['tank-hunters'],
  'warboss': ['might-is-right', 'da-biggest-and-da-best'],
  'zogrod': ['super-runts'],
  'weirdboy': ['da-jump'],
  // Add more units as needed
};

// DEPRECATED: Rules are now stored in InstantDB database
// Use queries to load rules for units and armies

// DEPRECATED: Use database queries for detachment rules

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

  // Helper to parse and normalize a ruleObject (handles both single object and array)
  const parseRuleObject = (ruleObject: string): Rule[] => {
    try {
      let parsed = JSON.parse(ruleObject);

      // If it's an array, return it as-is
      if (Array.isArray(parsed)) {
        return parsed;
      }

      // If it's a single object, wrap it in an array
      return [parsed];
    } catch (e) {
      console.error('Failed to parse rule object:', e);
      return [];
    }
  };

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
          const parsedRules = parseRuleObject(rule.ruleObject);

          // For rules with "isLeading" condition:
          // - If unit is a leader: keep the rule (will be evaluated at runtime)
          // - If unit is not a leader: skip the rule (doesn't apply)
          for (const parsedRule of parsedRules) {
            const hasIsLeadingCondition = JSON.stringify(parsedRule.when || {}).includes('isLeading');
            if (hasIsLeadingCondition && !unit.isLeader) {
              console.log('   ⏭️  Skipped unit rule with isLeading condition (unit is not a leader):', parsedRule.name);
              continue;
            }
            // For leaders, keep isLeading rules so they can be evaluated at runtime
            addRules(parsedRule);
          }
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
      // If the leader is in this unit's leaders array, they ARE leading by definition
      // Only include scope: "unit" rules - scope: "model" rules stay with the leader
      if (leader?.unitRules) {
        console.log('   Leader has', leader.unitRules.length, 'unit rules');
        for (const rule of leader.unitRules) {
          if (rule?.ruleObject) {
            try {
              // Parse and normalize to array
              const parsedRules = parseRuleObject(rule.ruleObject);

              // Process each rule in the array
              for (const parsedRule of parsedRules) {
                // Check if scope field exists
                if (!parsedRule.scope) {
                  console.error(`❌ MISSING SCOPE on leader unitRule: ${rule.name} (id: ${parsedRule.id})`);
                  console.error('   Rule must have a scope field ("unit" or "model")');
                  console.error('   Full rule object:', JSON.stringify(parsedRule, null, 2));
                  continue; // Skip rules with missing scope
                }

                // Only include rules with scope: "unit" (these apply to the led unit)
                if (parsedRule.scope === 'unit') {
                  // Note: The leader is leading (by the fact that they're in the leaders array)
                  // The isLeading condition will be evaluated at runtime
                  console.log('   ✅ Loaded leader unit rule (scope: unit):', parsedRule.name);
                  addRules(parsedRule);
                } else {
                  console.log('   ⏭️  Skipped leader rule (scope:', parsedRule.scope + '):', parsedRule.name);
                }
              }
            } catch (e) {
              console.error('Failed to parse leader unit rule:', rule.name, e);
            }
          }
        }
      } else {
        console.log('   ⚠️ Leader has no unitRules');
      }

      // Get leader's model rules (rules are often attached to the leader's model)
      // Only include scope: "unit" rules - scope: "model" rules stay with the leader
      if (leader?.models) {
        console.log('   Leader has', leader.models.length, 'models');
        for (const model of leader.models) {
          if (model?.modelRules) {
            console.log('   Leader model has', model.modelRules.length, 'model rules');
            for (const rule of model.modelRules) {
              if (rule?.ruleObject) {
                try {
                  // Parse and normalize to array
                  const parsedRules = parseRuleObject(rule.ruleObject);

                  // Process each rule in the array
                  for (const parsedRule of parsedRules) {
                    // Check if scope field exists
                    if (!parsedRule.scope) {
                      console.error(`❌ MISSING SCOPE on leader modelRule: ${rule.name} (id: ${parsedRule.id})`);
                      console.error('   Rule must have a scope field ("unit" or "model")');
                      console.error('   Full rule object:', JSON.stringify(parsedRule, null, 2));
                      continue; // Skip rules with missing scope
                    }

                    // Only include rules with scope: "unit" (these apply to the led unit)
                    if (parsedRule.scope === 'unit') {
                      // Note: The leader is leading (by the fact that they're in the leaders array)
                      // The isLeading condition will be evaluated at runtime
                      console.log('   ✅ Loaded leader model rule (scope: unit):', parsedRule.name);
                      addRules(parsedRule);
                    } else {
                      console.log('   ⏭️  Skipped leader model rule (scope:', parsedRule.scope + '):', parsedRule.name);
                    }
                  }
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

  // Get rules from bodyguard units this unit is leading (reverse direction)
  // When a CHARACTER unit (leader) attacks, it gets scope: "unit" rules from units it's leading
  if (includeLeaders && unit?.bodyguardUnits) {
    console.log('📋 Loading bodyguard unit rules for leader:', unit.name || unit.id);
    console.log('   Bodyguard units found:', unit.bodyguardUnits.length);
    for (const bodyguard of unit.bodyguardUnits) {
      console.log('   Processing bodyguard unit:', bodyguard.name || bodyguard.id);

      // Get bodyguard's unit rules
      // Only include scope: "unit" rules - scope: "model" rules stay with the bodyguard
      if (bodyguard?.unitRules) {
        console.log('   Bodyguard has', bodyguard.unitRules.length, 'unit rules');
        for (const rule of bodyguard.unitRules) {
          if (rule?.ruleObject) {
            try {
              // Parse and normalize to array
              const parsedRules = parseRuleObject(rule.ruleObject);

              // Process each rule in the array
              for (const parsedRule of parsedRules) {
                // Check if scope field exists
                if (!parsedRule.scope) {
                  console.error(`❌ MISSING SCOPE on bodyguard unitRule: ${rule.name} (id: ${parsedRule.id})`);
                  console.error('   Rule must have a scope field ("unit" or "model")');
                  console.error('   Full rule object:', JSON.stringify(parsedRule, null, 2));
                  continue; // Skip rules with missing scope
                }

                // Only include rules with scope: "unit" (these apply to the leader)
                if (parsedRule.scope === 'unit') {
                  console.log('   ✅ Loaded bodyguard unit rule (scope: unit):', parsedRule.name);
                  addRules(parsedRule);
                } else {
                  console.log('   ⏭️  Skipped bodyguard rule (scope:', parsedRule.scope + '):', parsedRule.name);
                }
              }
            } catch (e) {
              console.error('Failed to parse bodyguard unit rule:', rule.name, e);
            }
          }
        }
      } else {
        console.log('   ⚠️ Bodyguard has no unitRules');
      }

      // Get bodyguard's model rules
      // Only include scope: "unit" rules - scope: "model" rules stay with the bodyguard
      if (bodyguard?.models) {
        console.log('   Bodyguard has', bodyguard.models.length, 'models');
        for (const model of bodyguard.models) {
          if (model?.modelRules) {
            console.log('   Bodyguard model has', model.modelRules.length, 'model rules');
            for (const rule of model.modelRules) {
              if (rule?.ruleObject) {
                try {
                  // Parse and normalize to array
                  const parsedRules = parseRuleObject(rule.ruleObject);

                  // Process each rule in the array
                  for (const parsedRule of parsedRules) {
                    // Check if scope field exists
                    if (!parsedRule.scope) {
                      console.error(`❌ MISSING SCOPE on bodyguard modelRule: ${rule.name} (id: ${parsedRule.id})`);
                      console.error('   Rule must have a scope field ("unit" or "model")');
                      console.error('   Full rule object:', JSON.stringify(parsedRule, null, 2));
                      continue; // Skip rules with missing scope
                    }

                    // Only include rules with scope: "unit" (these apply to the leader)
                    if (parsedRule.scope === 'unit') {
                      console.log('   ✅ Loaded bodyguard model rule (scope: unit):', parsedRule.name);
                      addRules(parsedRule);
                    } else {
                      console.log('   ⏭️  Skipped bodyguard model rule (scope:', parsedRule.scope + '):', parsedRule.name);
                    }
                  }
                } catch (e) {
                  console.error('Failed to parse bodyguard model rule:', rule.name, e);
                }
              }
            }
          }
        }
      }
    }
  } else if (includeLeaders && unit?.isLeader) {
    console.log('📋 Leader unit has no bodyguard units:', unit.name || unit.id);
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
