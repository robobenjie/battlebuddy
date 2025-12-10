'use client';

import { db } from '../../lib/db';

interface ChooseFirstPlayerPhaseProps {
  gameId: string;
  game: {
    id: string;
    currentTurn: number;
  };
  players: Array<{
    id: string;
    userId: string;
    name: string;
    armyId?: string;
  }>;
}

export default function ChooseFirstPlayerPhase({ gameId, game, players }: ChooseFirstPlayerPhaseProps) {
  // Query armies for this game to get army names
  const { data: armiesData } = db.useQuery({
    armies: {
      $: {
        where: {
          gameId: gameId
        }
      }
    }
  });

  const armies = armiesData?.armies || [];

  const selectFirstPlayer = async (playerId: string) => {
    try {
      await db.transact([
        db.tx.games[gameId].update({
          currentPhase: 'command',
          activePlayerId: playerId
        })
      ]);
    } catch (error) {
      console.error('Error selecting first player:', error);
    }
  };

  // Get army name for a player
  const getArmyName = (player: any) => {
    const army = armies.find((a: any) => a.ownerId === player.userId);
    return army?.name || player.name;
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-red-500 mb-4">Who Goes First?</h1>
          <p className="text-gray-400 text-xl">Select which army takes the first turn</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {players.map((player) => {
            const armyName = getArmyName(player);
            return (
              <button
                key={player.id}
                onClick={() => selectFirstPlayer(player.id)}
                className="bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 hover:border-red-500 rounded-xl p-12 transition-all transform hover:scale-105 active:scale-95"
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">⚔️</div>
                  <h2 className="text-3xl font-bold text-white mb-2">{armyName}</h2>
                  <p className="text-gray-400 text-sm">{player.name}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
