import { describe, it, expect } from 'vitest';
import { getRulesWithInput } from '../lib/digital-dice-choice-inputs';
import { Rule, ArmyState } from '../lib/rules-engine/types';

function makeArmyChoiceRule(id: string, name: string): Rule {
  return {
    id,
    name,
    description: '',
    faction: 'Test',
    scope: 'army',
    trigger: { t: 'automatic', phase: 'any', turn: 'both', limit: 'none' },
    when: { t: 'true' },
    kind: 'choice',
    choice: {
      id,
      prompt: 'Choose',
      lifetime: { t: 'game' },
      options: [
        { v: 'a', label: 'A', then: [{ t: 'do', fx: [] }] },
        { v: 'b', label: 'B', then: [{ t: 'do', fx: [] }] }
      ]
    }
  } as Rule;
}

describe('getRulesWithInput', () => {
  it('does not suppress a pending army choice due to matching state id from another army', () => {
    const pendingDefenderRule = makeArmyChoiceRule('death-guard-plague', 'Defender Choice');

    const otherArmyState: ArmyState = {
      id: 'state-1',
      armyId: 'attacker-army',
      state: 'death-guard-plague',
      choiceValue: 'rattlejoint-ague',
      activatedTurn: 1
    };

    const rules = getRulesWithInput([pendingDefenderRule], [otherArmyState]);
    expect(rules.map(r => r.id)).toContain('death-guard-plague');
  });
});
