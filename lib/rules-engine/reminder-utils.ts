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
  turnContext: TurnContext
): Rule[] {
  // Get all rules for this unit (including leaders, models, weapons)
  const allRules = getAllUnitRules(unit);

  // Filter for reminder-type rules that match phase and turn
  return allRules.filter((rule: Rule) => {
    // Check if this is a reminder-type rule
    if (!rule.activation) return false;

    // Match phase
    if (rule.activation.phase !== currentPhase) return false;

    // Match turn context
    const ruleTurn = rule.activation.turn || 'own';
    return turnContext === 'both' || ruleTurn === 'both' || ruleTurn === turnContext;
  });
}

/**
 * Check if a unit has any reminders for the given phase and turn
 */
export function hasReminders(
  unit: any,
  currentPhase: PhaseType,
  turnContext: TurnContext
): boolean {
  return getUnitReminders(unit, currentPhase, turnContext).length > 0;
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
