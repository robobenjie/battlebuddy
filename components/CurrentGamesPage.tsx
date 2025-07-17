'use client';

import { useState } from 'react';
import { db } from '../lib/db';
import { useRouter } from 'next/navigation';
import ConfirmationModal from './ConfirmationModal';

interface CurrentGamesPageProps {
  user: any;
}

interface CurrentGamesProps {
  user: any;
  embedded?: boolean;
}

export function CurrentGames({ user, embedded }: CurrentGamesProps) {
  const [deleteGameId, setDeleteGameId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data, isLoading } = db.useQuery({ games: {}, players: {} });
  const allGames = data?.games || [];
  const allPlayers = data?.players || [];
  const userGames = allGames.filter((game: any) => {
    const gameStatus = game.status === 'waiting' || game.status === 'active';
    const isUserInGame = allPlayers.some((player: any) => player.gameId === game.id && player.userId === user.id);
    return gameStatus && isUserInGame;
  });
  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };
  const getGamePlayers = (gameId: string) => allPlayers.filter((player: any) => player.gameId === gameId);
  const deleteGame = async (gameId: string) => {
    setIsDeleting(true);
    try {
      const gamePlayers = allPlayers.filter((p: any) => p.gameId === gameId);
      const transactions = [];
      gamePlayers.forEach(player => transactions.push(db.tx.players[player.id].delete()));
      transactions.push(db.tx.games[gameId].delete());
      await db.transact(transactions);
      setDeleteGameId(null);
    } catch (error) {
      console.error('Error deleting game:', error);
      alert('Failed to delete game. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  const router = useRouter();
  const navigateToGame = (gameCode: string) => router.push(`/game/${gameCode}`);
  if (isLoading) {
    return (
      <div className={embedded ? '' : 'min-h-screen bg-gray-900 p-4 pt-20'}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading games...</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={embedded ? '' : 'min-h-screen bg-gray-900 p-4 pt-20'}>
      <div className="max-w-4xl mx-auto">
        {!embedded && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-red-500 mb-2">Current Games</h1>
            <p className="text-gray-400">Your active and waiting games</p>
          </div>
        )}
        {userGames.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-300 mb-2">No Active Games</h2>
            <p className="text-gray-500 mb-4">You don't have any games in progress.</p>
            {!embedded && (
              <button
                onClick={() => router.push('/')}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Create New Game
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {userGames.map((game: any) => {
              const gamePlayers = getGamePlayers(game.id);
              const isHost = game.hostId === user.id;
              return (
                <div
                  key={game.id}
                  className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">
                          Game {game.code}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          game.status === 'active' 
                            ? 'bg-green-600 text-green-100'
                            : 'bg-yellow-600 text-yellow-100'
                        }`}>
                          {game.status === 'active' ? 'In Progress' : 'Waiting'}
                        </span>
                        {isHost && (
                          <span className="bg-blue-600 text-blue-100 px-2 py-1 rounded text-xs font-medium">
                            HOST
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-gray-400">
                        <div>
                          <span className="font-medium">Players:</span>{' '}
                          {gamePlayers.map((player: any, index: number) => (
                            <span key={player.id}>
                              {player.name}
                              {index < gamePlayers.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span>{' '}
                          {formatTimeAgo(game.createdAt)}
                        </div>
                        {game.status === 'active' && game.currentTurn && (
                          <div>
                            <span className="font-medium">Turn:</span>{' '}
                            {game.currentTurn}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => navigateToGame(game.code)}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        {game.status === 'active' ? 'Continue' : 'Join'}
                      </button>
                      {isHost && (
                        <button
                          onClick={() => setDeleteGameId(game.id)}
                          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {deleteGameId && (
          <ConfirmationModal
            isOpen={true}
            title="Delete Game"
            message="Are you sure you want to delete this game? This action cannot be undone and will remove the game for all players."
            onConfirm={() => deleteGame(deleteGameId)}
            onClose={() => setDeleteGameId(null)}
            confirmText="Delete Game"
            cancelText="Cancel"
            isLoading={isDeleting}
          />
        )}
      </div>
    </div>
  );
}

// Default export for full page
export default function CurrentGamesPage({ user }: CurrentGamesPageProps) {
  return <CurrentGames user={user} embedded={false} />;
} 