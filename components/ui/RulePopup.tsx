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

// Common 40k rules database for quick lookup
export const COMMON_RULES: Record<string, string> = {
  'Assault': 'Weapons with this ability can be fired after the bearer\'s unit has Advanced.',
  'Heavy': 'Weapons with this ability can only be fired if the bearer\'s unit Remained Stationary this turn.',
  'Pistol': 'Weapons with this ability can be fired even if the bearer\'s unit is within Engagement Range of enemy units.',
  'Rapid Fire 1': 'Weapons with this ability make 1 additional attack when targeting units within half range.',
  'Rapid Fire 2': 'Weapons with this ability make 2 additional attacks when targeting units within half range.',
  'Rapid Fire 3': 'Weapons with this ability make 3 additional attacks when targeting units within half range.',
  'Melta 1': 'Weapons with this ability deal +1 damage when targeting units within half range.',
  'Melta 2': 'Weapons with this ability deal +2 damage when targeting units within half range.',
  'Melta 3': 'Weapons with this ability deal +3 damage when targeting units within half range.',
  'Lethal Hits': 'Critical Hit rolls of 6 automatically wound the target.',
  'Sustained Hits 1': 'Each Critical Hit generates 1 additional hit.',
  'Sustained Hits 2': 'Each Critical Hit generates 2 additional hits.',
  'Sustained Hits 3': 'Each Critical Hit generates 3 additional hits.',
  'Devastating Wounds': 'Critical Wound rolls inflict mortal wounds equal to the weapon\'s Damage characteristic.',
  'Anti-Infantry 4+': 'This weapon has improved wounding against Infantry units (4+ to wound).',
  'Anti-Vehicle 3+': 'This weapon has improved wounding against Vehicle units (3+ to wound).',
  'Anti-Monster 4+': 'This weapon has improved wounding against Monster units (4+ to wound).',
  'Torrent': 'This weapon automatically hits its target.',
  'Ignores Cover': 'Target cannot claim the benefit of cover against this weapon.',
  'Precision': 'This weapon can target Character models even if they are not the closest visible target.',
  'Blast': 'This weapon can target units that are not visible to the bearer.',
  'Indirect Fire': 'This weapon can target units that are not visible to the bearer.',
  'One Shot': 'This weapon can only be used once per battle.',
  'Hazardous': 'After attacking with this weapon, roll one D6: on a 1, the bearer suffers 1 mortal wound.',
  'Twin-linked': 'Re-roll failed Hit rolls for attacks made with this weapon.',
  'Lance': 'Each time an attack made with this weapon targets a unit that has moved, add 1 to the Wound roll.',
  'Extra Attacks': '+1 Attack when fighting.',
  'Fights First': 'Units with this ability always fight first in the Fight phase.',
  'Feel No Pain 6+': 'Each time this model would lose a wound, roll one D6: on a 6, that wound is not lost.',
  'Feel No Pain 5+': 'Each time this model would lose a wound, roll one D6: on a 5+, that wound is not lost.',
  'Stealth': 'Ranged attacks against this unit suffer -1 to hit.',
  'Infiltrators': 'This unit can be set up anywhere on the battlefield that is more than 9" from enemy models.',
  'Deep Strike': 'This unit can be set up in the Reinforcements step instead of being deployed at the start of the battle.',
  'Leader': 'This model can be attached to a Bodyguard unit.',
  'Lone Operative': 'Unless part of an Attached unit, this unit can only be selected as the target of a ranged attack if it is the closest eligible target.',
  'Scouts 6"': 'At the start of the first turn, this unit can make a Normal move of up to 6".',
  'Scouts 9"': 'At the start of the first turn, this unit can make a Normal move of up to 9".',
};

export default function RulePopup({ isOpen, onClose, rule }: RulePopupProps) {
  if (!isOpen || !rule) return null;

  // Get description from common rules or use provided description
  const description = rule.description || COMMON_RULES[rule.name] || 'No description available.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 border border-gray-600 rounded-lg max-w-md w-full max-h-96 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-700 px-4 py-3 border-b border-gray-600 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{rule.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-80">
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        </div>
      </div>
    </div>
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