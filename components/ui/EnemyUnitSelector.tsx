/**
 * Enemy Unit Selector Component
 *
 * Displays a list of enemy units and allows player to select one as a target
 * (for abilities like Oath of Moment).
 */

'use client';

import { getUnitDisplayName } from '../../lib/unit-utils';

interface EnemyUnit {
  id: string;
  name: string;
  type?: string;
  count?: number;
  categories?: string[];
}

interface EnemyUnitSelectorProps {
  ruleId: string;
  ruleName: string;
  ruleDescription: string;
  enemyUnits: EnemyUnit[];
  currentTargetId?: string;
  onSelect: (unitId: string) => void;
  disabled?: boolean;
}

export default function EnemyUnitSelector({
  ruleId,
  ruleName,
  ruleDescription,
  enemyUnits,
  currentTargetId,
  onSelect,
  disabled = false
}: EnemyUnitSelectorProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      {/* Rule Name and Description */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-white mb-1">{ruleName}</h3>
        <p className="text-sm text-gray-400">{ruleDescription}</p>
      </div>

      {/* Target Selection Prompt */}
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-300">Select an enemy unit to target:</p>
      </div>

      {/* No enemies available */}
      {enemyUnits.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          No enemy units available
        </div>
      )}

      {/* Unit List */}
      {enemyUnits.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {enemyUnits.map((unit) => {
            const isSelected = currentTargetId === unit.id;
            const displayName = getUnitDisplayName(unit as any);

            return (
              <button
                key={unit.id}
                onClick={() => !disabled && onSelect(unit.id)}
                disabled={disabled}
                className={`
                  w-full text-left px-4 py-3 rounded-lg border-2 transition-all
                  ${isSelected
                    ? 'border-red-500 bg-red-900/30 text-white'
                    : 'border-gray-600 bg-gray-750 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{displayName}</div>
                    {unit.categories && unit.categories.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {unit.categories.slice(0, 3).join(' • ')}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="ml-2 text-red-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                          fillRule="evenodd"
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
      )}

      {/* Current selection indicator */}
      {currentTargetId && (
        <div className="mt-3 text-xs text-gray-500">
          🎯 Current target: {enemyUnits.find(u => u.id === currentTargetId)?.name || 'Unknown'}
        </div>
      )}
    </div>
  );
}
