import { describe, expect, it } from 'vitest';
import {
  getAvailableStratagems,
  getStratagemsForDrawer,
} from '../lib/stratagems';

describe('stratagem drawer ordering', () => {
  it('sorts applicable stratagems first, with detachment stratagems before generic ones', () => {
    const stratagems = getAvailableStratagems('Death Guard', "Mortarion's Hammer");

    const ordered = getStratagemsForDrawer(stratagems, true);

    const availableNow = ordered.filter((x) => x.isAvailableNow).map((x) => x.stratagem.name);
    const unavailableNow = ordered.filter((x) => !x.isAvailableNow).map((x) => x.stratagem.name);

    expect(availableNow[0]).toBe('Blighted Land');
    expect(availableNow).toContain('Command Re-roll');
    expect(unavailableNow[0]).toBe('Eyestinger Storm');
  });

  it('marks opponent-turn and either-turn stratagems as available on opponent turn', () => {
    const stratagems = getAvailableStratagems('Death Guard', "Mortarion's Hammer");

    const ordered = getStratagemsForDrawer(stratagems, false);

    const availableNow = ordered.filter((x) => x.isAvailableNow).map((x) => x.stratagem.name);

    expect(availableNow).toContain('Eyestinger Storm');
    expect(availableNow).toContain('Stinking Mire');
    expect(availableNow).toContain('Command Re-roll');
    expect(availableNow).not.toContain('Blighted Land');
  });
});
