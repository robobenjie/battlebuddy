/**
 * Rule evaluation engine
 */

import { Rule, RuleCondition, RuleEffect, Modifier } from './types';
import { CombatContext } from './context';

/**
 * Check if a condition is met given the current context
 */
export function checkCondition(condition: RuleCondition, context: CombatContext): boolean {
  const { type, params, operator = 'OR' } = condition;

  switch (type) {
    case 'target-category': {
      if (!params.categories || params.categories.length === 0) return true;

      if (operator === 'OR') {
        // Target has ANY of the specified categories
        return params.categories.some(cat =>
          context.defender.categories.some(defCat =>
            defCat.toLowerCase() === cat.toLowerCase()
          )
        );
      } else {
        // Target has ALL of the specified categories
        return params.categories.every(cat =>
          context.defender.categories.some(defCat =>
            defCat.toLowerCase() === cat.toLowerCase()
          )
        );
      }
    }

    case 'weapon-type': {
      if (!params.weaponTypes || params.weaponTypes.length === 0) return true;

      const weaponType = context.weapon.range === 0 ? 'melee' : 'ranged';
      return params.weaponTypes.includes(weaponType);
    }

    case 'range': {
      if (!params.range) return true;

      const { operator: rangeOp, value } = params.range;

      if (rangeOp === 'within-half') {
        return context.withinHalfRange;
      } else if (rangeOp === 'min' && value !== undefined) {
        return context.weapon.range >= value;
      } else if (rangeOp === 'max' && value !== undefined) {
        return context.weapon.range <= value;
      }

      return false;
    }

    case 'unit-status': {
      if (!params.statuses || params.statuses.length === 0) return true;

      // Check context flags for unit status
      for (const status of params.statuses) {
        if (status === 'charged' && context.unitHasCharged) return true;
        if (status === 'moved' && !context.unitRemainedStationary) return true;
        if (status === 'stationary' && context.unitRemainedStationary) return true;
      }

      return false;
    }

    case 'army-state': {
      if (!params.armyStates || params.armyStates.length === 0) return true;

      // Check if the attacking army has any of the required states
      return params.armyStates.some(requiredState =>
        context.armyStates.some(armyState =>
          armyState.state === requiredState
        )
      );
    }

    case 'is-leading': {
      // Check if the attacker IS a leader (CHARACTER)
      return !!context.attacker.isLeader;
    }

    case 'being-led': {
      // Check if the current participant (based on combatRole) is being led (has a leader)
      // When evaluating attacker rules, check attacker.leaderId
      // When evaluating defender rules, check defender.leaderId
      if (context.combatRole === 'defender') {
        return !!(context.defender as any).leaderId;
      }
      return !!context.attacker.leaderId;
    }

    case 'combat-phase': {
      if (!params.phases || params.phases.length === 0) return true;

      return params.phases.includes(context.combatPhase);
    }

    case 'combat-role': {
      if (!params.role) return true;

      // Check if the combat role matches
      return params.role === context.combatRole;
    }

    case 'user-input': {
      if (!params.inputId) return true;

      // Get the user-provided value for this input
      const userValue = context.userInputs[params.inputId];

      // If no user input provided, condition fails
      if (userValue === undefined || userValue === null) {
        return false;
      }

      // Check if the user value matches the expected value
      return userValue === params.inputValue;
    }

    default:
      console.warn(`Unknown condition type: ${type}`);
      return false;
  }
}

/**
 * Check if an effect should be applied based on appliesTo field
 */
function shouldApplyEffect(effect: RuleEffect, context: CombatContext): boolean {
  const appliesTo = effect.appliesTo || 'all'; // Default to 'all'

  console.log(`   🎯 Checking appliesTo for effect type "${effect.type}": appliesTo="${appliesTo}", attacker.isLeader=${context.attacker.isLeader}`);

  if (appliesTo === 'all') {
    console.log(`      ✅ Applies to all - effect will be applied`);
    return true;
  }

  // For effects that modify attacker stats (hit, wound when attacking)
  if (appliesTo === 'leader') {
    const applies = context.attacker.isLeader === true;
    console.log(`      ${applies ? '✅' : '❌'} Leader-only effect, attacker isLeader=${context.attacker.isLeader}`);
    return applies;
  }

  if (appliesTo === 'bodyguard') {
    const applies = context.attacker.isLeader === false;
    console.log(`      ${applies ? '✅' : '❌'} Bodyguard-only effect, attacker isLeader=${context.attacker.isLeader}`);
    return applies;
  }

  return true;
}

/**
 * Apply an effect to the combat context
 */
