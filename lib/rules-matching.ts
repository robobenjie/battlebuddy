/**
 * Helper functions for matching imported rules to rules-engine implementations
 */

import { Rule } from './rules-engine';
// DEPRECATED: Rule matching functions removed - rules now stored in InstantDB database

export interface ImportedRule {
  name: string;
  rawText: string;
  battlescribeId: string;
  scope?: string; // Inferred from where the rule appears
}

export interface ExtractedRules {
  armyRules: ImportedRule[];
  unitRules: Map<string, ImportedRule[]>; // Map of unit name to its rules
  modelRules: Map<string, ImportedRule[]>; // Map of model name to its rules
  weaponRules: Map<string, ImportedRule[]>; // Map of weapon name to its rules
}

interface NewRecruitRule {
  id: string;
  name: string;
  description: string;
  hidden?: boolean;
  page?: number;
}

interface NewRecruitProfile {
  id: string;
  name: string;
  hidden?: boolean;
  typeId: string;
  typeName: string;
  characteristics: Array<{ name: string; $text: string; typeId: string }>;
}

interface NewRecruitSelection {
  id: string;
  name: string;
  entryId: string;
  number?: number;
  type?: string;
  group?: string;
  rules?: NewRecruitRule[];
  profiles?: NewRecruitProfile[];
  selections?: NewRecruitSelection[];
  categories?: Array<{ id: string; name: string; entryId: string; primary?: boolean }>;
}

interface NewRecruitForce {
  rules?: NewRecruitRule[];
  selections: NewRecruitSelection[];
}

interface NewRecruitRoster {
  roster: {
    forces: NewRecruitForce[];
  };
}

/**
 * Standard 10th edition keywords that should NOT be stored as rules
 * These are already handled by the combat calculator's keyword parsing
 */
const STANDARD_KEYWORDS = new Set([
  // Core Abilities
  'deep strike',
  'deadly demise',
  'fights first',
  'firing deck',
  'infiltrators',
  'leader',
  'lone operative',
  'scouts',
  'stealth',

  // Weapon Abilities
  'assault',
  'blast',
  'conversion',
  'devastating wounds',
  'extra attacks',
  'hazardous',
  'heavy',
  'indirect fire',
  'ignores cover',
  'lance',
  'lethal hits',
  'linked fire',
  'pistol',
  'precision',
  'psychic',
  'torrent',
  'twin-linked',
  'twin linked',

  // Special keywords
  'invulnerable save',
  'feel no pain',
]);

/**
 * Check if a rule name is a standard keyword (with variants like "Anti-X" or "Rapid Fire X")
 */
