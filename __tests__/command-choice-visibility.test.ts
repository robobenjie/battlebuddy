import { describe, expect, it } from 'vitest';
import { getPendingCommandChoiceRules } from '../lib/command-choice-utils';
import { ChoiceRuleType, Rule } from '../lib/rules-engine/types';

const makeChoiceRule = (overrides: Partial<ChoiceRuleType> = {}): ChoiceRuleType => ({
  id: 'death-guard-plague',
  name: 'Afflicted Plague',
  description: 'Choose plague',
  faction: 'Death Guard',
  scope: 'army',
  trigger: {
    t: 'manual',
    phase: 'command',
    turn: 'own',
    limit: 'once-per-battle'
  },
  when: { t: 'true' },
  kind: 'choice',
  choice: {
    id: 'death-guard-plague',
    prompt: 'Select your plague',
    lifetime: { t: 'game' },
    options: [
      { v: 'a', label: 'A', then: [{ t: 'do', fx: [] }] },
      { v: 'b', label: 'B', then: [{ t: 'do', fx: [] }] }
    ]
  },
  ...overrides
});

describe('Command choice visibility', () => {
  it('shows once-per-battle command choice on turn 1 when not selected', () => {
    const rules: Rule[] = [makeChoiceRule()];
    const pending = getPendingCommandChoiceRules(rules, [], 1);
    expect(pending.map(r => r.id)).toContain('death-guard-plague');
  });

  it('keeps choice visible if stale state exists without choiceValue', () => {
    const rules: Rule[] = [makeChoiceRule()];
    const pending = getPendingCommandChoiceRules(
      rules,
      [{ state: 'death-guard-plague', activatedTurn: 1 }],
      1
    );
    expect(pending.map(r => r.id)).toContain('death-guard-plague');
  });

  it('hides choice once choiceValue has been selected', () => {
    const rules: Rule[] = [makeChoiceRule()];
    const pending = getPendingCommandChoiceRules(
      rules,
      [{ state: 'death-guard-plague', choiceValue: 'rattlejoint-ague', activatedTurn: 1 }],
      1
    );
    expect(pending).toHaveLength(0);
  });
});
