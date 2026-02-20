import { ChoiceRuleType, Rule } from './rules-engine/types';

function isTriggeredInCommandPhase(rule: ChoiceRuleType): boolean {
  if (!rule.trigger) return false;
  if (Array.isArray(rule.trigger.phase)) {
    return rule.trigger.phase.includes('command');
  }
  return rule.trigger.phase === 'command';
}

function hasSelection(
  rule: ChoiceRuleType,
  armyStates: Array<{ state: string; choiceValue?: string; activatedTurn?: number }>
): boolean {
  const existingState = armyStates.find((s) => s.state === rule.choice.id);
  return !!existingState?.choiceValue;
}

export function isStartOfBattleChoiceRule(rule: ChoiceRuleType): boolean {
  if (rule.scope !== 'army') return false;
  if (!isTriggeredInCommandPhase(rule)) return false;
  if (rule.trigger.limit !== 'once-per-battle') return false;
  return rule.choice.lifetime.t === 'game';
}

export function getPendingStartOfBattleChoiceRules(
  armyRules: Rule[],
  armyStates: Array<{ state: string; choiceValue?: string; activatedTurn?: number }>
): ChoiceRuleType[] {
  return armyRules.filter((rule): rule is ChoiceRuleType => {
    if (rule.kind !== 'choice') return false;
    if (!isStartOfBattleChoiceRule(rule)) return false;
    return !hasSelection(rule, armyStates);
  });
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
    if (isStartOfBattleChoiceRule(rule)) return false;

    const existingState = armyStates.find((s) => s.state === rule.choice.id);
    const selected = hasSelection(rule, armyStates);

    if (rule.trigger.limit === 'once-per-battle') {
      return currentTurn === 1 && !selected;
    }

    if (!selected) return true;
    return (existingState?.activatedTurn ?? 0) < currentTurn;
  });
}
