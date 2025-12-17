/**
 * Dice rolling utilities for the combat calculator
 */

export interface DiceRoll {
  value: number;
  isReroll?: boolean;
  originalValue?: number;
}

export interface AttackResult {
  totalAttacks: number;
  attackRolls: DiceRoll[];
  hits: number[];
  criticalHits: number[]; // Indices of critical hits (6s)
  lethalHits: number[]; // Indices of lethal hits that auto-wound
  attackCountRolls?: { value: number; sides: number }[]; // The dice rolls for attack count (one per model if variable)
}

export interface WoundResult {
  woundRolls: DiceRoll[];
  wounds: number[];
  criticalWounds: number[]; // Indices meeting Anti-X threshold
  lethalWounds: number[]; // From lethal hits (no roll needed)
}

export interface SaveResult {
  saveRolls: DiceRoll[];
  failedSaves: number[]; // Indices of failed saves
  damageRolls?: { value: number; sides: number }[]; // Individual damage rolls for variable damage
  totalDamage: number;
}

export interface FNPResult {
  fnpRolls: DiceRoll[];
  damageNegated: number;  // Number of wounds negated
  finalDamage: number;     // Damage after FNP
}

/**
 * Parse attack count string like "3", "D6", "2d6", "D6+3"
 */
export function parseAttackCount(attackString: string): { fixed: number; dice: number; modifier: number } {
  const cleaned = attackString.trim().toUpperCase();

  // Fixed number: "3", "12"
  if (/^\d+$/.test(cleaned)) {
    return { fixed: parseInt(cleaned, 10), dice: 0, modifier: 0 };
  }

  // Single die: "D6", "d6"
  if (cleaned === 'D6' || cleaned === 'D3') {
    const sides = cleaned === 'D3' ? 3 : 6;
    return { fixed: 0, dice: sides, modifier: 0 };
  }

  // Multiple dice: "2D6", "3d6"
  const multipleDiceMatch = cleaned.match(/^(\d+)D([36])$/);
  if (multipleDiceMatch) {
    const count = parseInt(multipleDiceMatch[1], 10);
    const sides = parseInt(multipleDiceMatch[2], 10);
    return { fixed: 0, dice: sides, modifier: 0 }; // Will roll count times
  }

  // Die with modifier: "D6+3", "d6+2"
  const diceModifierMatch = cleaned.match(/^D([36])\+(\d+)$/);
  if (diceModifierMatch) {
    const sides = parseInt(diceModifierMatch[1], 10);
    const modifier = parseInt(diceModifierMatch[2], 10);
    return { fixed: 0, dice: sides, modifier };
  }

  // Fallback: try to extract any numbers
  const numbers = cleaned.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    return { fixed: parseInt(numbers[0], 10), dice: 0, modifier: 0 };
  }

  return { fixed: 1, dice: 0, modifier: 0 };
}

/**
 * Roll a single die with N sides
 */
export function rollDie(sides: number = 6): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll N dice and return array of results
 */
export function rollDice(count: number, sides: number = 6): number[] {
  return Array.from({ length: count }, () => rollDie(sides));
}

/**
 * Calculate total attacks including modifiers
 */
export function calculateTotalAttacks(
  attackString: string,
  modelCount: number,
  rapidFireBonus: number = 0,
  blastBonus: number = 0
): { total: number; rolls?: { value: number; sides: number }[] } {
  const parsed = parseAttackCount(attackString);

  let totalBaseAttacks = 0;
  let rolls: { value: number; sides: number }[] | undefined;

  if (parsed.dice > 0) {
    // Roll once per model for variable attacks
    rolls = [];
    for (let i = 0; i < modelCount; i++) {
      const rolledValue = rollDie(parsed.dice);
      rolls.push({ value: rolledValue, sides: parsed.dice });
      totalBaseAttacks += rolledValue + parsed.modifier;
    }
  } else {
    // Fixed attacks: multiply by model count
    totalBaseAttacks = (parsed.fixed + parsed.modifier) * modelCount;
  }

  // Add bonuses
  const total = totalBaseAttacks + rapidFireBonus + blastBonus;

  return { total, rolls };
}

