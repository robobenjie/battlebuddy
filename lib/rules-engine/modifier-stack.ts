/**
 * Modifier stack for managing stat modifications from multiple rules
 */

import { Modifier } from './types';

export class ModifierStack {
  private modifiers: Map<string, Modifier[]> = new Map();

  /**
   * Add a modifier to the stack
   */
  add(modifier: Modifier): void {
    const key = modifier.stat;
    if (!this.modifiers.has(key)) {
      this.modifiers.set(key, []);
    }
    this.modifiers.get(key)!.push(modifier);

    // Sort by priority (lower priority applied first)
    this.modifiers.get(key)!.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get the total modifier for a stat
   */
  get(stat: string): number {
    const mods = this.modifiers.get(stat);
    if (!mods || mods.length === 0) return 0;

    let total = 0;
    for (const mod of mods) {
      if (mod.operation === '+') {
        total += mod.value;
      } else if (mod.operation === '-') {
        total -= mod.value;
      }
    }
    return total;
  }

  /**
   * Apply all modifiers to a base value
   */
  apply(stat: string, baseValue: number): number {
    const mods = this.modifiers.get(stat);
    if (!mods || mods.length === 0) return baseValue;

    let result = baseValue;

    // Apply in priority order
    for (const mod of mods) {
      switch (mod.operation) {
        case '+':
          result += mod.value;
          break;
        case '-':
          result -= mod.value;
          break;
        case 'set':
          result = mod.value;
          break;
        case 'min':
          result = Math.max(result, mod.value);
          break;
        case 'max':
          result = Math.min(result, mod.value);
          break;
      }
    }

    return result;
  }

  /**
   * Get all modifiers for a stat (for debugging/display)
   */
  getModifiers(stat: string): Modifier[] {
    return this.modifiers.get(stat) || [];
  }

  /**
   * Clear all modifiers
   */
  clear(): void {
    this.modifiers.clear();
  }

  /**
   * Clear modifiers from a specific source
   */
  clearSource(source: string): void {
    for (const [stat, mods] of this.modifiers.entries()) {
      this.modifiers.set(
        stat,
        mods.filter(m => m.source !== source)
      );
    }
  }

  /**
   * Get all active modifiers (for debugging)
   */
  getAllModifiers(): Map<string, Modifier[]> {
    return new Map(this.modifiers);
  }
}
