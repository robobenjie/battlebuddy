'use client';

import { useState } from 'react';
import { db } from '../lib/db';
import MovementPhase from './phases/MovementPhase';
import CommandPhase from './phases/CommandPhase';
import ShootPhase from './phases/ShootPhase';
import ChargePhase from './phases/ChargePhase';
import FightPhase from './phases/FightPhase';

interface GamePhasesProps {
  gameId: string;
  game: {
    id: string;
    code: string;
    currentTurn: number;
    currentPhase: string;
    activePlayerId?: string;
    status: string;
    phaseHistory?: any[];
  };
  players: Array<{
    id: string;
    userId: string;
    name: string;
    armyId?: string;
  }>;
  currentUser: any;
}

const PHASES = ['command', 'move', 'shoot', 'charge', 'fight'] as const;
type Phase = typeof PHASES[number];

const PHASE_NAMES: Record<Phase, string> = {
  command: 'Command Phase',
  move: 'Movement Phase', 
  shoot: 'Shooting Phase',
  charge: 'Charge Phase',
  fight: 'Fight Phase'
};

export default function GamePhases({ gameId, game, players, currentUser }: GamePhasesProps) {
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Get current player data
  const currentPlayer = players.find(p => p.id === game.activePlayerId);
  const currentPlayerArmy = currentPlayer?.armyId;
  
  // Always call hooks in the same order - Query army data for the current player
  const { data: armyData } = db.useQuery(
    currentPlayerArmy ? {
      armies: {
        $: {
          where: {
            id: currentPlayerArmy,
            gameId: gameId,
          }
        }
      }
    } : {}
  );

  const army = armyData?.armies?.[0];

  // Now we can do conditional logic after all hooks are called
  if (!game.activePlayerId || !currentPlayer) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-400">Game is not properly initialized.</p>
          </div>
        </div>
      </div>
    );
  }

  const getCurrentPhaseIndex = () => {
    return PHASES.indexOf(game.currentPhase as Phase);
  };

  const getNextPhase = () => {
    const currentIndex = getCurrentPhaseIndex();
    const nextIndex = (currentIndex + 1) % PHASES.length;
    return PHASES[nextIndex];
  };

  const getNextPlayer = () => {
    const currentPlayerIndex = players.findIndex(p => p.id === game.activePlayerId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    return players[nextPlayerIndex];
  };

  const advancePhase = async () => {
    setIsAdvancing(true);
    try {
      const currentIndex = getCurrentPhaseIndex();
      const isLastPhase = currentIndex === PHASES.length - 1;
      
      if (isLastPhase) {
        // Last phase of current player - move to next player's first phase
        const nextPlayer = getNextPlayer();
        const isLastPlayer = nextPlayer.id === players[0].id; // Back to first player means new turn
        
        await db.transact([
          db.tx.games[gameId].update({
            currentPhase: PHASES[0], // Start with command phase
            activePlayerId: nextPlayer.id,
            currentTurn: isLastPlayer ? game.currentTurn + 1 : game.currentTurn,
            phaseHistory: [
              ...(game.phaseHistory || []),
              {
                turn: game.currentTurn,
                phase: game.currentPhase,
                playerId: game.activePlayerId,
                timestamp: Date.now()
              }
            ]
          })
        ]);
      } else {
        // Same player, next phase
        const nextPhase = getNextPhase();
        await db.transact([
          db.tx.games[gameId].update({
            currentPhase: nextPhase,
            phaseHistory: [
              ...(game.phaseHistory || []),
              {
                turn: game.currentTurn,
                phase: game.currentPhase,
                playerId: game.activePlayerId,
                timestamp: Date.now()
              }
            ]
          })
        ]);
      }
    } catch (error) {
      console.error('Error advancing phase:', error);
    } finally {
      setIsAdvancing(false);
    }
  };

  const goBackPhase = async () => {
    setIsAdvancing(true);
    try {
      const currentIndex = getCurrentPhaseIndex();
      const isFirstPhase = currentIndex === 0;
      
      if (isFirstPhase) {
        // First phase of current player - go to previous player's last phase
        const currentPlayerIndex = players.findIndex(p => p.id === game.activePlayerId);
        const prevPlayerIndex = currentPlayerIndex === 0 ? players.length - 1 : currentPlayerIndex - 1;
        const prevPlayer = players[prevPlayerIndex];
        const isFirstPlayer = currentPlayerIndex === 0; // Going back from first player means previous turn
        
        await db.transact([
          db.tx.games[gameId].update({
            currentPhase: PHASES[PHASES.length - 1], // Last phase
            activePlayerId: prevPlayer.id,
            currentTurn: isFirstPlayer ? Math.max(1, game.currentTurn - 1) : game.currentTurn,
          })
        ]);
      } else {
        // Same player, previous phase
        const prevPhase = PHASES[currentIndex - 1];
        await db.transact([
          db.tx.games[gameId].update({
            currentPhase: prevPhase,
          })
        ]);
      }
    } catch (error) {
      console.error('Error going back phase:', error);
    } finally {
      setIsAdvancing(false);
    }
  };

  // Stub phase components for now
  const PhaseStub = ({ phase }: { phase: string }) => (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-white mb-4">{PHASE_NAMES[phase as Phase]}</h2>
      <p className="text-gray-400 mb-4">This is a stub for the {phase} phase.</p>
      <p className="text-gray-500 text-sm">Phase implementation coming soon...</p>
    </div>
  );

  const renderCurrentPhase = () => {
    if (!army || !currentPlayer) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-400">Loading game data...</p>
        </div>
      );
    }

    const phaseProps = {
      gameId,
      army,
      currentPlayer,
      currentUser,
      game
    };

    switch (game.currentPhase) {
      case 'command':
        return <CommandPhase {...phaseProps} />;
      case 'move':
        return <MovementPhase {...phaseProps} />;
      case 'shoot':
        return <ShootPhase {...phaseProps} />;
      case 'charge':
        return <ChargePhase {...phaseProps} />;
      case 'fight':
        return <FightPhase {...phaseProps} />;
      default:
        return <PhaseStub phase={game.currentPhase} />;
    }
  };

  if (!currentPlayer || !army) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading game...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {army.name} - {PHASE_NAMES[game.currentPhase as Phase]}
              </h1>
              <p className="text-gray-400">
                Turn {game.currentTurn} • {currentPlayer.name}'s Turn
              </p>
            </div>
            <div className="text-right text-sm text-gray-400">
              <p>Game {game.code}</p>
              <p>Phase {getCurrentPhaseIndex() + 1} of {PHASES.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Phase Content */}
      <div className="max-w-6xl mx-auto p-6">
        {renderCurrentPhase()}
      </div>

      {/* Navigation */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <button
              onClick={goBackPhase}
              disabled={isAdvancing || game.currentTurn === 1 && getCurrentPhaseIndex() === 0 && game.activePlayerId === players[0].id}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              ← Previous
            </button>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {PHASES.map((phase, index) => (
                  <div
                    key={phase}
                    className={`w-3 h-3 rounded-full ${
                      index < getCurrentPhaseIndex() 
                        ? 'bg-green-500' 
                        : index === getCurrentPhaseIndex()
                        ? 'bg-red-500'
                        : 'bg-gray-600'
                    }`}
                    title={PHASE_NAMES[phase]}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={advancePhase}
              disabled={isAdvancing}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              {isAdvancing ? 'Advancing...' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 