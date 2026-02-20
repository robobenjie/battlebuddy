import { ChoiceRuleType, Rule } from './rules-engine/types';

function isTriggeredInCommandPhase(rule: ChoiceRuleType): boolean {
  if (!rule.trigger) return false;
  if (Array.isArray(rule.trigger.phase)) {
    return rule.trigger.phase.includes('command');
  }
  return rule.trigger.phase === 'command';
}

export function getPendingCommandChoiceRules(
  armyRules: Rule[],
  armyStates: Array<{ state: string; choiceValue?: string; activatedTurn?: number }>,
  currentTurn: number
): ChoiceRuleType[] {
  return armyRules.filter((rule): rule is ChoiceRuleType => {
    if (rule.kind !== 'choice') return false;
    if (rule.scope !== 'army') return false;
    if (!isTriggeredInCommandPhase(rule)) return false;

    const existingState = armyStates.find((s) => s.state === rule.choice.id);
    const hasSelection = !!existingState?.choiceValue;

    if (rule.trigger.limit === 'once-per-battle') {
      return currentTurn === 1 && !hasSelection;
    }

    if (!hasSelection) return true;
    return (existingState?.activatedTurn ?? 0) < currentTurn;
  });
}
