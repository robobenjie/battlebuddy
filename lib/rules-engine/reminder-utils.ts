/**
 * Utility functions for filtering and displaying ability reminders
 */

import { Rule } from './types';
import { getAllUnitRules } from './load-rules';

export type TurnContext = 'own' | 'opponent' | 'both';
export type PhaseType = 'command' | 'movement' | 'shooting' | 'charge' | 'fight' | 'before-game-start';

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
    if (rule.activation) {
      // Match phase
      if (rule.activation.phase !== currentPhase && rule.activation.phase !== 'any') {
        return false;
      }

      // Match turn context
      // null or undefined means 'both' (applies on any turn)
      const ruleTurn = rule.activation.turn ?? 'both';
      if (!(turnContext === 'both' || ruleTurn === 'both' || ruleTurn === turnContext)) {
        return false;
      }
    }
    // Rules without activation field are always shown (no phase/turn filtering)

    // Filter out rules that require army states that aren't active
    if (rule.conditions) {
      const armyStateCondition = rule.conditions.find(c => c.type === 'army-state');
      if (armyStateCondition) {
        const requiredStates = armyStateCondition.params?.armyStates || [];
        const hasRequiredState = requiredStates.some((requiredState: string) =>
          armyStates?.some((state: any) => state.state === requiredState)
        );
        if (!hasRequiredState) {
          return false;
        }
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
        if (!rule.reactive) return false;

        // If rule has activation.phase, it must match current phase
        if (rule.activation?.phase && rule.activation.phase !== 'any' && rule.activation.phase !== currentPhase) {
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
