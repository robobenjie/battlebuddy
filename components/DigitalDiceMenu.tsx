/**
 * Digital Dice configuration menu
 */

import { useState, useEffect } from 'react';
import { WeaponStats, TargetStats, CombatOptions, parseKeywords } from '../lib/combat-calculator-engine';
import { Rule, ArmyState } from '../lib/rules-engine/types';

interface DigitalDiceMenuProps {
  weapon: WeaponStats;
  target: TargetStats;
  totalWeaponCount: number;
  unitHasCharged: boolean;
  unitHasMovedOrAdvanced: boolean;
  activeRules?: Rule[]; // Rules with conditional inputs
  armyStates?: ArmyState[]; // Army states to check for existing selections
  onRollAttacks: (options: CombatOptions) => void;
  onClose: () => void;
}

export default function DigitalDiceMenu({
  weapon,
  target,
  totalWeaponCount,
  unitHasCharged,
  unitHasMovedOrAdvanced,
  activeRules = [],
  armyStates = [],
  onRollAttacks,
  onClose
}: DigitalDiceMenuProps) {
  // Parse keywords to determine what controls to show
  const keywords = parseKeywords(weapon.keywords, target.categories);

  // State for configuration
  const [modelsFiring, setModelsFiring] = useState<number | "">(totalWeaponCount);
  const [withinHalfRange, setWithinHalfRange] = useState(false);
  const [blastBonusAttacks, setBlastBonusAttacks] = useState(
    keywords.blast ? Math.floor(target.modelCount / 5) : 0
  );
  const [unitRemainedStationary, setUnitRemainedStationary] = useState(!unitHasMovedOrAdvanced);

  // State for user inputs from choice rules
  const [userInputs, setUserInputs] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    activeRules
      .filter((rule: any) => rule.kind === 'choice')
      .forEach((rule: any) => {
        if (rule.choice) {
          // Default to first option value
          initial[rule.choice.id] = rule.choice.options[0]?.v;
        }
      });
    return initial;
  });

  // Get rules that require user input (choice rules)
  // Skip choice rules that already have selections in armyStates
  const rulesWithInput = activeRules.filter(rule => {
    if (rule.kind !== 'choice' || !rule.choice) return false;

    // For army-scoped choices, check if already selected in armyStates
    if (rule.scope === 'army') {
      const hasSelection = armyStates.some(state =>
        state.state === rule.choice.id && state.choiceValue
      );
      // Skip this rule if it already has a selection
      return !hasSelection;
    }

    // For non-army scoped choices, always show
    return true;
  });

  // Update blast bonus when target model count changes
  useEffect(() => {
    if (keywords.blast) {
      setBlastBonusAttacks(Math.floor(target.modelCount / 5));
    }
  }, [target.modelCount, keywords.blast]);

  const handleRollAttacks = () => {
    const options: CombatOptions = {
      modelsFiring: typeof modelsFiring === 'number' ? modelsFiring : 1,
      withinHalfRange,
      blastBonusAttacks,
      unitHasCharged,
      unitRemainedStationary,
      userInputs
    };
    onRollAttacks(options);
  };

  const hasRangeDependentAbilities = keywords.rapidFireValue !== null || keywords.meltaValue !== null;
  const showModelCount = totalWeaponCount > 1;

  const halfRange = weapon.range / 2;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Digital Dice</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Weapon Name */}
          <div className="bg-gray-800 rounded p-3">
            <p className="text-sm text-gray-400">Weapon</p>
            <p className="text-white font-semibold">{weapon.name}</p>
          </div>

          {/* Model Count Selection */}
          {showModelCount && (
            <div className="bg-gray-800 rounded p-3">
              <label className="block text-sm text-gray-400 mb-2">
                Models Firing
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setModelsFiring(Math.max(1, (typeof modelsFiring === 'number' ? modelsFiring : 0) - 1))}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold w-10 h-10 rounded transition-colors"
                >
                  −
                </button>
                <input
                  type="number"
                  value={modelsFiring}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setModelsFiring('');
                    } else {
                      const num = parseInt(val, 10);
                      if (!isNaN(num)) {
                        setModelsFiring(Math.max(1, Math.min(totalWeaponCount, num)));
                      }
                    }
                  }}
                  className="bg-gray-700 text-white text-center font-semibold rounded px-3 py-2 w-20"
                  min={1}
                  max={totalWeaponCount}
                />
                <button
                  onClick={() => setModelsFiring(Math.min(totalWeaponCount, (typeof modelsFiring === 'number' ? modelsFiring : 0) + 1))}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold w-10 h-10 rounded transition-colors"
                >
                  +
                </button>
                <span className="text-gray-400 text-sm">/ {totalWeaponCount}</span>
              </div>
            </div>
          )}

          {/* Range Toggle */}
          {hasRangeDependentAbilities && (
            <div className="bg-gray-800 rounded p-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-white font-semibold">Within half range</p>
                  <p className="text-xs text-gray-400">
                    ({halfRange}" or less)
                    {keywords.rapidFireValue && ` - Rapid Fire ${keywords.rapidFireValue}`}
                    {keywords.meltaValue && ` - Melta ${keywords.meltaValue}`}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={withinHalfRange}
                  onChange={(e) => setWithinHalfRange(e.target.checked)}
                  className="w-6 h-6 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                />
              </label>
            </div>
          )}

          {/* Blast Bonus */}
          {keywords.blast && (
            <div className="bg-gray-800 rounded p-3">
              <label className="block text-sm text-gray-400 mb-2">
                Extra attacks from Blast
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setBlastBonusAttacks(Math.max(0, blastBonusAttacks - 1))}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold w-10 h-10 rounded transition-colors"
                >
                  −
                </button>
                <input
                  type="number"
                  value={blastBonusAttacks}
                  onChange={(e) => setBlastBonusAttacks(Math.max(0, parseInt(e.target.value) || 0))}
                  className="bg-gray-700 text-white text-center font-semibold rounded px-3 py-2 w-20"
                  min={0}
                />
                <button
                  onClick={() => setBlastBonusAttacks(blastBonusAttacks + 1)}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold w-10 h-10 rounded transition-colors"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Target has {target.modelCount} models (default: +{Math.floor(target.modelCount / 5)})
              </p>
            </div>
          )}

          {/* Heavy Weapon Stationary */}
          {keywords.heavy && (
            <div className="bg-gray-800 rounded p-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-white font-semibold">Unit remained stationary</p>
                  <p className="text-xs text-gray-400">
                    (+1 to hit for Heavy weapons)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={unitRemainedStationary}
                  onChange={(e) => setUnitRemainedStationary(e.target.checked)}
                  className="w-6 h-6 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                />
              </label>
            </div>
          )}

          {/* Conditional Rule Inputs (Choice Rules) */}
          {rulesWithInput.map(rule => {
            if (rule.kind !== 'choice' || !rule.choice) return null;

            const choice = rule.choice;

            return (
              <div key={choice.id} className="bg-gray-800 rounded p-3 border-l-4 border-purple-500">
                <p className="text-white font-semibold mb-2">{choice.prompt}</p>
                <p className="text-xs text-gray-400 mb-3">{rule.name}</p>
                <div className="space-y-2">
                  {choice.options.map(option => (
                    <label key={option.v} className="flex items-start cursor-pointer hover:bg-gray-700 p-2 rounded transition-colors">
                      <input
                        type="radio"
                        name={choice.id}
                        value={option.v}
                        checked={userInputs[choice.id] === option.v}
                        onChange={(e) => setUserInputs(prev => ({
                          ...prev,
                          [choice.id]: option.v
                        }))}
                        className="mt-1 w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500"
                      />
                      <span className="ml-3 text-sm text-gray-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Active Keywords Display */}
          {weapon.keywords.length > 0 && (
            <div className="bg-gray-800 rounded p-3">
              <p className="text-sm text-gray-400 mb-2">Active Keywords</p>
              <div className="flex flex-wrap gap-2">
                {weapon.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Roll Attacks Button */}
          <button
            onClick={handleRollAttacks}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
          >
            Roll Attacks
          </button>
        </div>
      </div>
    </div>
  );
}
