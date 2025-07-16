'use client';

import { db } from '../../../lib/db';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameCode = params.code as string;
  const { user } = db.useAuth();

  // Query for the game and its players
  const { data, isLoading, error } = db.useQuery({
    games: {},
    players: {}
  });

  // Filter games and players for this specific game code
  const games = data?.games || [];
  const allPlayers = data?.players || [];
  
  const game = games.find((g: any) => g.code === gameCode);
  const players = allPlayers.filter((p: any) => p.gameId === game?.id);

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Game Not Found</h1>
          <p className="text-gray-400 mb-4">The game with code {gameCode} could not be found.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const isHost = user?.id === game.hostId;

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-red-500">Game {gameCode}</h1>
              <p className="text-gray-400">Status: {game.status}</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Leave Game
            </button>
          </div>
          
          {isHost && game.status === 'waiting' && (
            <button
              onClick={async () => {
                await db.transact([
                  db.tx.games[game.id].update({ status: 'active' })
                ]);
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Start Game
            </button>
          )}
        </div>

        {/* Players */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Players ({players.length})</h2>
          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium">{player.name}</span>
                  {player.userId === game.hostId && (
                    <span className="bg-yellow-600 text-yellow-100 px-2 py-1 rounded text-xs font-medium">
                      HOST
                    </span>
                  )}
                  {player.userId === user?.id && (
                    <span className="bg-blue-600 text-blue-100 px-2 py-1 rounded text-xs font-medium">
                      YOU
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Status */}
        <div className="text-center">
          {game.status === 'waiting' ? (
            <div className="bg-yellow-800 border border-yellow-600 rounded-lg p-8">
              <h2 className="text-3xl font-bold text-yellow-400 mb-4">Waiting for Players</h2>
              <p className="text-yellow-200">
                Share the game code <span className="font-mono font-bold text-2xl">{gameCode}</span> with other players
              </p>
            </div>
          ) : (
            <div className="bg-red-800 border border-red-600 rounded-lg p-12">
              <h1 className="text-6xl font-bold text-red-400 mb-4">BATTLE!</h1>
              <p className="text-red-200 text-xl">
                The Emperor protects! May your dice roll true.
              </p>
              <div className="mt-8 text-sm text-red-300">
                <p>Game features coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 