'use client';

import { useState } from 'react';
import { db } from '../lib/db';
import { useRouter } from 'next/navigation';
import HamburgerMenu from './HamburgerMenu';
import Sidebar from './Sidebar';
import UploadArmyPage from './UploadArmyPage';
import ViewArmiesPage from './ViewArmiesPage';
import ArmyDetailPage from './ArmyDetailPage';

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
      
      // Create the game
      await db.transact([
        db.tx.games[gameId].update({
          code,
          name: `Game ${code}`,
          status: 'waiting',
          createdAt: Date.now(),
          hostId: user.id,
        })
      ]);

      // Add the host as a player
      await db.transact([
        db.tx.players[crypto.randomUUID()].update({
          userId: user.id,
          name: user.email || 'Anonymous',
          gameId: gameId,
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
      case 'upload-army':
        return <UploadArmyPage user={user} onSuccess={() => setCurrentPage('view-armies')} />;
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
      case 'home':
      default:
        return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8 pt-20">
            <div className="max-w-md w-full space-y-8">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-red-500 mb-2">BattleBuddy</h1>
                <h2 className="text-2xl font-semibold text-gray-300 mb-8">Warhammer 40k Companion</h2>
                <p className="text-gray-400 mb-8">Welcome, {user.email}!</p>
              </div>

              <div className="space-y-6">
                {/* Create Game */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4">Create New Game</h3>
                  <button
                    onClick={createGame}
                    disabled={isCreating}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    {isCreating ? 'Creating...' : 'Create Game'}
                  </button>
                </div>

                {/* Join Game */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4">Join Existing Game</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Enter 5-digit game code"
                      value={gameCode}
                      onChange={(e) => setGameCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                      maxLength={5}
                    />
                    <button
                      onClick={joinGame}
                      disabled={isJoining || gameCode.length !== 5}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      {isJoining ? 'Joining...' : 'Join Game'}
                    </button>
                  </div>
                </div>
              </div>
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