export function applyEffect(effect: RuleEffect, context: CombatContext, ruleId: string): void {
  // Check if effect should be applied based on appliesTo field
  if (!shouldApplyEffect(effect, context)) {
    return;
  }

  // Check effect-level conditions (if any)
  if (effect.conditions && effect.conditions.length > 0) {
    const conditionsMet = effect.conditions.every(condition =>
      checkCondition(condition, context)
    );
    if (!conditionsMet) {
      return; // Skip this effect if conditions aren't met
    }
  }

  const { type, target, params } = effect;

  switch (type) {
    case 'modify-hit': {
      const modifier: Modifier = {
        source: ruleId,
        stat: 'hit',
        value: params.modifier || 0,
        operation: '+',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    case 'modify-wound': {
      const modifier: Modifier = {
        source: ruleId,
        stat: 'wound',
        value: params.modifier || 0,
        operation: '+',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    case 'modify-characteristic': {
      if (!params.stat) return;

      const modifier: Modifier = {
        source: ruleId,
        stat: params.stat,
        value: params.modifier || 0,
        operation: '+',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    case 'add-keyword': {
      if (!params.keyword) return;

      // Add keyword to weapon's keywords array
      // This will be handled by the combat calculator
      const keywordString = params.keywordValue
        ? `${params.keyword} ${params.keywordValue}`
        : params.keyword;

      // Store as a special modifier
      const modifier: Modifier = {
        source: ruleId,
        stat: `keyword:${params.keyword}`,
        value: params.keywordValue || 0,
        operation: 'set',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    case 'modify-save': {
      if (!params.stat) return;

      // Only for SV and T (INV and FNP are handled as keywords)
      const modifier: Modifier = {
        source: ruleId,
        stat: params.stat,
        value: params.modifier || 0,
        operation: '+',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    case 'grant-ability': {
      // Store ability grants as special modifiers
      const modifier: Modifier = {
        source: ruleId,
        stat: `ability:${params.ability}`,
        value: 1,
        operation: 'set',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    case 'reroll': {
      // Store reroll grants as special modifiers
      const modifier: Modifier = {
        source: ruleId,
        stat: `reroll:${params.rerollPhase}:${params.rerollType}`,
        value: 1,
        operation: 'set',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    case 'auto-success': {
      // Store auto-success as special modifier
      const modifier: Modifier = {
        source: ruleId,
        stat: `auto:${params.autoPhase}`,
        value: 1,
        operation: 'set',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    default:
      console.warn(`Unknown effect type: ${type}`);
  }
}

/**
 * Evaluate a rule and apply its effects if conditions are met
 */
export function evaluateRule(rule: Rule, context: CombatContext): boolean {
  // Check if all conditions are met
  const allConditionsMet = rule.conditions.every(condition =>
    checkCondition(condition, context)
  );

  if (!allConditionsMet) {
    return false;
  }

  // Apply all effects from the main effects array
  for (const effect of rule.effects) {
    applyEffect(effect, context, rule.id);
  }

  // NEW: Apply effects from selected userInput option (if any)
  if (rule.userInput && rule.userInput.options) {
    const selectedValue = context.userInputs[rule.userInput.id];
    if (selectedValue !== undefined && selectedValue !== null) {
      const selectedOption = rule.userInput.options.find(opt => opt.value === selectedValue);
      if (selectedOption && selectedOption.effects) {
        for (const effect of selectedOption.effects) {
          applyEffect(effect, context, rule.id);
        }
      }
    }
  }

  return true;
}

/**
 * Evaluate all rules and return the list of rules that were applied
 */
export function evaluateAllRules(rules: Rule[], context: CombatContext): Rule[] {
  const appliedRules: Rule[] = [];

  for (const rule of rules) {
    if (evaluateRule(rule, context)) {
      appliedRules.push(rule);
    }
  }

  return appliedRules;
}

/**
 * Get added keywords from modifiers
 */
export function getAddedKeywords(context: CombatContext): string[] {
  const keywords: string[] = [];
  const allMods = context.modifiers.getAllModifiers();

  for (const [stat, mods] of allMods.entries()) {
    if (stat.startsWith('keyword:')) {
      for (const mod of mods) {
        const keyword = stat.replace('keyword:', '');
        const keywordString = mod.value > 0 ? `${keyword} ${mod.value}` : keyword;
        keywords.push(keywordString);
      }
    }
  }

  return keywords;
}

/**
 * Check if a specific ability is granted
 */
export function hasAbility(context: CombatContext, ability: string): boolean {
  const mods = context.modifiers.getModifiers(`ability:${ability}`);
  return mods.length > 0 && mods.some(m => m.value > 0);
}

/**
 * Check if auto-success is granted for a phase
 */
export function hasAutoSuccess(context: CombatContext, phase: 'hit' | 'wound'): boolean {
  const mods = context.modifiers.getModifiers(`auto:${phase}`);
  return mods.length > 0 && mods.some(m => m.value > 0);
}
