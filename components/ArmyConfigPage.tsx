'use client';

import { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { id } from '@instantdb/react';
import { getUnitDisplayName } from '../lib/unit-utils';
import ArmyChoiceSelector from './ui/ArmyChoiceSelector';
import { Rule, ChoiceRuleType } from '../lib/rules-engine/types';
import { getPendingStartOfBattleChoiceRules } from '../lib/command-choice-utils';

interface ArmyConfigPageProps {
  gameId: string;
  armyId: string;
  currentUserId: string;
}

export default function ArmyConfigPage({ gameId, armyId, currentUserId }: ArmyConfigPageProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingStartChoices, setPendingStartChoices] = useState<Record<string, string>>({});

  // Query units with leaders relationship loaded
  const { data: unitsData } = db.useQuery({
    units: {
      leaders: {}, // Load attached leaders
      unitRules: {},
      models: {
        modelRules: {},
      },
      $: {
        where: {
          armyId: armyId
        }
      }
    }
  });

  // Query players to check ready status
  const { data: playersData } = db.useQuery({
    players: {
      $: {
        where: {
          gameId: gameId
        }
      }
    }
  });

  // Query game to check/update status
  const { data: gameData } = db.useQuery({
    games: {
      $: {
        where: {
          id: gameId
        }
      }
    }
  });

  const { data: armyRulesData } = db.useQuery({
    armies: {
      states: {},
      armyRules: {},
      $: {
        where: {
          id: armyId
        }
      }
    }
  });

  const players = playersData?.players || [];
  const game = gameData?.games?.[0];
  const armyRecord = armyRulesData?.armies?.[0];
  const armyStates = armyRecord?.states || [];
  const currentPlayer = players.find(p => p.userId === currentUserId);
  const isCurrentPlayerReady = currentPlayer?.configReady || false;

  // Check if all players are ready
  const allPlayersReady = players.length > 0 && players.every(p => p.configReady);

  // Auto-advance when all players are ready
  useEffect(() => {
    if (allPlayersReady && game && game.status === 'army-config') {
      // Advance to choose-first-player
      db.transact([
        db.tx.games[gameId].update({
          status: 'active',
          currentPhase: 'choose-first-player',
        })
      ]);
    }
  }, [allPlayersReady, game, gameId]);

  const allUnits = unitsData?.units || [];

  const parseRuleObject = (ruleObject?: string): Rule[] => {
    if (!ruleObject) return [];
    try {
      const parsed = JSON.parse(ruleObject);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      console.error('Failed to parse rule object:', e);
      return [];
    }
  };

  const linkedArmyRules: Rule[] = (armyRecord?.armyRules || [])
    .flatMap((ruleData: any) => parseRuleObject(ruleData.ruleObject))
    .filter((r: Rule | null): r is Rule => r !== null);

  const unitLinkedArmyScopeRules: Rule[] = allUnits
    .flatMap((unit: any) => unit.unitRules || [])
    .flatMap((ruleData: any) => parseRuleObject(ruleData.ruleObject))
    .filter((r: Rule | null): r is Rule => r !== null)
    .filter((rule: Rule) => rule.scope === 'army');

  const modelLinkedArmyScopeRules: Rule[] = allUnits
    .flatMap((unit: any) => unit.models || [])
    .flatMap((model: any) => model.modelRules || [])
    .flatMap((ruleData: any) => parseRuleObject(ruleData.ruleObject))
    .filter((r: Rule | null): r is Rule => r !== null)
    .filter((rule: Rule) => rule.scope === 'army');

  const armyRulesById = new Map<string, Rule>();
  for (const rule of [...linkedArmyRules, ...unitLinkedArmyScopeRules, ...modelLinkedArmyScopeRules]) {
    armyRulesById.set(rule.id, rule);
  }
  const armyRules = Array.from(armyRulesById.values());
  const startOfBattleChoiceRules: ChoiceRuleType[] = getPendingStartOfBattleChoiceRules(
    armyRules,
    armyStates as any
  );

  useEffect(() => {
    if (startOfBattleChoiceRules.length === 0) return;

    setPendingStartChoices((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const rule of startOfBattleChoiceRules) {
        const choiceId = rule.choice.id;
        if (next[choiceId]) continue;

        const existingState = armyStates.find((s: any) => s.state === choiceId);
        if (existingState?.choiceValue) {
          next[choiceId] = existingState.choiceValue;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [startOfBattleChoiceRules, armyStates]);

  const hasAllStartChoicesSelected = startOfBattleChoiceRules.every(
    (rule) => !!pendingStartChoices[rule.choice.id]
  );

  // Identify CHARACTER units and non-CHARACTER units
  const characterUnits = allUnits.filter((unit: any) =>
    unit.categories && Array.isArray(unit.categories) &&
    unit.categories.some((cat: string) => cat.toLowerCase() === 'character')
  );

  const bodyguardUnits = allUnits.filter((unit: any) =>
    !unit.categories || !Array.isArray(unit.categories) ||
    !unit.categories.some((cat: string) => cat.toLowerCase() === 'character')
  );

  // Get current attachment for a CHARACTER
  const getCurrentAttachment = (characterId: string): string | null => {
    // Find which bodyguard unit this character is attached to
    const attachedTo = bodyguardUnits.find((unit: any) =>
      unit.leaders && Array.isArray(unit.leaders) &&
      unit.leaders.some((leader: any) => leader.id === characterId)
    );
    return attachedTo ? attachedTo.id : null;
  };

  // Handle attaching/detaching a CHARACTER to a bodyguard unit
  const handleAttachment = async (characterId: string, bodyguardUnitId: string | null) => {
    setIsProcessing(true);
    try {
      const character = characterUnits.find((u: any) => u.id === characterId);
      if (!character) return;

      // Remove from previous attachment if any
      const currentAttachment = getCurrentAttachment(characterId);

      const transactions = [];

      // If currently attached somewhere, remove that link
      if (currentAttachment) {
        transactions.push(
          db.tx.units[currentAttachment].unlink({ leaders: characterId })
        );
      }

      // If selecting a new bodyguard unit (not "None"), create the link
      if (bodyguardUnitId) {
        transactions.push(
          db.tx.units[bodyguardUnitId].link({ leaders: characterId })
        );
      }

      if (transactions.length > 0) {
        await db.transact(transactions);
      }
    } catch (error) {
      console.error('Error updating leader attachment:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Mark current player as ready
  const markReady = async () => {
    if (!currentPlayer) return;
    if (!hasAllStartChoicesSelected) return;

    setIsProcessing(true);
    try {
      const txs: any[] = [];

      for (const rule of startOfBattleChoiceRules) {
        const selectedValue = pendingStartChoices[rule.choice.id];
        if (!selectedValue) continue;

        const existingState = armyStates.find((s: any) => s.state === rule.choice.id);
        if (existingState) {
          txs.push(
            db.tx.armyStates[existingState.id].update({
              choiceValue: selectedValue,
              activatedTurn: game?.currentTurn || 1,
            })
          );
        } else {
          txs.push(
            db.tx.armyStates[id()].update({
              state: rule.choice.id,
              choiceValue: selectedValue,
              activatedTurn: game?.currentTurn || 1,
            }).link({ army: armyId })
          );
        }
      }

      txs.push(
        db.tx.players[currentPlayer.id].update({
          configReady: true
        })
      );

      await db.transact(txs);
    } catch (error) {
      console.error('Error marking player as ready:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
          <h1 className="text-3xl font-bold text-red-500 mb-2">Army Configuration</h1>
          <p className="text-gray-400 mb-4">
            Attach CHARACTER units to bodyguard units. Characters provide their abilities to the units they lead.
          </p>

          {/* Ready Button */}
          {!isCurrentPlayerReady ? (
            <button
              onClick={markReady}
              disabled={isProcessing || !hasAllStartChoicesSelected}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              I'm Ready
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="bg-green-700 text-white font-semibold py-2 px-6 rounded-lg">
                ✓ Ready
              </div>
              <p className="text-gray-400">Waiting for other players...</p>
            </div>
          )}
        </div>

        {/* Start of Battle Choices */}
        {startOfBattleChoiceRules.length > 0 && (
          <div className="space-y-4 mb-8">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-2">Declare Battle Formations</h2>
              <p className="text-gray-400 text-sm">
                Make any start-of-battle army choices before you mark ready.
              </p>
              {!hasAllStartChoicesSelected && !isCurrentPlayerReady && (
                <p className="text-amber-400 text-sm mt-2">
                  Select an option for each choice to enable &quot;I&apos;m Ready&quot;.
                </p>
              )}
            </div>
            {startOfBattleChoiceRules.map((rule) => {
              const existingState = armyStates.find((s: any) => s.state === rule.choice.id);
              return (
                <ArmyChoiceSelector
                  key={rule.id}
                  rule={rule}
                  currentSelection={pendingStartChoices[rule.choice.id] || existingState?.choiceValue}
                  onSelect={(optionValue) => {
                    setPendingStartChoices((prev) => ({
                      ...prev,
                      [rule.choice.id]: optionValue,
                    }));
                  }}
                  disabled={isCurrentPlayerReady}
                />
              );
            })}
          </div>
        )}

        {/* Player Status */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Player Status</h2>
          <div className="space-y-2">
            {players.map((player) => (
              <div key={player.id} className="flex items-center justify-between">
                <span className="text-white">{player.name}</span>
                {player.configReady ? (
                  <span className="text-green-400 text-sm">✓ Ready</span>
                ) : (
                  <span className="text-gray-500 text-sm">Configuring...</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CHARACTER Attachments */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Attach Leaders</h2>

          {characterUnits.length === 0 ? (
            <p className="text-gray-400 text-sm">No CHARACTER units in this army.</p>
          ) : (
            <div className="space-y-4">
              {characterUnits.map((character: any) => {
                const currentAttachment = getCurrentAttachment(character.id);

                return (
                  <div key={character.id} className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                    {/* Character name */}
                    <div className="flex-1">
                      <div className="text-white font-semibold">{character.nickname || character.name}</div>
                      <div className="text-gray-400 text-xs mt-1">CHARACTER</div>
                    </div>

                    {/* Attachment dropdown */}
                    <div className="flex items-center space-x-3">
                      <label className="text-gray-400 text-sm">Attach to:</label>
                      <select
                        value={currentAttachment || ''}
                        onChange={(e) => handleAttachment(character.id, e.target.value || null)}
                        disabled={isProcessing}
                        className="bg-gray-600 text-white border border-gray-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">None</option>
                        {bodyguardUnits.map((unit: any) => (
                          <option key={unit.id} value={unit.id}>
                            {getUnitDisplayName(unit)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bodyguard Units Summary */}
        {bodyguardUnits.length > 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mt-6">
            <h2 className="text-xl font-semibold text-white mb-4">Units</h2>
            <div className="space-y-2">
              {bodyguardUnits.map((unit: any) => {
                const displayName = getUnitDisplayName(unit);
                const hasLeaders = unit.leaders && unit.leaders.length > 0;

                return (
                  <div key={unit.id} className={`p-3 rounded ${hasLeaders ? 'bg-gray-700' : 'bg-gray-800'}`}>
                    <div className="text-white">{displayName}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
