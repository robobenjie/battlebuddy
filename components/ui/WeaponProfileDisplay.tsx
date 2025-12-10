'use client';

import { useState } from 'react';

interface Weapon {
  id: string;
  name: string;
  range: number;
  A: string; // attacks (number or dice like "d6 + 3")
  WS?: number; // weapon skill (for melee)
  S: number; // strength
  AP: number; // armour penetration
  D: string; // damage
  keywords: string[];
}

interface Target {
  T: number; // toughness
  SV: number; // save value
  INV?: number; // invulnerable save value
  modelCount?: number; // number of models in target unit
  categories?: string[]; // unit categories for anti-x keywords
}

interface WeaponProfileDisplayProps {
  weapon: Weapon;
  target?: Target;
  unitName?: string;
  className?: string;
  hideRange?: boolean;
  unitHasCharged?: boolean; // whether the attacking unit charged this turn (for lance)
}

// Parse keyword to extract numeric value
function parseKeywordValue(keyword: string, prefix: string): number | null {
  const regex = new RegExp(`^${prefix}\\s+(\\d+)$`, 'i');
  const match = keyword.match(regex);
  return match ? parseInt(match[1], 10) : null;
}

// Calculate hit roll needed (BS value)
function getHitRoll(weapon: Weapon): string {
  // WS field contains BS for ranged weapons
  if (weapon.WS !== undefined && weapon.WS !== null) {
    return `${weapon.WS}+`;
  }
  return 'N/A';
}

// Calculate wound roll needed (returns numeric value 2-6)
function getWoundRollValue(weaponStrength: number, targetToughness: number): number {
  if (weaponStrength >= targetToughness * 2) {
    return 2;
  } else if (weaponStrength > targetToughness) {
    return 3;
  } else if (weaponStrength === targetToughness) {
    return 4;
  } else if (weaponStrength < targetToughness && weaponStrength >= targetToughness / 2) {
    return 5;
  } else {
    return 6;
  }
}

// Calculate wound roll needed
function getWoundRoll(weaponStrength: number, targetToughness: number): string {
  return `${getWoundRollValue(weaponStrength, targetToughness)}+`;
}

// Check if weapon has anti-x keyword matching target categories
// Returns the critical wound threshold if applicable
function getAntiKeywordBonus(weaponKeywords: string[], targetCategories?: string[]): { category: string; threshold: number } | null {
  if (!targetCategories || targetCategories.length === 0) return null;

  for (const keyword of weaponKeywords) {
    // Match patterns like "Anti-Monster 4+", "anti-infantry 2+", etc.
    const antiMatch = keyword.match(/^anti[- ](.+?)\s+(\d+)\+?$/i);
    if (antiMatch) {
      const antiCategory = antiMatch[1].trim();
      const threshold = parseInt(antiMatch[2], 10);

      // Check if target has this category (case-insensitive)
      const hasCategory = targetCategories.some(cat =>
        cat.toLowerCase() === antiCategory.toLowerCase()
      );

      if (hasCategory) {
        return { category: antiCategory, threshold };
      }
    }
  }
  return null;
}

// Check if weapon has lance keyword
function hasLanceKeyword(weaponKeywords: string[]): boolean {
  return weaponKeywords.some(k => k.toLowerCase() === 'lance');
}

// Calculate save roll after AP, considering invulnerable save
function getSaveRoll(targetSave: number, weaponAP: number, invulnerableSave?: number): { value: string; modifier: string } {
  const modifiedSave = targetSave - weaponAP;

  // If there's an invulnerable save, compare it to the modified save
  if (invulnerableSave !== undefined && invulnerableSave !== null) {
    // Lower number is better in 40k (e.g., 4+ is better than 5+)
    if (invulnerableSave < modifiedSave || modifiedSave <= 1) {
      return {
        value: `${invulnerableSave}+`,
        modifier: `(${invulnerableSave}+ invulnerable)`
      };
    }
  }

  // Use regular save
  if (modifiedSave <= 1) {
    return { value: 'No save', modifier: '' };
  }

  return {
    value: `${modifiedSave}+`,
    modifier: `(${targetSave}+ save, ${Math.abs(weaponAP)} AP)`
  };
}

