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
}

interface WeaponProfileDisplayProps {
  weapon: Weapon;
  target?: Target;
  unitName?: string;
  className?: string;
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

// Calculate wound roll needed
function getWoundRoll(weaponStrength: number, targetToughness: number): string {
  if (weaponStrength >= targetToughness * 2) {
    return '2+';
  } else if (weaponStrength > targetToughness) {
    return '3+';
  } else if (weaponStrength === targetToughness) {
    return '4+';
  } else if (weaponStrength < targetToughness && weaponStrength >= targetToughness / 2) {
    return '5+';
  } else {
    return '6+';
  }
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
  className = ''
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

    const baseWound = getWoundRoll(weapon.S, target.T);
    const modifiers: string[] = [];

    // Always show S and T
    modifiers.push(`(S${weapon.S}, T${target.T})`);

    if (hasTwinLinked) {
      modifiers.push('Reroll wounds (twin-linked)');
    }

    return {
      stat: 'Wounds on',
      value: baseWound,
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
    { stat: 'Range', value: `${weapon.range}"`, modifier: '' },
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
