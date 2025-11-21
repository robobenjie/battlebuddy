'use client';

import { useEffect, useRef } from 'react';
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
  const lastClickTime = useRef<number | null>(null);

  // Log query structure for sandbox profiling (once on mount)
  useEffect(() => {
    console.log('📋 QUERY FOR SANDBOX (this query is in parent component):');
    console.log('db.useQuery({ players: { $: { where: { gameId: "' + gameId + '" } } } })');
  }, []);

  // Track renders and data changes
  useEffect(() => {
    renderCount.current += 1;
    const now = performance.now();

    if (lastUpdateTime.current !== null) {
      const timeSinceLastUpdate = now - lastUpdateTime.current;
      console.log(`[CommandPhase] Re-render #${renderCount.current} - ${timeSinceLastUpdate.toFixed(2)}ms since last update`);
      console.log('[CommandPhase] Current players data:', players.map(p => ({ id: p.id, VP: p.victoryPoints, CP: p.commandPoints })));

      // Log time from click to re-render
      if (lastClickTime.current !== null) {
        const clickToRenderTime = now - lastClickTime.current;
        console.log(`⏱️  CLICK TO RENDER: ${clickToRenderTime.toFixed(2)}ms`);
        lastClickTime.current = null; // Reset after logging
      }
    } else {
      console.log(`[CommandPhase] Initial render #${renderCount.current}`);
    }

    lastUpdateTime.current = now;
  }, [players]);

  const updatePoints = (playerId: string, field: 'victoryPoints' | 'commandPoints', delta: number) => {
    console.time(`updatePoints-${field}`);
    const t0 = performance.now();

    // Mark the start of this click for measuring to re-render
    lastClickTime.current = t0;

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const currentValue = player[field] || 0;
    const newValue = currentValue + delta;

    // Don't allow going below 0
    if (newValue < 0) return;

    const t1 = performance.now();
    console.log(`[updatePoints] Prep time: ${(t1 - t0).toFixed(2)}ms`);

    // Log the transaction for InstantDB sandbox profiling
    console.log('📋 TRANSACTION FOR SANDBOX:');
    console.log(`db.transact(db.tx.players["${playerId}"].update({ ${field}: ${newValue} }))`);

    // Just call transact directly - let InstantDB handle optimistic updates
    db.transact(
      db.tx.players[playerId].update({
        [field]: newValue
      })
    );

    const t2 = performance.now();
    console.log(`[updatePoints] Transact call time: ${(t2 - t1).toFixed(2)}ms`);
    console.log(`[updatePoints] Total handler time: ${(t2 - t0).toFixed(2)}ms`);
    console.timeEnd(`updatePoints-${field}`);
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
                    disabled={(player.victoryPoints || 0) === 0}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold w-10 h-10 rounded-lg transition-colors"
                  >
                    −
                  </button>
                  <div className="text-3xl font-bold text-white min-w-[60px] text-center">
                    {player.victoryPoints || 0}
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
                    disabled={(player.commandPoints || 0) === 0}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold w-10 h-10 rounded-lg transition-colors"
                  >
                    −
                  </button>
                  <div className="text-3xl font-bold text-white min-w-[60px] text-center">
                    {player.commandPoints || 0}
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