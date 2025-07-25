'use client';

import { useState } from 'react';
import { db } from '../lib/db';
import { useRouter } from 'next/navigation';
import HamburgerMenu from './HamburgerMenu';
import Sidebar from './Sidebar';
import ViewArmiesPage from './ViewArmiesPage';
import ArmyDetailPage from './ArmyDetailPage';
import { CurrentGames } from './CurrentGamesPage';

interface AuthenticatedAppProps {
  user: any;
}

export default function AuthenticatedApp({ user }: AuthenticatedAppProps) {
  const [gameCode, setGameCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedArmyId, setSelectedArmyId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  // Query games and players for join validation
  const { data: gameData } = db.useQuery({ games: {} });
  const { data: playerData } = db.useQuery({ players: {} });
  const games = gameData?.games || [];
  const players = playerData?.players || [];

  // Check if current game code is valid
  const currentGame = gameCode.length === 5 ? games.find((g: any) => g.code === gameCode) : null;
  const isValidGameCode = currentGame && currentGame.status === 'waiting';
  const isUserAlreadyInGame = currentGame ? players.some((p: any) => 
    p.gameId === currentGame.id && p.userId === user.id
  ) : false;

  // Generate a random 5-digit code
  const generateGameCode = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  // Navigation handlers
  const handleNavigation = (page: string) => {
    setCurrentPage(page);
    setSelectedArmyId(null); // Clear selected army when navigating to other pages
  };

  const handleNavigateToArmy = (armyId: string) => {
    setSelectedArmyId(armyId);
    setCurrentPage('army-detail');
  };

  const handleBackToArmies = () => {
    setSelectedArmyId(null);
    setCurrentPage('view-armies');
  };

  const handleLogout = () => {
    db.auth.signOut();
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const createGame = async () => {
    setIsCreating(true);
    try {
      const code = generateGameCode();
      const gameId = crypto.randomUUID();
      const playerId = crypto.randomUUID();
      
      // Create the game with all required fields
      await db.transact([
        db.tx.games[gameId].update({
          code,
          name: `Game ${code}`,
          status: 'waiting',
          createdAt: Date.now(),
          hostId: user.id,
          currentTurn: 0, // Will be set to 1 when game starts
          currentPhase: 'waiting', // Will be set to 'command' when game starts
          playerIds: [playerId], // Array of player IDs
          phaseHistory: [], // Empty array initially
        })
      ]);

      // Add the host as a player
      await db.transact([
        db.tx.players[playerId].update({
          userId: user.id,
          name: user.email || 'Anonymous',
          gameId: gameId,
          isHost: true,
        })
      ]);

      router.push(`/game/${code}`);
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const joinGame = async () => {
    if (!gameCode || gameCode.length !== 5) {
      alert('Please enter a valid 5-digit game code.');
      return;
    }

    setIsJoining(true);
    try {
      const targetGame = games.find((g: any) => g.code === gameCode);
      
      if (!targetGame) {
        alert('Game not found. Please check the code and try again.');
        setIsJoining(false);
        return;
      }

      if (targetGame.status !== 'waiting') {
        alert('This game is no longer accepting new players.');
        setIsJoining(false);
        return;
      }

      // Check if user is already in this game
      const alreadyJoined = players.some((p: any) => 
        p.gameId === targetGame.id && p.userId === user.id
      );

      if (alreadyJoined) {
        // User is already in the game, just navigate there
        router.push(`/game/${gameCode}`);
        return;
      }

      // Add player to the game using the actual game ID
      await db.transact([
        db.tx.players[crypto.randomUUID()].update({
          userId: user.id,
          name: user.email || 'Anonymous',
          gameId: targetGame.id,
          isHost: false, // Player joining is not the host
        })
      ]);

      router.push(`/game/${gameCode}`);
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Failed to join game. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  // Render current page content
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'view-armies':
        return <ViewArmiesPage user={user} onNavigateToArmy={handleNavigateToArmy} />;
      case 'army-detail':
        return selectedArmyId ? (
          <ArmyDetailPage 
            armyId={selectedArmyId} 
            user={user} 
            onBack={handleBackToArmies} 
          />
        ) : (
          <ViewArmiesPage user={user} onNavigateToArmy={handleNavigateToArmy} />
        );
      case 'current-games':
        return <CurrentGames user={user} />;
      case 'home':
      default:
        // Query games and players for the current user
        const userGames = games.filter((game: any) => {
          const gameStatus = game.status === 'waiting' || game.status === 'active';
          const isUserInGame = players.some((player: any) => player.gameId === game.id && player.userId === user.id);
          return gameStatus && isUserInGame;
        });
        return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8 pt-20">
            <div className="max-w-md w-full space-y-8">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-red-500 mb-2">BattleBuddy</h1>
                <h2 className="text-2xl font-semibold text-gray-300 mb-8">Warhammer 40k Companion</h2>
                <p className="text-gray-400 mb-8">Welcome, {user.email}!</p>
              </div>

              {/* Unified New Game Box */}
              <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 flex flex-col items-center space-y-6">
                <div className="w-full text-center">
                  <h3 className="text-2xl font-semibold text-white mb-6">New Game</h3>
                </div>
                <div className="w-full flex flex-row items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Enter 5-digit code"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    maxLength={5}
                  />
                  <button
                    onClick={joinGame}
                    disabled={isJoining || gameCode.length !== 5}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    {isJoining ? 'Joining...' : 'Join Game'}
                  </button>
                </div>
                <button
                  onClick={createGame}
                  disabled={isCreating}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors mt-2"
                >
                  {isCreating ? 'Creating...' : 'Create Game'}
                </button>
                
              </div>
            {/* Current Games List (embedded) */}
              {userGames.length > 0 && (
                <div className="pt-4 w-full">
                  <CurrentGames user={user} embedded={true} />
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hamburger Menu */}
      <HamburgerMenu isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentPage={currentPage}
        onNavigate={handleNavigation}
        onLogout={handleLogout}
      />
      
      {/* Page Content */}
      {renderCurrentPage()}
    </div>
  );
} 