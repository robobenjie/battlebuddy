/**
 * Utility functions for filtering and displaying ability reminders
 */

import { Rule, WhenType } from './types';
import { getAllUnitRules } from './load-rules';

export type TurnContext = 'own' | 'opponent' | 'both';
export type PhaseType = 'command' | 'movement' | 'shooting' | 'charge' | 'fight' | 'before-game-start';

/**
 * Check if a when clause has an army state requirement
 */
function hasArmyStateRequirement(when: WhenType): boolean {
  if (!when) return false;

  switch (when.t) {
    case 'armyState':
      return true;
    case 'all':
    case 'any':
      return when.xs.some((x: WhenType) => hasArmyStateRequirement(x));
    case 'not':
      return hasArmyStateRequirement(when.x);
    default:
      return false;
  }
}

/**
 * Check if a when clause's army state requirement is satisfied
 */
function checkArmyStateRequirement(when: WhenType, armyStates: any[]): boolean {
  if (!when) return true;

  switch (when.t) {
    case 'armyState':
      // Check if any of the required states are active
      return when.is.some((requiredState: string) =>
        armyStates.some(armyState => armyState.state === requiredState)
      );
    case 'all':
      // All conditions must be met
      return when.xs.every((x: WhenType) =>
        !hasArmyStateRequirement(x) || checkArmyStateRequirement(x, armyStates)
      );
    case 'any':
      // At least one condition must be met
      return when.xs.some((x: WhenType) =>
        !hasArmyStateRequirement(x) || checkArmyStateRequirement(x, armyStates)
      );
    case 'not':
      // Negation of the condition
      return !hasArmyStateRequirement(when.x) || !checkArmyStateRequirement(when.x, armyStates);
    default:
      // Non-army-state conditions are assumed to be true for this check
      return true;
  }
}

/**
 * Get reminder rules for a unit that match the current phase and turn
 */
export function getUnitReminders(
  unit: any,
  currentPhase: PhaseType,
  turnContext: TurnContext,
  armyStates?: any[]
): Rule[] {
  // Get all rules for this unit (including leaders, models, weapons)
  const allRules = getAllUnitRules(unit);

  // Filter for reminder-type rules that match phase and turn
  const filteredRules = allRules.filter((rule: Rule) => {
    // If rule has explicit activation, check phase and turn
    if (rule.trigger) {
      // Match phase
      if (rule.trigger.phase !== currentPhase && rule.trigger.phase !== 'any') {
        return false;
      }

      // Match turn context
      // null or undefined means 'both' (applies on any turn)
      const ruleTurn = rule.trigger.turn ?? 'both';
      if (!(turnContext === 'both' || ruleTurn === 'both' || ruleTurn === turnContext)) {
        return false;
      }
    }
    // Rules without activation field are always shown (no phase/turn filtering)

    // Filter out rules that require army states that aren't active
    if (rule.when && hasArmyStateRequirement(rule.when)) {
      // If no army states provided, rule cannot be active
      if (!armyStates || armyStates.length === 0) {
        return false;
      }

      // Check if the required army state is active
      if (!checkArmyStateRequirement(rule.when, armyStates)) {
        return false;
      }
    }

    return true;
  });

  // Deduplicate rules by ID (in case a rule appears multiple times from different sources)
  const seen = new Set<string>();
  return filteredRules.filter((rule: Rule) => {
    if (seen.has(rule.id)) {
      return false;
    }
    seen.add(rule.id);
    return true;
  });
}

/**
 * Check if a unit has any reminders for the given phase and turn
 */
export function hasReminders(
  unit: any,
  currentPhase: PhaseType,
  turnContext: TurnContext,
  armyStates?: any[]
): boolean {
  return getUnitReminders(unit, currentPhase, turnContext, armyStates).length > 0;
}

/**
 * Get all units from armies that have reminders for the given phase and turn
 */
export function getUnitsWithReminders(
  armies: any[],
  currentPhase: PhaseType,
  turnContext: TurnContext
): any[] {
  const unitsWithReminders: any[] = [];

  for (const army of armies || []) {
    for (const unit of army.units || []) {
      if (hasReminders(unit, currentPhase, turnContext)) {
        unitsWithReminders.push({ ...unit, armyName: army.name, armyId: army.id });
      }
    }
  }

  return unitsWithReminders;
}

/**
 * Get all units from armies that have reactive abilities for the given phase
 * Reactive abilities are marked with reactive: true in the rule definition
 */
export function getReactiveUnits(
  armies: any[],
  currentPhase: PhaseType
): any[] {
  const reactiveUnits: any[] = [];

  for (const army of armies || []) {
    for (const unit of army.units || []) {
      // Get all rules for this unit
      const allRules = getAllUnitRules(unit);

      // Check if any rule is reactive and matches the current phase
      const hasReactiveAbility = allRules.some((rule: Rule) => {
        // Must be marked as reactive
        if (rule.trigger?.t !== 'reactive') return false;

        // If rule has trigger.phase, it must match current phase
        if (rule.trigger?.phase && rule.trigger.phase !== 'any' && rule.trigger.phase !== currentPhase) {
          return false;
        }

        return true;
      });

      if (hasReactiveAbility) {
        reactiveUnits.push({ ...unit, armyName: army.name, armyId: army.id });
      }
    }
  }

  return reactiveUnits;
}
