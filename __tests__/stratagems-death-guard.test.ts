import { describe, expect, it } from 'vitest';
import { getAvailableStratagems, getStratagemsForPhase, getStratagemsForTurn } from '../lib/stratagems';

describe('Death Guard Mortarion\'s Hammer stratagems', () => {
  it('includes all detachment stratagem names for Mortarion\'s Hammer', () => {
    const stratagems = getAvailableStratagems('Death Guard', "Mortarion's Hammer");
    const names = stratagems.map((s) => s.name);

    expect(names).toContain('Blighted Land');
    expect(names).toContain('Relentless Grind');
    expect(names).toContain('Drawn to Despair');
    expect(names).toContain('Font of Filth');
    expect(names).toContain('Eyestinger Storm');
    expect(names).toContain('Stinking Mire');
  });

  it('shows Relentless Grind in move and charge phases (but not command)', () => {
    const stratagems = getAvailableStratagems('Death Guard', "Mortarion's Hammer");

    const moveNames = getStratagemsForPhase(stratagems, 'move').map((s) => s.name);
    const chargeNames = getStratagemsForPhase(stratagems, 'charge').map((s) => s.name);
    const commandNames = getStratagemsForPhase(stratagems, 'command').map((s) => s.name);

    expect(moveNames).toContain('Relentless Grind');
    expect(chargeNames).toContain('Relentless Grind');
    expect(commandNames).not.toContain('Relentless Grind');
  });

  it('respects turn filtering for your-turn and opponent-turn stratagems', () => {
    const stratagems = getAvailableStratagems('Death Guard', "Mortarion's Hammer");

    const yourTurnNames = getStratagemsForTurn(stratagems, true).map((s) => s.name);
    const opponentTurnNames = getStratagemsForTurn(stratagems, false).map((s) => s.name);

    expect(yourTurnNames).toContain('Blighted Land');
    expect(yourTurnNames).toContain('Drawn to Despair');

    expect(opponentTurnNames).toContain('Eyestinger Storm');
    expect(opponentTurnNames).toContain('Stinking Mire');
    expect(opponentTurnNames).not.toContain('Blighted Land');
  });
});
