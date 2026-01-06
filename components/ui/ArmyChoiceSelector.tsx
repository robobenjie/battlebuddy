/**
 * Army Choice Selector Component
 *
 * Displays army-wide choice options (like Tyranid Hyper Adaptations)
 * and allows player to select one option.
 */

'use client';

import { ChoiceRuleType } from '../../lib/rules-engine/types';

interface ArmyChoiceSelectorProps {
  rule: ChoiceRuleType;
  currentSelection?: string; // The currently selected option value
  onSelect: (optionValue: string) => void;
  disabled?: boolean;
}

export default function ArmyChoiceSelector({
  rule,
  currentSelection,
  onSelect,
  disabled = false
}: ArmyChoiceSelectorProps) {
  const { choice } = rule;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      {/* Rule Name and Description */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-white mb-1">{rule.name}</h3>
        <p className="text-sm text-gray-400">{rule.description}</p>
      </div>

      {/* Choice Prompt */}
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-300">{choice.prompt}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {choice.options.map((option) => {
          const isSelected = currentSelection === option.v;

          return (
            <button
              key={option.v}
              onClick={() => !disabled && onSelect(option.v)}
              disabled={disabled}
              className={`
                w-full text-left px-4 py-3 rounded-lg border-2 transition-all
                ${isSelected
                  ? 'border-blue-500 bg-blue-900/30 text-white'
                  : 'border-gray-600 bg-gray-750 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                </div>
                {isSelected && (
                  <div className="ml-2 text-blue-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Lifetime indicator */}
      <div className="mt-3 text-xs text-gray-500">
        {choice.lifetime.t === 'game' && '⏰ Once per battle, lasts entire game'}
        {choice.lifetime.t === 'turn' && '⏰ Lasts until end of turn'}
        {choice.lifetime.t === 'roll' && '⏰ Selected per attack'}
        {choice.lifetime.t === 'phase' && `⏰ Lasts until next ${(choice.lifetime as any).phase} phase`}
      </div>
    </div>
  );
}
