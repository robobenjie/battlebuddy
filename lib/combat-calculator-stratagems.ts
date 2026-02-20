import type { Rule } from './rules-engine';

export interface CombatCalculatorStratagem {
  id: string;
  name: string;
  cost: number;
  when: string;
  effect: string;
  rule: Rule;
}

function normalize(value?: string): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function isSpeedFreeks(faction?: string, detachment?: string): boolean {
  const f = normalize(faction);
  const d = normalize(detachment);
  return f.includes('ork') && (d.includes('speed freeks') || d.includes('kult of speed'));
}

function isMortarionsHammer(faction?: string, detachment?: string): boolean {
  const f = normalize(faction);
  const d = normalize(detachment);
  return f.includes('death guard') && d.includes('mortarion') && d.includes('hammer');
}

function normalizedList(values?: string[]): string[] {
  return (values || []).map(normalize);
}

function hasSpeedFreeksKeyword(unitKeywords?: string[]): boolean {
  const keywords = normalizedList(unitKeywords);
  return keywords.some((k) =>
    k.includes('speed freeks') || k.includes('speed freek')
  );
}

function isVehicleUnit(unitCategories?: string[]): boolean {
  const categories = normalizedList(unitCategories);
  return categories.some((c) => c === 'vehicle' || c.includes('vehicle'));
}

function dakkastormRule(): Rule {
  return {
    id: 'stratagem-dakkastorm',
    name: 'Dakkastorm',
    description: 'Ranged weapons gain Sustained Hits; improved if target is within 9".',
    faction: 'Orks',
    scope: 'army',
    trigger: { t: 'automatic', phase: 'shooting', turn: 'own', limit: 'none' },
    when: {
      t: 'all',
      xs: [
        { t: 'combatRole', is: 'attacker' },
        { t: 'weaponType', any: ['ranged'] }
      ]
    },
    kind: 'choice',
    choice: {
      id: 'dakkastorm-target-within-9',
      prompt: 'Dakkastorm: Is the target within 9"?',
      lifetime: { t: 'roll' },
      options: [
        {
          v: 'no',
          label: 'No',
          then: [{ t: 'do', fx: [{ t: 'addWeaponAbility', ability: { t: 'sustainedHits', x: 1 } }] }]
        },
        {
          v: 'yes',
          label: 'Yes',
          then: [{ t: 'do', fx: [{ t: 'addWeaponAbility', ability: { t: 'sustainedHits', x: 2 } }] }]
        }
      ]
    }
  };
}

function blitzaFireRule(): Rule {
  return {
    id: 'stratagem-blitza-fire',
    name: 'Blitza Fire',
    description: 'Ranged weapons gain Lethal Hits; if target is within 9", critical hits on 5+.',
    faction: 'Orks',
    scope: 'army',
    trigger: { t: 'automatic', phase: 'shooting', turn: 'own', limit: 'none' },
    when: {
      t: 'all',
      xs: [
        { t: 'combatRole', is: 'attacker' },
        { t: 'weaponType', any: ['ranged'] }
      ]
    },
    kind: 'choice',
    choice: {
      id: 'blitza-fire-target-within-9',
      prompt: 'Blitza Fire: Is the target within 9"?',
      lifetime: { t: 'roll' },
      options: [
        {
          v: 'no',
          label: 'No',
          then: [{ t: 'do', fx: [{ t: 'addWeaponAbility', ability: { t: 'flag', id: 'lethalHits' } }] }]
        },
        {
          v: 'yes',
          label: 'Yes',
          then: [{
            t: 'do',
            fx: [
              { t: 'addWeaponAbility', ability: { t: 'flag', id: 'lethalHits' } },
              { t: 'setCriticalHit', n: 5 }
            ]
          }]
        }
      ]
    }
  };
}

function drawnToDespairRule(): Rule {
  return {
    id: 'stratagem-drawn-to-despair',
    name: 'Drawn to Despair',
    description: 'You can re-roll the Hit roll against visible enemy units in opponent deployment zone (excluding AIRCRAFT).',
    faction: 'Death Guard',
    scope: 'army',
    trigger: { t: 'automatic', phase: 'shooting', turn: 'own', limit: 'none' },
    when: {
      t: 'all',
      xs: [
        { t: 'combatRole', is: 'attacker' },
        { t: 'weaponType', any: ['ranged'] }
      ]
    },
    kind: 'choice',
    choice: {
      id: 'drawn-to-despair-qualifies',
      prompt: 'Drawn to Despair: Is the target visible, non-AIRCRAFT, and in opponent deployment zone?',
      lifetime: { t: 'roll' },
      options: [
        { v: 'no', label: 'No', then: [{ t: 'do', fx: [] }] },
        { v: 'yes', label: 'Yes', then: [{ t: 'do', fx: [{ t: 'reroll', phase: 'hit', kind: 'failed' }] }] }
      ]
    }
  };
}

export function getCombatCalculatorStratagems(params: {
  faction?: string;
  detachment?: string;
  weaponType?: 'ranged' | 'melee';
  unitKeywords?: string[];
  unitCategories?: string[];
}): CombatCalculatorStratagem[] {
  const { faction, detachment, weaponType, unitKeywords, unitCategories } = params;
  if (weaponType === 'melee') return [];

  const out: CombatCalculatorStratagem[] = [];

  if (isSpeedFreeks(faction, detachment) && hasSpeedFreeksKeyword(unitKeywords)) {
    out.push({
      id: 'dakkastorm',
      name: 'Dakkastorm',
      cost: 1,
      when: 'Your Shooting phase',
      effect: 'Ranged weapons gain [SUSTAINED HITS 1], or [SUSTAINED HITS 2] if target is within 9".',
      rule: dakkastormRule()
    });
    out.push({
      id: 'blitza-fire',
      name: 'Blitza Fire',
      cost: 1,
      when: 'Your Shooting phase',
      effect: 'Ranged weapons gain [LETHAL HITS]; if target is within 9", critical hits on 5+.',
      rule: blitzaFireRule()
    });
  }

  if (isMortarionsHammer(faction, detachment) && isVehicleUnit(unitCategories)) {
    out.push({
      id: 'drawn-to-despair',
      name: 'Drawn to Despair',
      cost: 1,
      when: 'Your Shooting phase',
      effect: 'You can re-roll the Hit roll against visible enemy units (excluding AIRCRAFT) in opponent deployment zone.',
      rule: drawnToDespairRule()
    });
  }

  return out;
}
