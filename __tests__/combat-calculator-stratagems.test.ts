import { describe, expect, it } from 'vitest';
import { buildCombatContext, evaluateAllRules } from '../lib/rules-engine';
import { getCombatCalculatorStratagems } from '../lib/combat-calculator-stratagems';

describe('combat calculator stratagems', () => {
  it('returns Speed Freeks combat stratagems for ranged combat', () => {
    const stratagems = getCombatCalculatorStratagems({
      faction: 'Orks',
      detachment: 'Speed Freeks',
      weaponType: 'ranged',
      unitKeywords: ['Speed Freeks']
    });

    const names = stratagems.map((s) => s.name);
    expect(names).toContain('Dakkastorm');
    expect(names).toContain('Blitza Fire');
  });

  it('returns Drawn to Despair for Mortarion\'s Hammer ranged combat', () => {
    const stratagems = getCombatCalculatorStratagems({
      faction: 'Death Guard',
      detachment: "Mortarion's Hammer",
      weaponType: 'ranged',
      unitCategories: ['Vehicle']
    });

    const names = stratagems.map((s) => s.name);
    expect(names).toContain('Drawn to Despair');
  });

  it('applies Drawn to Despair hit reroll when selected', () => {
    const stratagems = getCombatCalculatorStratagems({
      faction: 'Death Guard',
      detachment: "Mortarion's Hammer",
      weaponType: 'ranged',
      unitCategories: ['Vehicle']
    });
    const drawn = stratagems.find((s) => s.id === 'drawn-to-despair');
    expect(drawn).toBeDefined();

    const context = buildCombatContext({
      attacker: { id: 'a1', name: 'My Unit', armyId: 'army-a', categories: ['Infantry'] },
      defender: { id: 'd1', name: 'Enemy Unit', armyId: 'army-d', categories: ['Infantry'], models: [{ T: 4, SV: 3 }] },
      weapon: { id: 'w1', name: 'Gun', range: 24, A: '2', WS: 4, S: 4, AP: 0, D: '1', keywords: [] },
      game: { id: 'g1', currentTurn: 2, currentPhase: 'shooting' },
      combatPhase: 'shooting',
      combatRole: 'attacker',
      rules: [drawn!.rule],
      armyStates: [],
      options: {
        modelsFiring: 1,
        withinHalfRange: false,
        unitRemainedStationary: true,
        unitHasCharged: false,
        blastBonusAttacks: 0,
        userInputs: {
          'drawn-to-despair-qualifies': 'yes'
        }
      }
    });

    evaluateAllRules([drawn!.rule], context);
    expect(context.modifiers.getModifiers('reroll:hit:failed').length).toBeGreaterThan(0);
  });

  it('does not return Speed Freeks stratagems for non-Speed-Freeks units', () => {
    const stratagems = getCombatCalculatorStratagems({
      faction: 'Orks',
      detachment: 'Speed Freeks',
      weaponType: 'ranged',
      unitKeywords: ['Infantry']
    });

    const names = stratagems.map((s) => s.name);
    expect(names).not.toContain('Dakkastorm');
    expect(names).not.toContain('Blitza Fire');
  });

  it('does not return Drawn to Despair for non-vehicle units', () => {
    const stratagems = getCombatCalculatorStratagems({
      faction: 'Death Guard',
      detachment: "Mortarion's Hammer",
      weaponType: 'ranged',
      unitCategories: ['Infantry']
    });

    const names = stratagems.map((s) => s.name);
    expect(names).not.toContain('Drawn to Despair');
  });
});
