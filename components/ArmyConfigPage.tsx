'use client';

import { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { id } from '@instantdb/react';
import { getUnitDisplayName } from '../lib/unit-utils';

interface ArmyConfigPageProps {
  gameId: string;
  armyId: string;
  currentUserId: string;
}

export default function ArmyConfigPage({ gameId, armyId, currentUserId }: ArmyConfigPageProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Query units with leaders relationship loaded
  const { data: unitsData } = db.useQuery({
    units: {
      leaders: {}, // Load attached leaders
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

  const players = playersData?.players || [];
  const game = gameData?.games?.[0];
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
    setIsProcessing(true);
    try {
      await db.transact([
        db.tx.players[currentPlayer.id].update({
          configReady: true
        })
      ]);
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
              disabled={isProcessing}
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
