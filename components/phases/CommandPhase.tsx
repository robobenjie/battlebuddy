'use client';

import { useEffect, useRef, useState } from 'react';
import { db } from '../../lib/db';

interface CommandPhaseProps {
  gameId: string;
  army: {
    id: string;
    name: string;
    unitIds?: string[];
  };
  currentPlayer: {
    id: string;
    userId: string;
    name: string;
  };
  currentUser: any;
  game: {
    currentTurn: number;
    currentPhase: string;
  };
  players: any[]; // Add players as a prop instead of querying
}

export default function CommandPhase({ gameId, army, currentPlayer, currentUser, game, players }: CommandPhaseProps) {
  const renderCount = useRef(0);
  const lastUpdateTime = useRef<number | null>(null);

  // Optimistic UI state - tracks pending updates
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, { victoryPoints?: number; commandPoints?: number }>>({});

  // Track renders and data changes
  useEffect(() => {
    renderCount.current += 1;
    const now = performance.now();

    if (lastUpdateTime.current !== null) {
      const timeSinceLastUpdate = now - lastUpdateTime.current;
      console.log(`[CommandPhase] Re-render #${renderCount.current} - ${timeSinceLastUpdate.toFixed(2)}ms since last update`);
      console.log('[CommandPhase] Current players data:', players.map(p => ({ id: p.id, VP: p.victoryPoints, CP: p.commandPoints })));
    } else {
      console.log(`[CommandPhase] Initial render #${renderCount.current}`);
    }

    lastUpdateTime.current = now;
  }, [players]);

  // Clear optimistic updates when real data arrives
  useEffect(() => {
    setOptimisticUpdates({});
  }, [players]);

  const updatePoints = (playerId: string, field: 'victoryPoints' | 'commandPoints', delta: number) => {
    console.time(`updatePoints-${field}`);
    const t0 = performance.now();

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const currentValue = player[field] || 0;
    const newValue = currentValue + delta;

    // Don't allow going below 0
    if (newValue < 0) return;

    const t1 = performance.now();
    console.log(`[updatePoints] Prep time: ${(t1 - t0).toFixed(2)}ms`);

    // Immediately update optimistic UI
    setOptimisticUpdates(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: newValue
      }
    }));

    // Schedule the transaction asynchronously to not block the UI
    setTimeout(() => {
      const t2 = performance.now();
      db.transact(
        db.tx.players[playerId].update({
          [field]: newValue
        })
      );
      const t3 = performance.now();
      console.log(`[updatePoints] Transact call time (async): ${(t3 - t2).toFixed(2)}ms`);
    }, 0);

    const t2 = performance.now();
    console.log(`[updatePoints] Handler time (before async): ${(t2 - t1).toFixed(2)}ms`);
    console.log(`[updatePoints] Total handler time: ${(t2 - t0).toFixed(2)}ms`);
    console.timeEnd(`updatePoints-${field}`);
  };

  // Get display value - use optimistic value if available, otherwise use real data
  const getPlayerValue = (player: any, field: 'victoryPoints' | 'commandPoints') => {
    const optimistic = optimisticUpdates[player.id]?.[field];
    return optimistic !== undefined ? optimistic : (player[field] || 0);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Command Phase</h2>
        <p className="text-gray-400 text-sm">
          Manage Victory Points and Command Points for all players.
        </p>
      </div>

      {/* Player Score Tracking */}
      <div className="space-y-4">
        {players.map((player) => (
          <div key={player.id} className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">{player.name}</h3>

            <div className="grid grid-cols-2 gap-6">
              {/* Victory Points */}
              <div>
                <div className="text-sm text-gray-400 mb-2">Victory Points</div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => updatePoints(player.id, 'victoryPoints', -1)}
                    disabled={getPlayerValue(player, 'victoryPoints') === 0}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold w-10 h-10 rounded-lg transition-colors"
                  >
                    −
                  </button>
                  <div className="text-3xl font-bold text-white min-w-[60px] text-center">
                    {getPlayerValue(player, 'victoryPoints')}
                  </div>
                  <button
                    onClick={() => updatePoints(player.id, 'victoryPoints', 1)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold w-10 h-10 rounded-lg transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Command Points */}
              <div>
                <div className="text-sm text-gray-400 mb-2">Command Points</div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => updatePoints(player.id, 'commandPoints', -1)}
                    disabled={getPlayerValue(player, 'commandPoints') === 0}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold w-10 h-10 rounded-lg transition-colors"
                  >
                    −
                  </button>
                  <div className="text-3xl font-bold text-white min-w-[60px] text-center">
                    {getPlayerValue(player, 'commandPoints')}
                  </div>
                  <button
                    onClick={() => updatePoints(player.id, 'commandPoints', 1)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold w-10 h-10 rounded-lg transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 