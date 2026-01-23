'use client';

import { useState } from 'react';
import { getEffectiveHitValue, getEffectiveWoundValue, formatModifierSources, formatModifierDisplay } from '../../lib/combat-display-utils';

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
  modifiedWeapon?: {
    name: string;
    range: number;
    A: string;
    WS?: number;
    S: number;
    AP: number;
    D: string;
    keywords: string[];
  };
  target?: Target;
  unitName?: string;
  className?: string;
  hideRange?: boolean;
  unitHasCharged?: boolean; // whether the attacking unit charged this turn (for lance)
  // Rules engine modifiers
  hitModifier?: number;
  woundModifier?: number;
  weaponStatModifiers?: {
    A?: number;
    S?: number;
    AP?: number;
    D?: number;
  };
  activeRules?: Array<{ id: string; name: string }>;
  modifierSources?: {
    hit?: string[];
    wound?: string[];
    keywords?: Array<{ keyword: string; source: string }>;
    A?: string[];
    S?: string[];
    AP?: string[];
    D?: string[];
  };
}

// Parse keyword to extract numeric value
function parseKeywordValue(keyword: string, prefix: string): number | null {
  const regex = new RegExp(`^${prefix}\\s+(\\d+)$`, 'i');
  const match = keyword.match(regex);
  return match ? parseInt(match[1], 10) : null;
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
  modifiedWeapon: propModifiedWeapon,
  target,
  unitName,
  className = '',
  hideRange = false,
  unitHasCharged = false,
  hitModifier = 0,
  woundModifier = 0,
  weaponStatModifiers = {},
  activeRules = [],
  modifierSources
}: WeaponProfileDisplayProps) {
  const [isAtHalfRange, setIsAtHalfRange] = useState(false);

  // Use provided modifiedWeapon or calculate it (for backwards compatibility)
  const modifiedWeapon = propModifiedWeapon || (() => {
    const applyDamageModifier = (baseDamage: string, mod: number) => {
      if (!mod) return baseDamage;
      const flatMatch = baseDamage.match(/^\d+$/);
      if (flatMatch) {
        return (parseInt(baseDamage, 10) + mod).toString();
      }

      const dieMatch = baseDamage.match(/^D([36])(?:\+(\d+))?$/i);
      if (dieMatch) {
        const sides = dieMatch[1];
        const existing = dieMatch[2] ? parseInt(dieMatch[2], 10) : 0;
        const next = existing + mod;
        return next > 0 ? `D${sides}+${next}` : `D${sides}`;
      }

      return `${baseDamage}+${mod}`;
    };

    // Check for "Extra Attacks" keyword
    const hasExtraAttacks = weapon.keywords?.some((kw: string) =>
      kw.toLowerCase() === 'extra attacks'
    );

    let modifiedA = weapon.A;
    // Only apply A modifier if weapon doesn't have "Extra Attacks" keyword
    if (weaponStatModifiers.A && !hasExtraAttacks) {
      const numMatch = weapon.A.match(/^\d+$/);
      if (numMatch) {
        modifiedA = (parseInt(weapon.A, 10) + weaponStatModifiers.A).toString();
      } else {
        modifiedA = `${weapon.A}+${weaponStatModifiers.A}`;
      }
    }
    return {
      ...weapon,
      A: modifiedA,
      S: weapon.S + (weaponStatModifiers.S || 0),
      AP: weapon.AP + (weaponStatModifiers.AP || 0),
      D: applyDamageModifier(weapon.D, weaponStatModifiers.D || 0)
    };
  })();

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

    // Show attack modifiers from rules
    if (weaponStatModifiers.A && modifierSources?.A && modifierSources.A.length > 0) {
      const sources = formatModifierSources(modifierSources.A, activeRules);
      modifiers.push(`${weapon.A} → ${modifiedWeapon.A} (${sources})`);
    }

    if (rapidFireValue !== null) {
      const halfRange = weapon.range / 2;
      modifiers.push(`+${rapidFireValue} within ${halfRange}" (rapid fire ${rapidFireValue})`);
    }

    if (hasBlast && blastBonus > 0) {
      modifiers.push(`+${blastBonus} from blast (${target?.modelCount} models)`);
    }

    return {
      stat: 'Attacks',
      value: modifiedWeapon.A,
      modifier: modifiers.join(', ')
    };
  };

  const getHitsRow = () => {
    const hasTorrent = weapon.keywords?.some(kw => kw.toLowerCase() === 'torrent');

    if (hasTorrent) {
      return {
        stat: 'Hits on',
        value: 'Auto',
        modifier: 'Torrent: automatic hits'
      };
    }

    // Calculate effective hit value with modifiers
    const effectiveHit = getEffectiveHitValue(weapon.WS, hitModifier);
    const modifierParts: string[] = [];

    // Add rule modifiers if present (both positive and negative)
    if (hitModifier !== 0 && modifierSources?.hit) {
      const sources = formatModifierSources(modifierSources.hit, activeRules);
      const display = formatModifierDisplay(hitModifier, sources);
      if (display) {
        modifierParts.push(display);
      }
    }

    // Add sustained hits info
    if (sustainedHitsValue !== null) {
      modifierParts.push(`6+ gets ${sustainedHitsValue} extra hit${sustainedHitsValue > 1 ? 's' : ''} (sustained hits ${sustainedHitsValue})`);
    }

    return {
      stat: 'Hits on',
      value: effectiveHit.display,
      modifier: modifierParts.join(', ')
    };
  };

  const getWoundsRow = () => {
    if (!target) return { stat: 'Wounds on', value: '?', modifier: '' };

    // Check for lance keyword
    const hasLance = hasLanceKeyword(weapon.keywords);

    // Calculate effective wound value with modifiers (includes lance if charged)
    // Note: woundModifier from rules engine already accounts for +1 to wound from abilities
    const effectiveWound = getEffectiveWoundValue(
      modifiedWeapon.S,
      target.T,
      woundModifier,
      hasLance,
      unitHasCharged
    );

    const modifierParts: string[] = [];

    // Add rule modifiers if present (both positive and negative)
    if (woundModifier !== 0 && modifierSources?.wound) {
      const sources = formatModifierSources(modifierSources.wound, activeRules);
      const display = formatModifierDisplay(woundModifier, sources);
      if (display) {
        modifierParts.push(display);
      }
    }

    // Check for anti-x keyword - provides critical wound threshold
    const antiBonus = getAntiKeywordBonus(weapon.keywords, target.categories);
    if (antiBonus) {
      modifierParts.push(`Critical wound: anti-${antiBonus.category} ${antiBonus.threshold}+`);
    }

    // Add S vs T info - show modifier if present
    const strengthDisplay = weaponStatModifiers.S
      ? `S${modifiedWeapon.S} (${weapon.S}+${weaponStatModifiers.S})`
      : `S${modifiedWeapon.S}`;
    modifierParts.push(`(${strengthDisplay} vs T${target.T})`);

    // Add lance info if active
    if (hasLance && unitHasCharged) {
      modifierParts.push('+1 to wound (lance, charged)');
    }

    // Add twin-linked info
    if (hasTwinLinked) {
      modifierParts.push('Reroll wounds (twin-linked)');
    }

    return {
      stat: 'Wounds on',
      value: effectiveWound.display,
      modifier: modifierParts.join(' ')
    };
  };

  const getSaveRow = () => {
    if (!target) return { stat: 'Save on', value: '?', modifier: '' };

    const saveResult = getSaveRoll(target.SV, modifiedWeapon.AP, target.INV);

    // Add AP modifier info if present
    let modifier = saveResult.modifier;
    if (weaponStatModifiers.AP) {
      modifier = `${modifier} (AP${modifiedWeapon.AP}: ${weapon.AP}${weaponStatModifiers.AP >= 0 ? '+' : ''}${weaponStatModifiers.AP})`;
    }

    return {
      stat: 'Save on',
      value: saveResult.value,
      modifier: modifier
    };
  };

  const damageModifier =
    weaponStatModifiers.D && modifierSources?.D && modifierSources.D.length > 0
      ? `${weapon.D} → ${modifiedWeapon.D} (${formatModifierSources(modifierSources.D, activeRules)})`
      : '';

  const rows = [
    ...(!hideRange ? [{ stat: 'Range', value: `${weapon.range}"`, modifier: '' }] : []),
    getAttacksRow(),
    getHitsRow(),
    getWoundsRow(),
    getSaveRow(),
    { stat: 'Damage', value: modifiedWeapon.D, modifier: damageModifier }
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
      {(weapon.keywords.length > 0 || (modifierSources?.keywords && modifierSources.keywords.length > 0)) && (
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
            {/* Added keywords from rules */}
            {modifierSources?.keywords?.map((kw, index) => (
              <span
                key={`added-${index}`}
                className="inline-block bg-purple-700 text-purple-100 text-xs px-2 py-1 rounded font-semibold"
                title={`Added by: ${kw.source}`}
              >
                {kw.keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
