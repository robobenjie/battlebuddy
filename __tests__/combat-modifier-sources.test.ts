import { describe, expect, it } from 'vitest';
import { ModifierStack } from '../lib/rules-engine/modifier-stack';
import { getCombatModifierSources } from '../lib/combat-modifier-sources';

describe('getCombatModifierSources', () => {
  it('includes only rules that actually contribute modifiers', () => {
    const attackerModifiers = new ModifierStack();
    const defenderModifiers = new ModifierStack();

    attackerModifiers.add({
      source: 'nurgles-gift-skullsquirm',
      stat: 'hit',
      value: -1,
      operation: '+',
      priority: 0
    });

    // Reminder rule exists conceptually but has no modifier in stack.
    // This test verifies it is not included in sources.
    const sources = getCombatModifierSources({
      attackerContext: { modifiers: attackerModifiers },
      defenderContext: { modifiers: defenderModifiers },
      keywords: []
    });

    expect(sources.hit).toEqual(['nurgles-gift-skullsquirm']);
    expect(sources.wound).toEqual([]);
  });
});