function isStandardKeyword(ruleName: string): boolean {
  const normalized = ruleName.toLowerCase().trim();

  // Check exact matches
  if (STANDARD_KEYWORDS.has(normalized)) {
    return true;
  }

  // Check prefixes for parameterized keywords
  const parameterizedPrefixes = [
    'anti-',       // Anti-Monster 4+, Anti-Infantry 4+, etc.
    'rapid fire',  // Rapid Fire 1, Rapid Fire 2, etc.
    'sustained hits', // Sustained Hits 1, etc.
    'melta',       // Melta 2, Melta 4, etc.
    'deadly demise', // Deadly Demise 1, etc.
    'damaged:',    // Damaged: 1-7 Wounds Remaining, etc.
    'invulnerable save', // Invulnerable Save (5+), etc.
    'feel no pain', // Feel No Pain 4+, etc.
  ];

  for (const prefix of parameterizedPrefixes) {
    if (normalized.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract all rules from a NewRecruit/BattleScribe JSON
 */
export function extractRulesFromSourceData(sourceData: string): ExtractedRules {
  const roster: NewRecruitRoster = JSON.parse(sourceData);

  const result: ExtractedRules = {
    armyRules: [],
    unitRules: new Map(),
    modelRules: new Map(),
    weaponRules: new Map(),
  };

  const force = roster.roster.forces[0];

  // Extract army-level rules (faction and detachment rules)
  if (force.rules) {
    force.rules.forEach(rule => {
      if (!rule.hidden && !isStandardKeyword(rule.name)) {
        result.armyRules.push({
          name: rule.name,
          rawText: rule.description,
          battlescribeId: rule.id,
          scope: 'army'
        });
      }
    });
  }

  // Extract army-level abilities from force selections (e.g., Hyper Adaptations)
  // These are configuration selections at the force level with ability profiles
  if (force.selections) {
    force.selections.forEach(selection => {
      // Check for abilities in configuration selections
      if (selection.categories?.some(c => c.name === 'Configuration') && selection.profiles) {
        selection.profiles.forEach(profile => {
          if (profile.typeName === 'Abilities' && !profile.hidden && !isStandardKeyword(profile.name)) {
            const description = profile.characteristics.find(c => c.name === 'Description')?.$text || '';
            result.armyRules.push({
              name: profile.name,
              rawText: description,
              battlescribeId: profile.id,
              scope: 'army'
            });
          }
        });
      }
    });
  }

  // Extract unit, model, and weapon rules
  function processSelection(selection: NewRecruitSelection, parentName?: string) {
    // Detachment-level rules (from selections with group === "Detachment")
    if (selection.group === 'Detachment') {
      // Check rules array
      if (selection.rules) {
        selection.rules.forEach(rule => {
          if (!rule.hidden && !isStandardKeyword(rule.name)) {
            result.armyRules.push({
              name: rule.name,
              rawText: rule.description,
              battlescribeId: rule.id,
              scope: 'army'
            });
          }
        });
      }

      // Check ability profiles (e.g., Hyper Adaptions)
      if (selection.profiles) {
        selection.profiles.forEach(profile => {
          if (profile.typeName === 'Abilities' && !profile.hidden && !isStandardKeyword(profile.name)) {
            const description = profile.characteristics.find(c => c.name === 'Description')?.$text || '';
            result.armyRules.push({
              name: profile.name,
              rawText: description,
              battlescribeId: profile.id,
              scope: 'army'
            });
          }
        });
      }
    }

    // Unit-level rules (from rules array and ability profiles)
    if (selection.type === 'unit') {
      const unitName = selection.name;
      const unitRulesList = result.unitRules.get(unitName) || [];

      // Extract from rules array
      if (selection.rules) {
        selection.rules.forEach(rule => {
          if (!rule.hidden && !isStandardKeyword(rule.name)) {
            unitRulesList.push({
              name: rule.name,
              rawText: rule.description,
              battlescribeId: rule.id,
              scope: 'unit'
            });
          }
        });
      }

      // Extract from ability profiles
      if (selection.profiles) {
        selection.profiles.forEach(profile => {
          if (profile.typeName === 'Abilities' && !profile.hidden && !isStandardKeyword(profile.name)) {
            const description = profile.characteristics.find(c => c.name === 'Description')?.$text || '';
            unitRulesList.push({
              name: profile.name,
              rawText: description,
              battlescribeId: profile.id,
              scope: 'unit'
            });
          }
        });
      }

      if (unitRulesList.length > 0) {
        result.unitRules.set(unitName, unitRulesList);
      }
    }

    // Model-level rules (from profiles with Abilities type)
    if (selection.type === 'model' && selection.profiles) {
      const modelName = selection.name;
      const modelRulesList = result.modelRules.get(modelName) || [];

      selection.profiles.forEach(profile => {
        if (profile.typeName === 'Abilities' && !profile.hidden && !isStandardKeyword(profile.name)) {
          const description = profile.characteristics.find(c => c.name === 'Description')?.$text || '';
          modelRulesList.push({
            name: profile.name,
            rawText: description,
            battlescribeId: profile.id,
            scope: 'model'
          });
        }
      });

      result.modelRules.set(modelName, modelRulesList);
    }

    // Weapon-level rules (from weapon profiles - extract keywords)
    // NOTE: We skip standard keywords here since they're already handled by the combat calculator
    if (selection.profiles) {
      selection.profiles.forEach(profile => {
        if ((profile.typeName === 'Ranged Weapons' || profile.typeName === 'Melee Weapons') && !profile.hidden) {
          const weaponName = profile.name;
          const keywords = profile.characteristics.find(c => c.name === 'Keywords')?.$text || '';

          if (keywords && keywords !== '-') {
            // Split keywords and create a rule for each NON-STANDARD keyword
            const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);
            const weaponRulesList = result.weaponRules.get(weaponName) || [];

            keywordList.forEach(keyword => {
              // Skip standard keywords - they're already handled by combat calculator
              if (!isStandardKeyword(keyword)) {
                weaponRulesList.push({
                  name: keyword,
                  rawText: keyword, // Keywords don't have descriptions in the import
                  battlescribeId: `${profile.id}-${keyword}`, // Generate ID
                  scope: 'weapon'
                });
              }
            });

            if (weaponRulesList.length > 0) {
              result.weaponRules.set(weaponName, weaponRulesList);
            }
          }
        }
      });
    }

    // Recurse into nested selections
    if (selection.selections) {
      selection.selections.forEach(subSelection => {
        processSelection(subSelection, selection.name);
      });
    }
  }

  // Process all selections
  force.selections.forEach(selection => processSelection(selection));

  return result;
}

/**
 * Normalize a rule name for matching (lowercase, remove special chars)
 */
function normalizeRuleName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function canonicalRuleKey(name: string): string {
  const normalized = normalizeRuleName(name);
  // Handle common singular/plural variants (e.g. Tank Hunter vs Tank Hunters).
  return normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
}

function normalizeFactionName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function matchRuleToImplementation(
  importedRule: ImportedRule,
  faction: string,
  existingRules: Array<{ faction?: string; scope?: string; ruleObject?: string }> = []
): Rule | null {
  const availableRules: Rule[] = existingRules
    .flatMap((r) => {
      if (!r.ruleObject) return [];
      try {
        const parsed = JSON.parse(r.ruleObject);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    })
    .filter((r: any) => !!r?.id && !!r?.name);

  const normalizedImportName = normalizeRuleName(importedRule.name);
  const canonicalImportName = canonicalRuleKey(importedRule.name);
  const normalizedFaction = normalizeFactionName(faction);
  const importScope = importedRule.scope || '';

  // Try to find a matching rule
  for (const rule of availableRules) {
    const normalizedRuleName = normalizeRuleName(rule.name);
    const canonicalRuleName = canonicalRuleKey(rule.name);
    const ruleFaction = normalizeFactionName(rule.faction || '');
    const sameScope = !importScope || !rule.scope || rule.scope === importScope;
    const sameFaction =
      !normalizedFaction ||
      !ruleFaction ||
      normalizedFaction.includes(ruleFaction) ||
      ruleFaction.includes(normalizedFaction);

    if (!sameFaction || !sameScope) {
      continue;
    }

    if (normalizedImportName === normalizedRuleName) {
      return rule;
    }
    if (canonicalImportName === canonicalRuleName) {
      return rule;
    }
  }

  return null;
}

/**
 * Get all available unit rules (for matching)
 * DEPRECATED: Rules are now stored in InstantDB database
 */
export function getAllUnitRuleImplementations(unitName: string): Rule[] {
  return [];
}
