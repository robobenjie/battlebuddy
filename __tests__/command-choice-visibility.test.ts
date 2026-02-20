import { describe, expect, it } from 'vitest';
import { getPendingCommandChoiceRules, getPendingStartOfBattleChoiceRules } from '../lib/command-choice-utils';
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
  it('does not show start-of-battle army choices in command phase', () => {
    const rules: Rule[] = [makeChoiceRule()];
    const pending = getPendingCommandChoiceRules(rules, [], 1);
    expect(pending).toHaveLength(0);
  });

  it('keeps choice visible if stale state exists without choiceValue', () => {
    const rules: Rule[] = [makeChoiceRule()];
    const pending = getPendingCommandChoiceRules(
      rules,
      [{ state: 'death-guard-plague', activatedTurn: 1 }],
      1
    );
    expect(pending).toHaveLength(0);
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

  it('shows start-of-battle choices before selection', () => {
    const rules: Rule[] = [makeChoiceRule()];
    const pending = getPendingStartOfBattleChoiceRules(rules, []);
    expect(pending.map(r => r.id)).toContain('death-guard-plague');
  });

  it('hides start-of-battle choices once selected', () => {
    const rules: Rule[] = [makeChoiceRule()];
    const pending = getPendingStartOfBattleChoiceRules(
      rules,
      [{ state: 'death-guard-plague', choiceValue: 'rattlejoint-ague', activatedTurn: 1 }]
    );
    expect(pending).toHaveLength(0);
  });
});