/**
 * Roll attacks and determine hits
 */
export function rollAttacks(
  attackCount: number,
  hitThreshold: number, // The number needed to hit (e.g., 3 for 3+)
  modifiers: {
    sustainedHitsValue?: number;
    lethalHits?: boolean;
    torrent?: boolean;
    attackCountRolls?: { value: number; sides: number }[];
  } = {}
): AttackResult {
  // Torrent: all attacks auto-hit
  if (modifiers.torrent) {
    const attackRolls = Array.from({ length: attackCount }, () => ({ value: 6 }));
    const hits = Array.from({ length: attackCount }, (_, i) => i);
    const criticalHits = Array.from({ length: attackCount }, (_, i) => i);
    const lethalHits = modifiers.lethalHits ? Array.from({ length: attackCount }, (_, i) => i) : [];

    // Sustained Hits: add extra hits to the total count but NOT as extra dice
    if (modifiers.sustainedHitsValue && modifiers.sustainedHitsValue > 0) {
      const extraHits = attackCount * modifiers.sustainedHitsValue;
      // Add extra hit indices beyond the actual rolled dice
      for (let i = 0; i < extraHits; i++) {
        hits.push(attackRolls.length + i);
      }
    }

    return {
      totalAttacks: attackCount,
      attackRolls,
      hits,
      criticalHits,
      lethalHits,
      attackCountRolls: modifiers.attackCountRolls
    };
  }

  const attackRolls = rollDice(attackCount).map(value => ({ value }));

  const hits: number[] = [];
  const criticalHits: number[] = [];
  const lethalHits: number[] = [];

  attackRolls.forEach((roll, index) => {
    if (roll.value >= hitThreshold) {
      hits.push(index);

      // Check for critical hit (unmodified 6)
      if (roll.value === 6) {
        criticalHits.push(index);

        // Lethal hits auto-wound
        if (modifiers.lethalHits) {
          lethalHits.push(index);
        }
      }
    }
  });

  // Sustained Hits: add extra hits to the total count but NOT as extra dice
  // The visual display will show "+1" squares next to critical hits instead
  if (modifiers.sustainedHitsValue && modifiers.sustainedHitsValue > 0) {
    const extraHits = criticalHits.length * modifiers.sustainedHitsValue;
    // Add extra hit indices beyond the actual rolled dice
    // These won't have corresponding dice in attackRolls, but will be counted in hits
    for (let i = 0; i < extraHits; i++) {
      hits.push(attackRolls.length + i);
    }
  }

  return {
    totalAttacks: attackCount,
    attackRolls,
    hits,
    criticalHits,
    lethalHits,
    attackCountRolls: modifiers.attackCountRolls
  };
}

/**
 * Calculate wound threshold based on S vs T
 */
export function calculateWoundThreshold(strength: number, toughness: number, modifiers: { lance?: boolean } = {}): number {
  let baseThreshold: number;

  if (strength >= toughness * 2) {
    baseThreshold = 2;
  } else if (strength > toughness) {
    baseThreshold = 3;
  } else if (strength === toughness) {
    baseThreshold = 4;
  } else if (strength >= toughness / 2) {
    baseThreshold = 5;
  } else {
    baseThreshold = 6;
  }

  // Lance gives +1 to wound (lower threshold)
  if (modifiers.lance) {
    baseThreshold = Math.max(2, baseThreshold - 1);
  }

  return baseThreshold;
}

/**
 * Roll wounds
 */
