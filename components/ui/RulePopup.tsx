'use client';

import { useState } from 'react';

interface Rule {
  name: string;
  description: string;
}

interface RulePopupProps {
  isOpen: boolean;
  onClose: () => void;
  rule: Rule | null;
}

// Function to parse and generate descriptions for parameterized rules
export function parseRuleDescription(ruleName: string): string | null {
  // Handle Anti-X Y+ rules
  const antiMatch = ruleName.match(/^Anti-(\w+)\s+(\d+)\+$/);
  if (antiMatch) {
    const [, keyword, threshold] = antiMatch;
    return `Anti-keyword ${threshold}+ abilities allow models to score Critical Wounds (automatic success) against ${keyword} units on to-wound rolls of ${threshold}+.`;
  }

  // Handle Rapid Fire X rules
  const rapidFireMatch = ruleName.match(/^Rapid Fire (\d+)$/);
  if (rapidFireMatch) {
    const [, shots] = rapidFireMatch;
    return `Rapid Fire ${shots} weapons fire ${shots} extra shot${shots === '1' ? '' : 's'} against targets within half range.`;
  }

  // Handle Melta X rules
  const meltaMatch = ruleName.match(/^Melta (\d+)$/);
  if (meltaMatch) {
    const [, damage] = meltaMatch;
    return `Melta ${damage} weapons do an additional ${damage} damage against targets within half their weapon range.`;
  }

  // Handle Sustained Hits X rules
  const sustainedHitsMatch = ruleName.match(/^Sustained Hits (\d+)$/);
  if (sustainedHitsMatch) {
    const [, hits] = sustainedHitsMatch;
    return `A Sustained Hits ${hits} weapon inflicts ${hits} additional hit${hits === '1' ? '' : 's'} on Critical Hit rolls.`;
  }

  // Handle Feel No Pain X+ rules
  const feelNoPainMatch = ruleName.match(/^Feel No Pain (\d+)\+$/);
  if (feelNoPainMatch) {
    const [, threshold] = feelNoPainMatch;
    return `Each time this model would lose a wound, roll one D6: on a ${threshold}+, that wound is not lost.`;
  }

  // Handle Scouts X" rules
  const scoutsMatch = ruleName.match(/^Scouts (\d+)"$/);
  if (scoutsMatch) {
    const [, distance] = scoutsMatch;
    return `Units with the Scouts ${distance}" ability get a free ${distance}" move after deployment.`;
  }

  // Handle Firing Deck X rules
  const firingDeckMatch = ruleName.match(/^Firing Deck (\d+)$/);
  if (firingDeckMatch) {
    const [, weapons] = firingDeckMatch;
    return `A vehicle unit with Firing Deck ${weapons} can make additional ranged attacks using up to ${weapons} weapon${weapons === '1' ? '' : 's'} held by embarked models.`;
  }

  // Handle Deadly Demise X rules
  const deadlyDemiseMatch = ruleName.match(/^Deadly Demise (\d+)$/);
  if (deadlyDemiseMatch) {
    const [, damage] = deadlyDemiseMatch;
    return `When a unit with Deadly Demise ${damage} loses its last wound, roll D6. On a 6, the unit deals ${damage} mortal wound${damage === '1' ? '' : 's'} to all units within range.`;
  }

  return null;
}

// Updated 40k rules database with correct 10th edition rules
export const COMMON_RULES: Record<string, string> = {
  // Weapon Abilities
  'Assault': 'A unit that Advances during the movement phase can still shoot its Assault weapons.',
  'Heavy': 'Units that Remain Stationary get +1 to hit with Heavy Weapons they fire that turn.',
  'Pistol': 'You can fire these weapons while in engagement range of enemy units (but only at units you\'re in engagement range with.)',
  'Blast': 'When shooting a Blast weapon, add one to the attack characteristic for every five models in the target unit.',
  'Conversion': 'When firing at a target at least 12" away, this weapon inflicts Critical Hits (automatic success) on hit rolls of 4+.',
  'Devastating Wounds': 'When this weapon scores a Critical Wound (normally an unmodified 6), the target cannot take saves or invulnerable saves against that wound.',
  'Extra Attacks': 'When you declare melee attacks, you can also attack with Extra Attacks weapons.',
  'Hazardous': 'Roll one D6 for each Hazardous weapon used. On a 1, deal 3 mortal wounds to Characters/Vehicles/Monsters or remove 1 model.',
  'Indirect Fire': 'This weapon doesn\'t need line of sight to the target but suffers -1 to hit and target gains Benefit of Cover.',
  'Ignores Cover': 'Weapons with this ability ignore the Benefit of Cover.',
  'Lance': 'On the turn that a unit Charges, weapons with the Lance ability have +1 to wound.',
  'Lethal Hits': 'Critical Hits (normally unmodified 6s) with this weapon automatically wound without rolling.',
  'Linked Fire': 'This weapon can draw line of sight and measure range from another friendly unit that it can see.',
  'Precision': 'When attacking a unit with an attached Character, you can direct attacks at the Character.',
  'Psychic': 'This weapon has the Psychic ability. Some other abilities respond to Psychic attacks.',
  'Torrent': 'Torrent weapons automatically hit.',
  'Twin-linked': 'Twin-Linked weapons can re-roll To Wound rolls.',

  // Core Abilities
  'Deep Strike': 'Deep Strike units start in Reserves and enter the battlefield more than 9" away from enemy units.',
  'Fights First': 'Units with this ability fight in the \'Fights First\' step of the Fight Phase.',
  'Infiltrators': 'This unit can be deployed anywhere on the board more than 9" away from enemy units.',
  'Leader': 'This Character can join other squads during deployment, becoming their bodyguard.',
  'Lone Operative': 'Lone operatives can\'t be targeted by enemies more than 12" away.',
  'Stealth': 'If every model in the unit has Stealth, ranged attacks targeting that unit take -1 to hit.',
};

export default function RulePopup({ isOpen, onClose, rule }: RulePopupProps) {
  if (!isOpen || !rule) return null;

  // Try to get description from dynamic parsing first, then common rules, then provided description
  const description = 
    parseRuleDescription(rule.name) || 
    rule.description || 
    COMMON_RULES[rule.name] || 
    'No description available.';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-gray-800 border border-gray-600 rounded-lg max-w-lg w-full max-h-80 overflow-hidden shadow-xl pointer-events-auto">
          {/* Header */}
          <div className="bg-gray-700 px-4 py-2 border-b border-gray-600 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{rule.name}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded transition-colors text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-64">
            <p className="text-gray-300 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// Hook for managing rule popup state
export function useRulePopup() {
  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    rule: Rule | null;
  }>({
    isOpen: false,
    rule: null,
  });

  const showRule = (name: string, description?: string) => {
    setPopupState({
      isOpen: true,
      rule: { name, description: description || '' },
    });
  };

  const hideRule = () => {
    setPopupState({
      isOpen: false,
      rule: null,
    });
  };

  return {
    ...popupState,
    showRule,
    hideRule,
  };
} 