import { Rule, ArmyState } from './rules-engine/types';

/**
 * Returns choice rules that need user input in Digital Dice.
 * Mirrors current DigitalDiceMenu behavior.
 */
export function getRulesWithInput(
  activeRules: Rule[],
  armyStates: ArmyState[]
): Rule[] {
  void armyStates;
  return activeRules.filter(rule => {
    if (rule.kind !== 'choice' || !rule.choice) return false;
    return true;
  });
}
