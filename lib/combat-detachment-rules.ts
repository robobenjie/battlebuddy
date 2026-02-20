import type { Rule } from './rules-engine';

function normalize(value?: string): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function isMortarionsHammerDetachment(faction?: string, detachment?: string): boolean {
  const normalizedFaction = normalize(faction);
  const normalizedDetachment = normalize(detachment);
  return normalizedFaction.includes('death guard')
    && normalizedDetachment.includes('mortarion')
    && normalizedDetachment.includes('hammer');
}

export function getAttackerDetachmentCombatRules(params: {
  faction?: string;
  detachment?: string;
  currentCombatPhase: 'shooting' | 'fight';
}): Rule[] {
  const { faction, detachment, currentCombatPhase } = params;

  if (!isMortarionsHammerDetachment(faction, detachment)) {
    return [];
  }

  if (currentCombatPhase !== 'shooting') {
    return [];
  }

  // Drawn to Despair:
  // Visibility and deployment-zone checks are user-confirmed in calculator choice input.
  const drawnToDespairRule: Rule = {
    id: 'stratagem-drawn-to-despair',
    name: 'Drawn to Despair',
    description: 'Until end of phase, attacks against visible enemy units in opponent deployment zone can re-roll Hit rolls.',
    faction: 'Death Guard',
    scope: 'army',
    trigger: {
      t: 'automatic',
      phase: 'shooting',
      turn: 'own',
      limit: 'none'
    },
    when: {
      t: 'all',
      xs: [
        { t: 'combatRole', is: 'attacker' },
        { t: 'weaponType', any: ['ranged'] }
      ]
    },
    kind: 'choice',
    choice: {
      id: 'drawn-to-despair-active',
      prompt: 'Use Drawn to Despair for this attack? (target is visible, non-AIRCRAFT, and within opponent deployment zone)',
      lifetime: { t: 'roll' },
      options: [
        {
          v: 'no',
          label: 'No',
          then: [{ t: 'do', fx: [] }]
        },
        {
          v: 'yes',
          label: 'Yes',
          then: [
            {
              t: 'do',
              fx: [{ t: 'reroll', phase: 'hit', kind: 'failed' }]
            }
          ]
        }
      ]
    }
  };

  return [drawnToDespairRule];
}