export function rollWounds(
  hitCount: number,
  lethalHitIndices: number[],
  woundThreshold: number,
  modifiers: {
    twinLinked?: boolean;
    antiXThreshold?: number; // For Anti-X critical wounds
  } = {}
): WoundResult {
  const lethalWounds = [...lethalHitIndices]; // These auto-wound
  const normalHitsCount = hitCount - lethalHitIndices.length;

  let woundRolls = rollDice(normalHitsCount).map(value => ({ value }));

  const wounds: number[] = [];
  const criticalWounds: number[] = [];

  // Check lethal hits first (they don't roll)
  lethalHitIndices.forEach((_, index) => {
    wounds.push(index);
    criticalWounds.push(index); // Lethal hits are critical
  });

  // Roll for normal hits
  let offset = lethalHitIndices.length;
  woundRolls.forEach((roll, index) => {
    const actualIndex = offset + index;

    if (roll.value >= woundThreshold) {
      wounds.push(actualIndex);

      // Check for critical wound (Anti-X threshold)
      if (modifiers.antiXThreshold && roll.value >= modifiers.antiXThreshold) {
        criticalWounds.push(actualIndex);
      }
    }
  });

  // Twin-Linked: reroll failed wounds
  if (modifiers.twinLinked) {
    const failedIndices: number[] = [];
    woundRolls.forEach((roll, index) => {
      if (roll.value < woundThreshold) {
        failedIndices.push(index);
      }
    });

    failedIndices.forEach(failedIndex => {
      const originalValue = woundRolls[failedIndex].value;
      const rerollValue = rollDie();

      woundRolls[failedIndex] = {
        value: rerollValue,
        isReroll: true,
        originalValue
      };

      const actualIndex = offset + failedIndex;

      // Check if reroll succeeds
      if (rerollValue >= woundThreshold) {
        wounds.push(actualIndex);

        if (modifiers.antiXThreshold && rerollValue >= modifiers.antiXThreshold) {
          criticalWounds.push(actualIndex);
        }
      }
    });
  }

  return {
    woundRolls,
    wounds,
    criticalWounds,
    lethalWounds
  };
}

/**
 * Calculate save value considering AP and invulnerable
 */
export function calculateSaveThreshold(
  baseSave: number,
  ap: number,
  invulnerable?: number
): { threshold: number; usingInvulnerable: boolean } {
  const modifiedSave = baseSave - ap;

  if (invulnerable !== undefined && invulnerable !== null) {
    // Use invuln if it's better (lower) than modified save, or if modified save is impossible (>6)
    if (invulnerable <= modifiedSave || modifiedSave > 6) {
      return { threshold: invulnerable, usingInvulnerable: true };
    }
  }

  // No save if modified to 7+ or worse
  if (modifiedSave > 6) {
    return { threshold: 7, usingInvulnerable: false }; // Impossible to save
  }

  return { threshold: modifiedSave, usingInvulnerable: false };
}

/**
 * Check if damage string is variable (contains dice)
 */
export function isVariableDamage(damageString: string): boolean {
  const cleaned = damageString.trim().toUpperCase();
  return cleaned.includes('D');
}

/**
 * Roll a single damage value and return the roll details
 */
export function rollSingleDamage(damageString: string): { value: number; sides?: number } {
  const cleaned = damageString.trim().toUpperCase();

  // D6 or D3 with optional modifier: "D6", "D6+2", "D3-1"
  const singleDiceMatch = cleaned.match(/^D([36])([\+\-]\d+)?$/);
  if (singleDiceMatch) {
    const sides = parseInt(singleDiceMatch[1], 10);
    const modifier = singleDiceMatch[2] ? parseInt(singleDiceMatch[2], 10) : 0;
    return { value: rollDie(sides) + modifier, sides };
  }

  // Multiple dice: "2D6", "2D6+3"
  const multipleDiceMatch = cleaned.match(/^(\d+)D([36])([\+\-]\d+)?$/);
  if (multipleDiceMatch) {
    const count = parseInt(multipleDiceMatch[1], 10);
    const sides = parseInt(multipleDiceMatch[2], 10);
    const modifier = multipleDiceMatch[3] ? parseInt(multipleDiceMatch[3], 10) : 0;
    const total = rollDice(count, sides).reduce((sum, val) => sum + val, 0) + modifier;
    return { value: total, sides };
  }

  // Fixed number
  if (/^\d+$/.test(cleaned)) {
    return { value: parseInt(cleaned, 10) };
  }

  // Default to 1
  return { value: 1 };
}

/**
 * Roll saves and calculate damage
 */
