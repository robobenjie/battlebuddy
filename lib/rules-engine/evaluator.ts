/**
 * Rule evaluation engine
 */

import { Rule, Modifier, WhenType, FxType, BlockType } from './types';
import { CombatContext } from './context';

/**
 * Evaluate a When (condition) AST node
 */
export function evaluateWhen(when: WhenType, context: CombatContext): boolean {
  switch (when.t) {
    // Boolean constants
    case 'true':
      return true;
    case 'false':
      return false;

    // Boolean operators
    case 'all':
      return when.xs.every((x: WhenType) => evaluateWhen(x, context));
    case 'any':
      return when.xs.some((x: WhenType) => evaluateWhen(x, context));
    case 'not':
      return !evaluateWhen(when.x, context);

    // Weapon type
    case 'weaponType': {
      const weaponType = context.weapon.range === 0 ? 'melee' : 'ranged';
      return when.any.includes(weaponType);
    }

    // Target category
    case 'targetCategory':
      return when.any.some((cat: string) =>
        context.defender.categories.some((defCat: string) =>
          defCat.toLowerCase() === cat.toLowerCase()
        )
      );

    // Unit status
    case 'unitStatus':
      return when.has.some((status: string) => {
        if (status === 'charged') return context.unitHasCharged;
        if (status === 'moved') return !context.unitRemainedStationary;
        if (status === 'stationary') return context.unitRemainedStationary;
        return false;
      });

    // Army state
    case 'armyState':
      return when.is.some((requiredState: string) =>
        context.armyStates.some(armyState =>
          armyState.state === requiredState
        )
      );

    // Is leading - checks if the unit whose rules are being evaluated is a leader OR has a leader attached
    // (leader CHARACTERs have isLeader=true, bodyguard units have leaderId set)
    // Use combatRole to determine which unit's leadership status to check
    case 'isLeading':
      if (context.combatRole === 'defender') {
        return !!(context.defender as any).isLeader || !!(context.defender as any).leaderId;
      }
      return !!context.attacker.isLeader || !!context.attacker.leaderId;

    // Typed ability checks
    case 'weaponHasAbility':
      // TODO: Implement weapon ability checking
      return false;

    case 'unitHasAbility':
      // TODO: Implement unit ability checking
      return false;

    default:
      console.warn(`Unknown When type:`, when);
      return false;
  }
}

/**
 * Apply an effect (Fx) to the combat context
 */