export default function WeaponProfileDisplay({
  weapon,
  target,
  unitName,
  className = '',
  hideRange = false,
  unitHasCharged = false
}: WeaponProfileDisplayProps) {
  const [isAtHalfRange, setIsAtHalfRange] = useState(false);

  // Parse keywords
  const rapidFireValue = weapon.keywords
    .map(k => parseKeywordValue(k, 'Rapid Fire'))
    .find(v => v !== null) ?? null;

  const sustainedHitsValue = weapon.keywords
    .map(k => parseKeywordValue(k, 'Sustained Hits'))
    .find(v => v !== null) ?? null;

  const hasTwinLinked = weapon.keywords.some(k =>
    k.toLowerCase() === 'twin-linked'
  );

  const hasBlast = weapon.keywords.some(k =>
    k.toLowerCase() === 'blast'
  );

  // Calculate blast bonus
  const getBlastBonus = () => {
    if (!hasBlast || !target?.modelCount) return 0;
    return Math.floor(target.modelCount / 5);
  };

  // Build table rows with stat name, base value, and modifiers
  const getAttacksRow = () => {
    const blastBonus = getBlastBonus();
    const modifiers: string[] = [];

    if (rapidFireValue !== null) {
      const halfRange = weapon.range / 2;
      modifiers.push(`+${rapidFireValue} within ${halfRange}" (rapid fire ${rapidFireValue})`);
    }

    if (hasBlast && blastBonus > 0) {
      modifiers.push(`+${blastBonus} from blast (${target?.modelCount} models)`);
    }

    return {
      stat: 'Attacks',
      value: weapon.A,
      modifier: modifiers.join(', ')
    };
  };

  const getHitsRow = () => {
    const baseHit = getHitRoll(weapon);
    let modifier = '';

    if (sustainedHitsValue !== null) {
      modifier = `6+ gets ${sustainedHitsValue} extra hit${sustainedHitsValue > 1 ? 's' : ''} (sustained hits ${sustainedHitsValue})`;
    }

    return {
      stat: 'Hits on',
      value: baseHit,
      modifier
    };
  };

  const getWoundsRow = () => {
    if (!target) return { stat: 'Wounds on', value: '?', modifier: '' };

    let baseWoundValue = getWoundRollValue(weapon.S, target.T);
    const modifiers: string[] = [];
    const activeEffects: string[] = [];

    // Track if we have any +1 to wound modifiers (max +1 total in 10th ed)
    let hasWoundModifier = false;

    // Check for lance keyword (only on charge turns) - gives +1 to wound
    const hasLance = hasLanceKeyword(weapon.keywords);
    if (hasLance && unitHasCharged) {
      hasWoundModifier = true;
      activeEffects.push('lance');
    }

    // Apply +1 to wound modifier if any (max +1)
    let modifiedWoundValue = baseWoundValue;
    if (hasWoundModifier) {
      modifiedWoundValue = Math.max(2, baseWoundValue - 1); // Improve by 1, minimum 2+
    }

    // Check for anti-x keyword - provides critical wound threshold
    const antiBonus = getAntiKeywordBonus(weapon.keywords, target.categories);
    let finalWoundValue = modifiedWoundValue;

    if (antiBonus) {
      // Use the better (lower) of the two values: modified wound roll or anti-x threshold
      finalWoundValue = Math.min(modifiedWoundValue, antiBonus.threshold);
      activeEffects.push(`anti-${antiBonus.category} ${antiBonus.threshold}+`);
    }

    const finalWound = `${finalWoundValue}+`;

    // Always show S and T
    modifiers.push(`(S${weapon.S}, T${target.T})`);

    // Show active effects
    if (activeEffects.length > 0) {
      const effectText = activeEffects.join(', ');
      if (hasWoundModifier && antiBonus) {
        // Both modifier and anti-x active
        modifiers.push(`${effectText}`);
      } else if (hasWoundModifier) {
        // Only modifier
        modifiers.push(`+1 to wound (${effectText})`);
      } else if (antiBonus) {
        // Only anti-x
        modifiers.push(`Critical wound: ${effectText}`);
      }
    }

    if (hasTwinLinked) {
      modifiers.push('Reroll wounds (twin-linked)');
    }

    return {
      stat: 'Wounds on',
      value: finalWound,
      modifier: modifiers.join(' ')
    };
  };

  const getSaveRow = () => {
    if (!target) return { stat: 'Save on', value: '?', modifier: '' };

    const saveResult = getSaveRoll(target.SV, weapon.AP, target.INV);
    return {
      stat: 'Save on',
      value: saveResult.value,
      modifier: saveResult.modifier
    };
  };

  const rows = [
    ...(!hideRange ? [{ stat: 'Range', value: `${weapon.range}"`, modifier: '' }] : []),
    getAttacksRow(),
    getHitsRow(),
    getWoundsRow(),
    getSaveRow(),
    { stat: 'Damage', value: weapon.D, modifier: '' }
  ];

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-3">
        {unitName ? `${unitName}: ` : ''}{weapon.name}
      </h3>

      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-[25%]" />
          <col className="w-[20%]" />
          <col className="w-[55%]" />
        </colgroup>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-gray-700 last:border-b-0">
              <td className="py-2 text-gray-400 font-medium">{row.stat}</td>
              <td className="py-2 text-white font-medium">{row.value}</td>
              <td className="py-2 text-gray-300 text-xs italic">{row.modifier || '\u00A0'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Keywords display */}
      {weapon.keywords.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex flex-wrap gap-1">
            {weapon.keywords.map((keyword, index) => (
              <span
                key={index}
                className="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
