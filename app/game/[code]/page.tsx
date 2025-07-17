'use client';

import { db } from '../../../lib/db';
import { importArmyForGame } from '../../../lib/army-import';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import GamePhases from '../../../components/GamePhases';

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameCode = params.code as string;
  const { user } = db.useAuth();
  const [isStartingGame, setIsStartingGame] = useState(false);

  // Query for the game and its players
  const { data, isLoading, error } = db.useQuery({
    games: {},
    players: {},
    armies: {}, // Include armies to check for user armies and game armies
    units: {},
    models: {},
    weapons: {}
  });

  // Filter games and players for this specific game code
  const games = data?.games || [];
  const allPlayers = data?.players || [];
  const allArmies = data?.armies || [];
  const allUnits = data?.units || [];
  const allModels = data?.models || [];
  const allWeapons = data?.weapons || [];
  
  const game = games.find((g: any) => g.code === gameCode);
  const players = allPlayers.filter((p: any) => p.gameId === game?.id);

  // Get user's army templates (not game-specific)
  const userArmies = allArmies.filter((a: any) => a.ownerId === user?.id && !a.gameId);

  // Function to copy an army using the original JSON and import logic
  const copyArmyToGame = async (armyId: string, playerId: string) => {
    console.log('🎯 copyArmyToGame called with:', { armyId, playerId, gameId: game?.id });
    
    const army = userArmies.find(a => a.id === armyId);
    console.log('🎯 Found army:', army);
    
    if (!army || !army.sourceData || !game?.id) {
      console.error('❌ Army not found, missing source data, or no game ID', {
        armyFound: !!army,
        hasSourceData: !!army?.sourceData,
        hasGameId: !!game?.id
      });
      return null;
    }

    try {
      console.log('🎯 Parsing JSON data...');
      // Parse the original JSON data
      const originalJsonData = JSON.parse(army.sourceData);
      console.log('🎯 JSON parsed successfully:', originalJsonData);
      
      console.log('🎯 Calling importArmyForGame...');
      // Import the army with a new function that creates game copies
      const result = await importArmyForGame(originalJsonData, army.ownerId, game.id);
      console.log('🎯 Import result:', result);
      
      if (result?.armyId) {
        console.log('🎯 Updating player with new army ID...');
        // Update player with the new army reference
        await db.transact([
          db.tx.players[playerId].update({
            armyId: result.armyId
          })
        ]);
        console.log('🎯 Player updated successfully');
        
        return result.armyId;
      }
      
      console.log('❌ No armyId in result');
      return null;
      
    } catch (error) {
      console.error('❌ Error copying army:', error);
      return null;
    }
  };

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
  const currentPlayer = players.find(p => p.userId === user?.id);

  // Function to start the game with army copying
  const startGame = async () => {
    console.log('🚀 Starting game...');
    setIsStartingGame(true);
    try {
      console.log('🚀 Players:', players);
      console.log('🚀 All armies:', allArmies);
      console.log('🚀 User armies:', userArmies);
      
      // Copy armies for all players who have selected them
      for (const player of players) {
        console.log('🚀 Checking player:', player);
        
        if (player.armyId && !allArmies.find(a => a.id === player.armyId && a.gameId === game?.id)) {
          console.log('🚀 Player needs army copy:', player.name, 'armyId:', player.armyId);
          // This player has selected an army template but it's not copied to the game yet
          const newArmyId = await copyArmyToGame(player.armyId, player.id);
          console.log('🚀 Copy result for player', player.name, ':', newArmyId);
        } else {
          console.log('🚀 Player already has game army or no army selected:', player.name);
        }
      }

      console.log('🚀 Setting game to active...');
      // Start the game with first player and command phase
      await db.transact([
        db.tx.games[game.id].update({ 
          status: 'active',
          currentTurn: 1,
          currentPhase: 'command',
          activePlayerId: players[0].id,
          phaseHistory: []
        })
      ]);
      console.log('🚀 Game started successfully');
    } catch (error) {
      console.error('❌ Error starting game:', error);
    } finally {
      setIsStartingGame(false);
    }
  };

  // Handle army selection
  const selectArmy = async (armyId: string) => {
    if (!currentPlayer) return;
    
    try {
      await db.transact([
        db.tx.players[currentPlayer.id].update({
          armyId: armyId
        })
      ]);
    } catch (error) {
      console.error('Error selecting army:', error);
    }
  };

  // If game is active, show the game phases
  if (game.status === 'active') {
    return (
      <GamePhases
        gameId={game.id}
        game={game}
        players={players}
        currentUser={user}
      />
    );
  }

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
        </div>

        {/* Players */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Players ({players.length})</h2>
          <div className="space-y-3">
            {players.map((player) => {
              const playerArmy = allArmies.find(a => a.id === player.armyId && !a.gameId);
              return (
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
                  <div className="text-sm text-gray-400">
                    {playerArmy ? (
                      <span className="text-green-400">{playerArmy.name}</span>
                    ) : (
                      <span>No army selected</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Army Selection for Current Player */}
        {currentPlayer && !currentPlayer.armyId && userArmies.length > 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Select Your Army</h2>
            <div className="space-y-3">
              {userArmies.map((army) => (
                <div
                  key={army.id}
                  className="flex items-center justify-between bg-gray-700 rounded-lg p-4"
                >
                  <div>
                    <h3 className="font-medium text-white">{army.name}</h3>
                    <p className="text-sm text-gray-400">{army.faction} • {army.pointsValue} pts</p>
                  </div>
                  <button
                    onClick={() => selectArmy(army.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Status */}
        <div className="text-center">
          {game.status === 'waiting' ? (
            <div className="bg-yellow-800 border border-yellow-600 rounded-lg p-8">
              <h2 className="text-3xl font-bold text-yellow-400 mb-4">Waiting for Players</h2>
              <p className="text-yellow-200 mb-4">
                Share the game code <span className="font-mono font-bold text-2xl">{gameCode}</span> with other players
              </p>
              
              {isHost && players.every(p => p.armyId) && players.length >= 2 && (
                <button
                  onClick={startGame}
                  disabled={isStartingGame}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {isStartingGame ? 'Starting Game...' : 'Start Game'}
                </button>
              )}
              
              {players.length < 2 && (
                <p className="text-yellow-300 text-sm mt-4">Need at least 2 players to start</p>
              )}
              
              {!players.every(p => p.armyId) && (
                <p className="text-yellow-300 text-sm mt-4">All players must select armies before starting</p>
              )}
            </div>
          ) : (
            <div className="bg-red-800 border border-red-600 rounded-lg p-12">
              <h1 className="text-6xl font-bold text-red-400 mb-4">BATTLE!</h1>
              <p className="text-red-200 text-xl">
                The Emperor protects! May your dice roll true.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 