/**
 * Two-column display of dice rolling results
 */

import { CombatResult, WeaponStats, TargetStats } from '../../lib/combat-calculator-engine';
import DiceDisplay, { AutoHitsDisplay, Die } from './DiceDisplay';
import ActiveRulesDisplay from './ActiveRulesDisplay';
import { getEffectiveHitValue, getEffectiveWoundValue, formatModifierSources, formatModifierDisplay } from '../../lib/combat-display-utils';

interface DiceRollResultsProps {
  combatResult: CombatResult;
  weapon: WeaponStats;
  target: TargetStats;
  onRollSaves?: () => void;
  showSavePhase: boolean;
  activeRules?: Array<{
    id: string;
    name: string;
    description: string;
    effects: Array<{
      type: string;
      params: any;
    }>;
  }>;
  hitModifier?: number;
  woundModifier?: number;
  addedKeywords?: string[];
  modifierSources?: {
    hit?: string[];
    wound?: string[];
    keywords?: Array<{ keyword: string; source: string }>;
  };
}

export default function DiceRollResults({
  combatResult,
  weapon,
  target,
  onRollSaves,
  showSavePhase,
  activeRules = [],
  hitModifier = 0,
  woundModifier = 0,
  addedKeywords = [],
  modifierSources
}: DiceRollResultsProps) {
  const { attackPhase, woundPhase, savePhase, keywords, summary, options } = combatResult;

  // Calculate percentages
  const hitPercentage = summary.totalAttacks > 0
    ? Math.round((summary.totalHits / summary.totalAttacks) * 100)
    : 0;

  const woundPercentage = summary.totalHits > 0
    ? Math.round((summary.totalWounds / summary.totalHits) * 100)
    : 0;

  // Check if weapon has variable attacks (contains D for dice)
  const hasVariableAttacks = weapon.A.toUpperCase().includes('D');

  // Check if we can skip save rolling:
  // - Save is impossible (worse than 6+)
  // - Damage is not variable (fixed number)
  const modifiedSave = target.SV - weapon.AP;
  const usingInvuln = target.INV && (target.INV < modifiedSave || modifiedSave <= 1);
  const saveThreshold = usingInvuln ? target.INV : (modifiedSave <= 1 ? 7 : modifiedSave);
  const hasVariableDamage = weapon.D.toUpperCase().includes('D');
  const canSkipSaveRolling = saveThreshold >= 7 && !hasVariableDamage;

  // If we can skip save rolling and saves haven't been shown yet, calculate damage directly
  const shouldShowDirectDamage = canSkipSaveRolling && !showSavePhase && summary.totalWounds > 0;

  // Calculate melta bonus for direct damage
  const meltaBonus = (keywords.meltaValue && options.withinHalfRange) ? keywords.meltaValue : 0;
  const damagePerWound = parseInt(weapon.D, 10) + meltaBonus;
  const directTotalDamage = shouldShowDirectDamage ? summary.totalWounds * damagePerWound : 0;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Attacks Rolled Card (if variable attacks) */}
      {hasVariableAttacks && attackPhase.attackCountRolls && attackPhase.attackCountRolls.length > 0 && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <h4 className="font-semibold text-red-400 px-4 py-3 bg-gray-900">ATTACKS ROLLED</h4>
          <div className="flex">
            {/* Dice (1/3) */}
            <div className="w-1/3 p-4">
              <div className="flex flex-wrap gap-1">
                {attackPhase.attackCountRolls.map((roll, index) => (
                  <Die
                    key={index}
                    value={roll.value}
                    type="miss"
                    size={20}
                    sides={roll.sides}
                  />
                ))}
              </div>
            </div>

            {/* Text (2/3) */}
            <div className="w-2/3 p-4 border-l border-gray-700">
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-gray-400">Attack characteristic:</span>{' '}
                  <span className="text-white font-semibold">{weapon.A}</span>
                </p>
                {options.modelsFiring > 1 && (
                  <p className="text-xs text-gray-400">
                    ({options.modelsFiring} models firing)
                  </p>
                )}
                <p className="border-t border-gray-600 pt-2 mt-2">
                  <span className="text-gray-400">Total attacks:</span>{' '}
                  <span className="text-white font-semibold text-lg">{summary.totalAttacks}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attack Phase Card (skip for Torrent) */}
      {!keywords.torrent && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <h4 className="font-semibold text-red-400 px-4 py-3 bg-gray-900">ATTACK PHASE</h4>
          <div className="flex">
            {/* Dice (1/3) */}
            <div className="w-1/3 p-4 space-y-2">
              <DiceDisplay
                rolls={attackPhase.attackRolls}
                successIndices={attackPhase.hits}
                criticalIndices={attackPhase.criticalHits}
                sustainedHitsIndices={keywords.sustainedHitsValue ? attackPhase.criticalHits : []}
              />

              {/* Lethal Hits auto-wounds */}
              {attackPhase.lethalHits.length > 0 && (
                <AutoHitsDisplay
                  count={attackPhase.lethalHits.length}
                />
              )}
            </div>

            {/* Text (2/3) */}
            <div className="w-2/3 p-4 border-l border-gray-700">
            <div className="text-sm space-y-1">
              <p>
                <span className="text-gray-400">Total Attacks:</span>{' '}
                <span className="text-white font-semibold">{summary.totalAttacks}</span>
              </p>

              {options.modelsFiring > 1 && (
                <p className="text-xs text-gray-400">
                  ({options.modelsFiring} models firing)
                </p>
              )}

              {keywords.rapidFireValue && options.withinHalfRange && (
                <p className="text-xs text-gray-400">
                  (+{keywords.rapidFireValue * options.modelsFiring} from Rapid Fire {keywords.rapidFireValue})
                </p>
              )}

              {options.blastBonusAttacks > 0 && (
                <p className="text-xs text-gray-400">
                  (+{options.blastBonusAttacks} from Blast)
                </p>
              )}

              <p>
                <span className="text-gray-400">Hit on:</span>{' '}
                {/* Show EFFECTIVE hit value (after applying modifiers) */}
                <span className="text-white">
                  {getEffectiveHitValue(weapon.WS, hitModifier).display}
                </span>
                {(() => {
                  const sources = formatModifierSources(modifierSources?.hit || [], activeRules);
                  const display = formatModifierDisplay(hitModifier, sources);
                  return display ? (
                    <span className="text-purple-400 font-semibold ml-2">
                      ({display})
                    </span>
                  ) : null;
                })()}
              </p>

              {keywords.heavy && options.unitRemainedStationary && (
                <p className="text-xs text-gray-400 italic">
                  (+1 to hit from Heavy, remained stationary)
                </p>
              )}

              {keywords.sustainedHitsValue && (
                <p className="text-xs text-gray-400 italic">
                  (Sustained Hits {keywords.sustainedHitsValue})
                </p>
              )}

              {keywords.lethalHits && (
                <p className="text-xs text-gray-400 italic">
                  (Lethal Hits)
                </p>
              )}

              {keywords.torrent && (
                <p className="text-xs text-gray-400 italic">
                  (Torrent: auto-hit)
                </p>
              )}
            </div>

            <div className="border-t border-gray-600 pt-2 mt-2">
              <p className="font-semibold mb-1">
                <span className="text-green-400 font-bold">{summary.totalHits} hits</span>
              </p>
              {(() => {
                const regularHits = attackPhase.hits.length - attackPhase.criticalHits.length;
                return (
                  <>
                    {regularHits > 0 && (
                      <p className="text-sm ml-2">
                        • <span className="text-green-400">{regularHits} regular hit{regularHits !== 1 ? 's' : ''}</span>
                      </p>
                    )}
                    {attackPhase.criticalHits.length > 0 && (
                      <p className="text-sm ml-2">
                        • <span className="text-green-300">{attackPhase.criticalHits.length} critical hit{attackPhase.criticalHits.length !== 1 ? 's' : ''}</span>
                      </p>
                    )}
                    {summary.sustainedHitsBonus > 0 && (
                      <p className="text-sm ml-2">
                        • <span className="text-green-300">{summary.sustainedHitsBonus} extra hit{summary.sustainedHitsBonus !== 1 ? 's' : ''}</span>{' '}
                        <span className="text-xs text-gray-400">(sustained hits)</span>
                      </p>
                    )}
                    {attackPhase.lethalHits.length > 0 && (
                      <p className="text-sm ml-2">
                        • <span className="text-green-300">{attackPhase.lethalHits.length} lethal hit{attackPhase.lethalHits.length !== 1 ? 's' : ''}</span>{' '}
                        <span className="text-xs text-gray-400">(auto-wound)</span>
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Wound Phase Card */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <h4 className="font-semibold text-red-400 px-4 py-3 bg-gray-900">WOUND PHASE</h4>
        <div className="flex">
          {/* Dice (1/3) */}
          <div className="w-1/3 p-4">
            {woundPhase.woundRolls.length > 0 && (
              <DiceDisplay
                rolls={woundPhase.woundRolls}
                successIndices={woundPhase.wounds
                  .filter(i => !woundPhase.lethalWounds.includes(i))
                  .map(i => i - woundPhase.lethalWounds.length)}
                criticalIndices={woundPhase.criticalWounds
                  .filter(i => !woundPhase.lethalWounds.includes(i))
                  .map(i => i - woundPhase.lethalWounds.length)}
              />
            )}
          </div>

          {/* Text (2/3) */}
          <div className="w-2/3 p-4 border-l border-gray-700">

            <div className="text-sm space-y-1">
              <p>
                <span className="text-gray-400">Wounds rolled:</span>{' '}
                <span className="text-white">{woundPhase.woundRolls.length}</span>
              </p>

              <p>
                <span className="text-gray-400">Wound on:</span>{' '}
                <span className="text-white">
                  {getEffectiveWoundValue(
                    weapon.S,
                    target.T,
                    woundModifier,
                    keywords.lance || false,
                    options.unitHasCharged || false
                  ).display}
                </span>
                {(() => {
                  const sources = formatModifierSources(modifierSources?.wound || [], activeRules);
                  const display = formatModifierDisplay(woundModifier, sources);
                  return display ? (
                    <span className="text-purple-400 font-semibold ml-2">
                      ({display})
                    </span>
                  ) : null;
                })()}
                <span className="text-xs text-gray-400"> (S{weapon.S} vs T{target.T})</span>
              </p>

              {keywords.lance && options.unitHasCharged && (
                <p className="text-xs text-gray-400 italic">
                  (+1 to wound from Lance, unit charged)
                </p>
              )}

              {keywords.twinLinked && (
                <p className="text-xs text-gray-400 italic">
                  (Twin-Linked: reroll failures)
                </p>
              )}

              {keywords.antiXCategory && keywords.antiXThreshold && (
                <p className="text-xs text-gray-400 italic">
                  (Anti-{keywords.antiXCategory} {keywords.antiXThreshold}+: critical wounds)
                </p>
              )}
            </div>

            <div className="border-t border-gray-600 pt-2 mt-2">
              <p className="font-semibold">
                <span className="text-gray-400">Results:</span>
              </p>
              {attackPhase.lethalHits.length > 0 && (
                <p>
                  • <span className="text-green-300">{attackPhase.lethalHits.length} auto-wounds</span>{' '}
                  <span className="text-xs text-gray-400">(Lethal Hits)</span>
                </p>
              )}
              <p>
                • <span className="text-green-400">{summary.totalWounds} total wounds</span>{' '}
                <span className="text-gray-400">({woundPercentage}%)</span>
              </p>
              {summary.rerolledWounds > 0 && (
                <p>
                  • <span className="text-blue-400">{summary.rerolledWounds} rerolled</span>{' '}
                  <span className="text-xs text-gray-400">(Twin-Linked)</span>
                </p>
              )}
              {woundPhase.criticalWounds.length > 0 && (
                <p>
                  • <span className="text-green-300">{woundPhase.criticalWounds.length} critical wounds</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Phase Card */}
      {showSavePhase && savePhase && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <h4 className="font-semibold text-red-400 px-4 py-3 bg-gray-900">SAVE PHASE</h4>
          <div className="flex">
            {/* Dice (1/3) */}
            <div className="w-1/3 p-4">
              <DiceDisplay
                rolls={savePhase.saveRolls}
                successIndices={savePhase.saveRolls
                  .map((_, i) => i)
                  .filter(i => !savePhase.failedSaves.includes(i))}
              />
            </div>

            {/* Text (2/3) */}
            <div className="w-2/3 p-4 border-l border-gray-700">

              <div className="text-sm space-y-1">
                <p>
                  <span className="text-gray-400">Saves rolled:</span>{' '}
                  <span className="text-white">{savePhase.saveRolls.length}</span>
                </p>

                <p>
                  <span className="text-gray-400">Save on:</span>{' '}
                  <span className="text-white">
                    {(() => {
                      const modifiedSave = target.SV - weapon.AP;
                      const usingInvuln = target.INV && (target.INV < modifiedSave || modifiedSave <= 1);
                      if (usingInvuln) {
                        return `${target.INV}+ (invuln)`;
                      }
                      if (modifiedSave <= 1) {
                        return 'No save';
                      }
                      return `${modifiedSave}+`;
                    })()}
                  </span>
                  <span className="text-xs text-gray-400">
                    {' '}({target.SV}+ save, {Math.abs(weapon.AP)} AP)
                  </span>
                </p>

                <p>
                  <span className="text-gray-400">Damage per wound:</span>{' '}
                  <span className="text-white">{weapon.D}</span>
                  {keywords.meltaValue && options.withinHalfRange && (
                    <span className="text-xs text-gray-400">
                      {' '}(+{keywords.meltaValue} from Melta)
                    </span>
                  )}
                </p>
              </div>

              <div className="border-t border-gray-600 pt-2 mt-2">
                <p className="font-semibold">
                  <span className="text-gray-400">Results:</span>
                </p>
                <p>
                  • <span className="text-red-400">{summary.failedSaves} failed saves</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Damage Phase Card (only for variable damage) */}
      {showSavePhase && savePhase && savePhase.damageRolls && savePhase.damageRolls.length > 0 && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <h4 className="font-semibold text-red-400 px-4 py-3 bg-gray-900">DAMAGE PHASE</h4>
          <div className="flex">
            {/* Dice (1/3) */}
            <div className="w-1/3 p-4">
              <div className="flex flex-wrap gap-1">
                {savePhase.damageRolls.map((roll, index) => (
                  <Die
                    key={index}
                    value={roll.value}
                    type="miss"
                    size={20}
                    sides={roll.sides}
                  />
                ))}
              </div>
            </div>

            {/* Text (2/3) */}
            <div className="w-2/3 p-4 border-l border-gray-700">
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-gray-400">Failed saves:</span>{' '}
                  <span className="text-white">{summary.failedSaves}</span>
                </p>
                <p>
                  <span className="text-gray-400">Damage characteristic:</span>{' '}
                  <span className="text-white">{weapon.D}</span>
                  {keywords.meltaValue && options.withinHalfRange && (
                    <span className="text-xs text-gray-400">
                      {' '}(+{keywords.meltaValue} from Melta)
                    </span>
                  )}
                </p>
              </div>

              <div className="border-t border-gray-600 pt-2 mt-2">
                <p className="text-xl font-bold">
                  <span className="text-red-500">TOTAL DAMAGE: {summary.totalDamage}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Total Damage (for fixed damage, show after save phase) */}
      {showSavePhase && savePhase && (!savePhase.damageRolls || savePhase.damageRolls.length === 0) && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-4">
            <p className="text-xl font-bold text-center">
              <span className="text-red-500">TOTAL DAMAGE: {summary.totalDamage}</span>
            </p>
            <p className="text-xs text-gray-400 text-center mt-2">
              {summary.failedSaves} failed saves × {weapon.D}
              {keywords.meltaValue && options.withinHalfRange && ` (+${keywords.meltaValue} Melta)`} damage
            </p>
          </div>
        </div>
      )}

      {/* Direct Damage (when saves are impossible and damage is fixed) */}
      {shouldShowDirectDamage && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-4">
            <div className="text-sm space-y-1 mb-3">
              <p>
                <span className="text-gray-400">Wounds inflicted:</span>{' '}
                <span className="text-white font-semibold">{summary.totalWounds}</span>
              </p>
              <p>
                <span className="text-gray-400">Save required:</span>{' '}
                <span className="text-white">No save possible</span>
                <span className="text-xs text-gray-400">
                  {' '}({target.SV}+ save, {Math.abs(weapon.AP)} AP)
                </span>
              </p>
              <p>
                <span className="text-gray-400">Damage per wound:</span>{' '}
                <span className="text-white font-semibold">{weapon.D}</span>
                {keywords.meltaValue && options.withinHalfRange && (
                  <span className="text-xs text-gray-400">
                    {' '}(+{keywords.meltaValue} from Melta)
                  </span>
                )}
              </p>
            </div>
            <div className="border-t border-gray-600 pt-3">
              <p className="text-xl font-bold text-center">
                <span className="text-red-500">TOTAL DAMAGE: {directTotalDamage}</span>
              </p>
              <p className="text-xs text-gray-400 text-center mt-2">
                {summary.totalWounds} wounds × {weapon.D}
                {keywords.meltaValue && options.withinHalfRange && ` (+${keywords.meltaValue} Melta)`} damage
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Save Information (before rolling) - only show if saves are possible OR damage is variable */}
      {!showSavePhase && !shouldShowDirectDamage && summary.totalWounds > 0 && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <h4 className="font-semibold text-red-400 px-4 py-3 bg-gray-900">SAVE INFORMATION</h4>
          <div className="flex">
            {/* Empty dice column for alignment */}
            <div className="w-1/3 p-4"></div>

            {/* Text (2/3) */}
            <div className="w-2/3 p-4 border-l border-gray-700">
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-gray-400">Wounds to save:</span>{' '}
                  <span className="text-white font-semibold">{summary.totalWounds}</span>
                </p>

                <p>
                  <span className="text-gray-400">Save on:</span>{' '}
                  <span className="text-white">
                    {(() => {
                      if (usingInvuln) {
                        return `${target.INV}+ (invuln)`;
                      }
                      if (modifiedSave <= 1) {
                        return 'No save';
                      }
                      return `${modifiedSave}+`;
                    })()}
                  </span>
                  <span className="text-xs text-gray-400">
                    {' '}({target.SV}+ save, {Math.abs(weapon.AP)} AP)
                  </span>
                </p>

                <p>
                  <span className="text-gray-400">Damage per failed save:</span>{' '}
                  <span className="text-white font-semibold">{weapon.D}</span>
                  {keywords.meltaValue && options.withinHalfRange && (
                    <span className="text-xs text-gray-400">
                      {' '}(+{keywords.meltaValue} from Melta)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roll Saves Button - only show if saves are possible OR damage is variable */}
      {!showSavePhase && !shouldShowDirectDamage && onRollSaves && summary.totalWounds > 0 && (
        <button
          onClick={onRollSaves}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Roll Saves
        </button>
      )}

      {/* Active Rules - moved to bottom with subtle styling */}
      {activeRules.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <ActiveRulesDisplay rules={activeRules} />
        </div>
      )}
    </div>
  );
}
