'use client';

import { db } from '../../lib/db';
import { id } from '@instantdb/react';

interface CommandPhaseProps {
  gameId: string;
  army: {
    id: string;
    name: string;
    faction?: string;
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
  players: any[];
}

export default function CommandPhase({ gameId, army, currentPlayer, currentUser, game, players }: CommandPhaseProps) {
  // Query for army states to check if WAAAGH has been declared
  const { data: armyStatesData } = db.useQuery(
    army?.id ? {
      armyStates: {
        $: {
          where: {
            armyId: army.id,
            state: 'waaagh-active'
          }
        }
      }
    } : {}
  );

  const waaaghState = armyStatesData?.armyStates?.[0];
  const hasWaaagh = army?.faction?.toLowerCase() === 'orks';
  const waaaghAlreadyDeclared = !!waaaghState;
  const isCurrentPlayer = currentPlayer?.userId === currentUser?.id;

  const updatePoints = (playerId: string, field: 'victoryPoints' | 'commandPoints', delta: number) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const currentValue = player[field] || 0;
    const newValue = currentValue + delta;

    // Don't allow going below 0
    if (newValue < 0) return;

    db.transact(
      db.tx.players[playerId].update({
        [field]: newValue
      })
    );
  };

  const declareWaaagh = async () => {
    if (!army?.id) return;

    await db.transact([
      db.tx.armyStates[id()].update({
        armyId: army.id,
        state: 'waaagh-active',
        activatedTurn: game.currentTurn,
      })
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Command Phase</h2>
        <p className="text-gray-400 text-sm">
          Manage Victory Points and Command Points for all players.
        </p>
      </div>

      {/* WAAAGH Button */}
      {hasWaaagh && isCurrentPlayer && !waaaghAlreadyDeclared && (
        <button
          onClick={declareWaaagh}
          className="w-full bg-gradient-to-br from-green-700 via-green-600 to-green-800 hover:from-green-600 hover:via-green-500 hover:to-green-700 text-white font-black py-10 px-8 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-2xl uppercase tracking-wider border-4 border-green-400 font-skranji overflow-hidden"
        >
          <div className="text-2xl mb-1">DECLARE</div>
          <div className="text-[12vw] md:text-[8vw] lg:text-[6vw] whitespace-nowrap" style={{ lineHeight: '1' }}>WAAAGH!!!!</div>
        </button>
      )}

      {/* Show WAAAGH status if already declared */}
      {hasWaaagh && waaaghAlreadyDeclared && (
        <div className="bg-gradient-to-br from-green-700 via-green-600 to-green-800 rounded-2xl p-8 border-4 border-green-400 shadow-2xl overflow-hidden">
          <div className="text-center">
            <div className="text-white font-black text-[10vw] md:text-[6vw] lg:text-[4vw] mb-2 uppercase tracking-wider font-skranji">
              <div className="whitespace-nowrap">WAAAGH!</div>
              <div className="whitespace-nowrap">ACTIVE</div>
            </div>
            <p className="text-green-100 text-sm font-semibold">
              Declared in turn {waaaghState.activatedTurn}
            </p>
          </div>
        </div>
      )}

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