export function rollSaves(
  woundCount: number,
  saveThreshold: number,
  damageString: string,
  meltaBonus: number = 0
): SaveResult {
  const isVariable = isVariableDamage(damageString);

  // If save is impossible, all wounds get through
  if (saveThreshold >= 7) {
    const damageRolls: { value: number; sides: number }[] = [];
    let totalDamage = 0;

    if (isVariable) {
      // Roll damage for each failed save
      for (let i = 0; i < woundCount; i++) {
        const roll = rollSingleDamage(damageString);
        const damage = roll.value + meltaBonus;
        damageRolls.push({ value: damage, sides: roll.sides || 6 });
        totalDamage += damage;
      }
    } else {
      const damagePerWound = parseDamageValue(damageString) + meltaBonus;
      totalDamage = woundCount * damagePerWound;
    }

    return {
      saveRolls: [],
      failedSaves: Array.from({ length: woundCount }, (_, i) => i),
      damageRolls: isVariable ? damageRolls : undefined,
      totalDamage
    };
  }

  const saveRolls = rollDice(woundCount).map(value => ({ value }));
  const failedSaves: number[] = [];

  saveRolls.forEach((roll, index) => {
    if (roll.value < saveThreshold) {
      failedSaves.push(index);
    }
  });

  // Roll damage for each failed save
  const damageRolls: { value: number; sides: number }[] = [];
  let totalDamage = 0;

  if (isVariable) {
    // Variable damage: roll for each failed save
    failedSaves.forEach(() => {
      const roll = rollSingleDamage(damageString);
      const damage = roll.value + meltaBonus;
      damageRolls.push({ value: damage, sides: roll.sides || 6 });
      totalDamage += damage;
    });
  } else {
    // Fixed damage: multiply by failed saves
    const damagePerWound = parseDamageValue(damageString) + meltaBonus;
    totalDamage = failedSaves.length * damagePerWound;
  }

  return {
    saveRolls,
    failedSaves,
    damageRolls: isVariable ? damageRolls : undefined,
    totalDamage
  };
}

/**
 * Roll Feel No Pain saves
 * This happens AFTER damage is rolled, and each point of damage can be negated
 */
export function rollFeelNoPain(
  damageAmount: number,
  fnpThreshold: number
): FNPResult {
  // Roll one die for each point of damage
  const fnpRolls = rollDice(damageAmount).map(value => ({ value }));

  // Count successful FNP saves (saves that meet or exceed threshold)
  let damageNegated = 0;
  fnpRolls.forEach(roll => {
    if (roll.value >= fnpThreshold) {
      damageNegated++;
    }
  });

  const finalDamage = damageAmount - damageNegated;

  return {
    fnpRolls,
    damageNegated,
    finalDamage
  };
}

/**
 * Parse damage value (supports "1", "D6", "D3", etc.)
 */
export function parseDamageValue(damageString: string): number {
  const cleaned = damageString.trim().toUpperCase();

  // Fixed number
  if (/^\d+$/.test(cleaned)) {
    return parseInt(cleaned, 10);
  }

  // D6 or D3 with optional modifier: "D6", "D6+2", "D3-1"
  const singleDiceMatch = cleaned.match(/^D([36])([\+\-]\d+)?$/);
  if (singleDiceMatch) {
    const sides = parseInt(singleDiceMatch[1], 10);
    const modifier = singleDiceMatch[2] ? parseInt(singleDiceMatch[2], 10) : 0;
    return rollDie(sides) + modifier;
  }

  // Multiple dice: "2D6", "2D6+3"
  const multipleDiceMatch = cleaned.match(/^(\d+)D([36])([\+\-]\d+)?$/);
  if (multipleDiceMatch) {
    const count = parseInt(multipleDiceMatch[1], 10);
    const sides = parseInt(multipleDiceMatch[2], 10);
    const modifier = multipleDiceMatch[3] ? parseInt(multipleDiceMatch[3], 10) : 0;
    return rollDice(count, sides).reduce((sum, val) => sum + val, 0) + modifier;
  }

  // Default to 1
  return 1;
}
