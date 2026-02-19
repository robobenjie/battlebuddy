import { describe, it, expect } from 'vitest';
import { prepareCombatRuleSetup } from '../lib/combat-rule-setup';

describe('prepareCombatRuleSetup', () => {
  it('builds attacker/defender rules and states with phase filtering and dedupe', () => {
    const sameRule = {
      id: 'dup-rule',
      name: 'Dup',
      description: '',
      faction: 'Test',
      scope: 'unit',
      trigger: { t: 'automatic', phase: 'shooting', turn: 'both', limit: 'none' },
      when: { t: 'true' },
      kind: 'passive',
      then: [{ t: 'do', fx: [] }]
    };

    const shootingOnly = {
      ...sameRule,
      id: 'shooting-rule'
    };

    const fightOnly = {
      ...sameRule,
      id: 'fight-rule',
      trigger: { t: 'automatic', phase: 'fight', turn: 'both', limit: 'none' }
    };

    const game = {
      armies: [
        {
          id: 'attacker-army',
          armyRules: [
            { ruleObject: JSON.stringify(sameRule) },
            { ruleObject: JSON.stringify(sameRule) }
          ],
          states: [{ id: 'a-state', state: 'alpha', activatedTurn: 1 }]
        },
        {
          id: 'defender-army',
          armyRules: [{ ruleObject: JSON.stringify(shootingOnly) }],
          states: [{ id: 'd-state', state: 'beta', activatedTurn: 1 }]
        }
      ]
    };

    const unit = { id: 'u1' };
    const selectedTarget = { id: 't1', armyId: 'defender-army' };

    const getUnitRulesFn = (entity: any) => {
      if (entity.id === 'u1') return [sameRule, fightOnly];
      if (entity.id === 't1') return [shootingOnly];
      return [];
    };

    const result = prepareCombatRuleSetup({
      game,
      currentArmyId: 'attacker-army',
      unit,
      selectedTarget,
      weaponType: 'ranged',
      getUnitRulesFn
    });

    expect(result.currentCombatPhase).toBe('shooting');
    expect(result.attackerRules.map(r => r.id)).toEqual(['dup-rule']);
    expect(result.defenderRules.map(r => r.id)).toEqual(['shooting-rule']);
    expect(result.attackerArmyStates[0].armyId).toBe('attacker-army');
    expect(result.defenderArmyStates[0].armyId).toBe('defender-army');
  });
});