export function applyFx(fx: FxType, context: CombatContext, ruleId: string): void {
  switch (fx.t) {
    // Dice modifiers - offensive (only apply when this unit is attacking)
    case 'modHit': {
      // Only apply offensive modifiers in attacker context
      if (context.combatRole !== 'attacker') break;

      const modifier: Modifier = {
        source: ruleId,
        stat: 'hit',
        value: fx.add,
        operation: '+',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    case 'modWound': {
      // Only apply offensive modifiers in attacker context
      if (context.combatRole !== 'attacker') break;

      const modifier: Modifier = {
        source: ruleId,
        stat: 'wound',
        value: fx.add,
        operation: '+',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    // Dice modifiers - defensive (only apply when this unit is being attacked)
    case 'modHitAgainst': {
      // Only apply defensive modifiers in defender context
      if (context.combatRole !== 'defender') break;

      const modifier: Modifier = {
        source: ruleId,
        stat: 'hit',
        value: fx.add,
        operation: '+',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    case 'modWoundAgainst': {
      // Only apply defensive modifiers in defender context
      if (context.combatRole !== 'defender') break;

      const modifier: Modifier = {
        source: ruleId,
        stat: 'wound',
        value: fx.add,
        operation: '+',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    // Weapon stats
    case 'modWeaponStat': {
      const modifier: Modifier = {
        source: ruleId,
        stat: fx.stat,
        value: fx.add,
        operation: '+',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    // Defensive stats
    case 'modDefensiveStat': {
      const modifier: Modifier = {
        source: ruleId,
        stat: fx.stat,
        value: fx.add,
        operation: '+',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    // Movement stat
    case 'modMove': {
      const modifier: Modifier = {
        source: ruleId,
        stat: 'M',
        value: fx.add,
        operation: '+',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    // Add typed abilities
    case 'addWeaponAbility': {
      // Store weapon ability as special modifier
      const abilityKey = fx.ability.t === 'flag' ? fx.ability.id : fx.ability.t;
      // Store the whole ability object as JSON in the value for parameterized abilities
      const modifier: Modifier = {
        source: ruleId,
        stat: `weaponAbility:${abilityKey}`,
        value: 1,
        operation: 'set',
        priority: 0,
      };
      context.modifiers.add(modifier);
      // Store ability details for extraction
      (context as any)._abilityDetails = (context as any)._abilityDetails || {};
      (context as any)._abilityDetails[`weaponAbility:${abilityKey}`] = fx.ability;
      break;
    }

    case 'addUnitAbility': {
      // Store unit ability as special modifier
      const abilityKey = fx.ability.t === 'flag' ? fx.ability.id : fx.ability.t;
      const modifier: Modifier = {
        source: ruleId,
        stat: `unitAbility:${abilityKey}`,
        value: 1,
        operation: 'set',
        priority: 0,
      };
      context.modifiers.add(modifier);
      // Store ability details for extraction
      (context as any)._abilityDetails = (context as any)._abilityDetails || {};
      (context as any)._abilityDetails[`unitAbility:${abilityKey}`] = fx.ability;
      break;
    }

    // Invulnerable save
    case 'setInvuln': {
      const modifier: Modifier = {
        source: ruleId,
        stat: 'INV',
        value: fx.n,
        operation: 'set',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    // Feel No Pain save
    case 'setFNP': {
      const modifier: Modifier = {
        source: ruleId,
        stat: 'FNP',
        value: fx.n,
        operation: 'set',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    // Rerolls
    case 'reroll': {
      const modifier: Modifier = {
        source: ruleId,
        stat: `reroll:${fx.phase}:${fx.kind}`,
        value: 1,
        operation: 'set',
        priority: 0,
      };
      context.modifiers.add(modifier);
      break;
    }

    default:
      console.warn(`Unknown Fx type:`, fx);
  }
}

/**
 * Evaluate a Block (conditional or unconditional effects)
 */
export function evaluateBlock(block: BlockType, context: CombatContext, ruleId: string): void {
  switch (block.t) {
    case 'do':
      // Apply all effects in the block
      for (const fx of block.fx) {
        applyFx(fx, context, ruleId);
      }
      break;

    case 'if':
      // Check condition, then recursively evaluate nested blocks
      if (evaluateWhen(block.when, context)) {
        for (const nestedBlock of block.then) {
          evaluateBlock(nestedBlock, context, ruleId);
        }
      }
      break;

    default:
      console.warn(`Unknown Block type:`, block);
  }
}

/**
 * Evaluate a rule and apply its effects if conditions are met
 */
export function evaluateRule(rule: Rule, context: CombatContext): boolean {
  // Reminder rules have no effects
  if (rule.kind === 'reminder') {
    // Check if the rule's conditions are met (for filtering purposes)
    return evaluateWhen(rule.when, context);
  }

  // Check if the rule's top-level conditions are met
  if (!evaluateWhen(rule.when, context)) {
    return false;
  }

  // Handle passive rules
  if (rule.kind === 'passive') {
    for (const block of rule.then) {
      evaluateBlock(block, context, rule.id);
    }
    return true;
  }

  // Handle choice rules
  if (rule.kind === 'choice') {
    const selectedValue = context.userInputs[rule.choice.id];
    if (selectedValue !== undefined && selectedValue !== null) {
      const selectedOption = rule.choice.options.find(opt => opt.v === selectedValue);
      if (selectedOption) {
        for (const block of selectedOption.then) {
          evaluateBlock(block, context, rule.id);
        }
        return true;
      }
    }
    return false;
  }

  return false;
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
 * Get added keywords from modifiers (for backward compatibility with tests)
 *
 * In the new schema, we use typed weapon/unit abilities instead of string keywords,
 * but this function translates them back to keyword strings for testing.
 */
export function getAddedKeywords(context: CombatContext): string[] {
  const keywords: string[] = [];
  const allMods = context.modifiers.getAllModifiers();
  const abilityDetails = (context as any)._abilityDetails || {};

  for (const [stat, mods] of allMods.entries()) {
    // Old keyword format (for backward compatibility)
    if (stat.startsWith('keyword:')) {
      for (const mod of mods) {
        const keyword = stat.replace('keyword:', '');
        const keywordString = mod.value > 0 ? `${keyword} ${mod.value}` : keyword;
        keywords.push(keywordString);
      }
    }

    // New weapon ability format
    if (stat.startsWith('weaponAbility:')) {
      for (const mod of mods) {
        if (mod.value > 0) {
          const abilityDetails = (context as any)._abilityDetails?.[stat];
          if (abilityDetails) {
            keywords.push(formatAbility(abilityDetails));
          } else {
            const ability = stat.replace('weaponAbility:', '');
            const displayName = ability
              .replace(/([A-Z])/g, ' $1')
              .trim()
              .replace(/^./, (str: string) => str.toUpperCase());
            keywords.push(displayName);
          }
        }
      }
    }

    // New unit ability format
    if (stat.startsWith('unitAbility:')) {
      for (const mod of mods) {
        if (mod.value > 0) {
          const abilityDetails = (context as any)._abilityDetails?.[stat];
          if (abilityDetails) {
            keywords.push(formatAbility(abilityDetails));
          } else {
            const ability = stat.replace('unitAbility:', '');
            const displayName = ability
              .replace(/([A-Z])/g, ' $1')
              .trim()
              .replace(/^./, (str: string) => str.toUpperCase());
            keywords.push(displayName);
          }
        }
      }
    }
  }

  return keywords;
}

/**
 * Format a typed ability to a display string
 */
function formatAbility(ability: any): string {
  if (ability.t === 'flag') {
    // Flag abilities like "lethalHits" -> "Lethal Hits"
    return ability.id
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/^./, (str: string) => str.toUpperCase());
  }

  // Parameterized abilities
  switch (ability.t) {
    case 'scouts':
      return `Scouts ${ability.distance}`;
    case 'feelNoPain':
      return `Feel No Pain ${ability.threshold}`;
    case 'deadlyDemise':
      return `Deadly Demise ${ability.x}`;
    case 'rapidFire':
      return `Rapid Fire ${ability.x}`;
    case 'sustainedHits':
      return `Sustained Hits ${ability.x}`;
    case 'anti':
      return `Anti-${ability.keyword} ${ability.threshold}+`;
    default:
      // Default: convert camelCase to Title Case
      return ability.t
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .replace(/^./, (str: string) => str.toUpperCase());
  }
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
