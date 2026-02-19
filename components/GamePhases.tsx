'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../lib/db';
import MovementPhase from './phases/MovementPhase';
import CommandPhase from './phases/CommandPhase';
import ShootPhase from './phases/ShootPhase';
import ChargePhase from './phases/ChargePhase';
import FightPhase from './phases/FightPhase';
import ChooseFirstPlayerPhase from './phases/ChooseFirstPlayerPhase';
import StratagemsModal from './StratagemsModal';
import HamburgerMenu from './HamburgerMenu';
import Sidebar from './Sidebar';
import ArmyViewPanel from './ArmyViewPanel';
import { Stratagem } from '../lib/stratagems';
import DiceRollResults from './ui/DiceRollResults';
import { CombatResult, WeaponStats, TargetStats, executeSavePhase } from '../lib/combat-calculator-engine';
import { DiceRollEvent, CombatPhaseEvent } from '../lib/rooms-types';

interface GamePhasesProps {
  gameId: string;
  game: {
    id: string;
    code: string;
    currentTurn: number;
    currentPhase: string;
    activePlayerId?: string;
    activeCombatSessionId?: string;
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
  const [showStratagemsModal, setShowStratagemsModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isArmyPanelOpen, setIsArmyPanelOpen] = useState(false);
  const router = useRouter();

  // State for shared dice roll results
  const [sharedCombatResult, setSharedCombatResult] = useState<CombatResult | null>(null);
  const [sharedWeapon, setSharedWeapon] = useState<WeaponStats | null>(null);
  const [sharedTarget, setSharedTarget] = useState<TargetStats | null>(null);
  const [showSharedResults, setShowSharedResults] = useState(false);
  const [rollInitiatorId, setRollInitiatorId] = useState<string>('');
  const [rollInitiatorName, setRollInitiatorName] = useState<string>('');
  const [showSavePhase, setShowSavePhase] = useState(false);
  const [sharedHitModifier, setSharedHitModifier] = useState(0);
  const [sharedWoundModifier, setSharedWoundModifier] = useState(0);
  const [sharedAddedKeywords, setSharedAddedKeywords] = useState<string[]>([]);
  const [sharedModifierSources, setSharedModifierSources] = useState<{
    hit?: string[];
    wound?: string[];
    keywords?: Array<{ keyword: string; source: string }>;
    damageReroll?: string[];
    rerollHit?: string[];
    rerollWound?: string[];
  }>({});
  const [sharedActiveRules, setSharedActiveRules] = useState<Array<{ id: string; name: string }>>([]);
  const [sharedHitThresholdOverride, setSharedHitThresholdOverride] = useState<number | undefined>(undefined);
  const [sharedWoundThresholdOverride, setSharedWoundThresholdOverride] = useState<number | undefined>(undefined);

  // Room subscription for real-time dice roll sharing
  const room = db.room('game', gameId);

  // Get publish functions for room topics
  const publishPhaseAdvance = db.rooms.usePublishTopic(room, 'combatPhaseAdvance');
  const publishDiceRoll = db.rooms.usePublishTopic(room, 'diceRollResult');

  // Subscribe to dice roll results from other players
  db.rooms.useTopicEffect(room, 'diceRollResult', (event, peer) => {
    // Only process events from other players
    if (event.playerId === currentUser?.id) return;

    console.log(`🎲 [GamePhases] Received dice roll from ${event.playerName}:`, event);

    const combatResult = event.combatResult as CombatResult;

    // Use the modifiedWeapon from combatResult (has all the actual stats used)
    const weapon: WeaponStats = combatResult.modifiedWeapon || {
      name: event.weaponName,
      range: 0,
      A: '1',
      WS: 0,
      S: 0,
      AP: 0,
      D: '1',
      keywords: []
    };

    // Use target stats from the event
    const target: TargetStats = {
      T: event.targetStats.T,
      SV: event.targetStats.SV,
      INV: event.targetStats.INV,
      FNP: event.targetStats.FNP,
      modelCount: event.targetStats.modelCount,
      categories: []
    };

    setSharedCombatResult(combatResult);
    setSharedWeapon(weapon);
    setSharedTarget(target);
    setRollInitiatorId(event.playerId);
    setRollInitiatorName(event.playerName);
    // When receiving 'attacks' phase, saves haven't been rolled yet (showSavePhase = false)
    // When receiving 'saves' or 'fnp' phase, saves have been rolled (showSavePhase = true)
    setShowSavePhase(event.phase === 'saves' || event.phase === 'fnp');
    setShowSharedResults(true);
    setSharedHitModifier(event.rollDisplay?.hitModifier ?? 0);
    setSharedWoundModifier(event.rollDisplay?.woundModifier ?? 0);
    setSharedAddedKeywords(event.rollDisplay?.addedKeywords || []);
    setSharedModifierSources(event.rollDisplay?.modifierSources || {});
    setSharedActiveRules(event.rollDisplay?.activeRules || []);
    setSharedHitThresholdOverride(event.rollDisplay?.hitThresholdOverride);
    setSharedWoundThresholdOverride(event.rollDisplay?.woundThresholdOverride);
  });

  // Subscribe to combat phase advancement
  db.rooms.useTopicEffect(room, 'combatPhaseAdvance', (event, peer) => {
    if (event.playerId === currentUser?.id) return;

    console.log(`⏭️ [GamePhases] Received phase advance from ${event.playerName}:`, event.phase);

    if (event.phase === 'show-saves' && sharedCombatResult) {
      setShowSavePhase(true);
    }
    // Note: 'complete' phase removed - each player closes their own modal independently
  });

  // Handler for rolling saves on shared combat results
  const handleRollSaves = () => {
    if (!sharedCombatResult || !sharedWeapon || !sharedTarget) {
      console.log('❌ [GamePhases] Cannot roll saves - missing data:', {
        hasCombatResult: !!sharedCombatResult,
        hasWeapon: !!sharedWeapon,
        hasTarget: !!sharedTarget
      });
      return;
    }

    console.log('🎲 [GamePhases] Rolling saves...', { sharedCombatResult, sharedWeapon, sharedTarget });

    // Execute save phase
    const updatedResult = executeSavePhase(sharedCombatResult, sharedWeapon, sharedTarget);

    // Update local state
    setSharedCombatResult(updatedResult);
    setShowSavePhase(true);

    console.log('📡 [GamePhases] Preparing to publish save results...', {
      hasGameId: !!gameId,
      hasPublishDiceRoll: !!publishDiceRoll,
      hasCurrentUser: !!currentUser?.id,
      hasRollInitiatorId: !!rollInitiatorId,
      rollInitiatorId,
      rollInitiatorName
    });

    // Publish updated combat result with saves to other players
    if (gameId && publishDiceRoll && currentUser?.id) {
      const diceRollEvent: DiceRollEvent = {
        playerId: currentUser.id, // Use current user who rolled saves, not original attacker
        playerName: currentUser.email || 'Player',
        timestamp: Date.now(),
        attackerUnitId: '', // Not critical for save phase
        attackerUnitName: '',
        defenderUnitId: '',
        defenderUnitName: '',
        weaponId: '',
        weaponName: sharedWeapon.name,
        targetStats: {
          T: sharedTarget.T,
          SV: sharedTarget.SV,
          INV: sharedTarget.INV,
          FNP: sharedTarget.FNP,
          modelCount: sharedTarget.modelCount,
        },
        combatResult: updatedResult,
        phase: 'saves',
      };
      console.log('📡 [GamePhases] Publishing save results:', diceRollEvent);
      publishDiceRoll(diceRollEvent);
    } else {
      console.log('❌ [GamePhases] Cannot publish - condition failed');
    }
  };

  // Swipe gesture handling
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Get current player data
  const currentPlayer = players.find(p => p.id === game.activePlayerId);
  const currentPlayerArmy = currentPlayer?.armyId;

  // Query current user's player data for CP
  const { data: currentUserPlayerData } = db.useQuery({
    players: {
      $: {
        where: {
          gameId: gameId,
          userId: currentUser?.id
        }
      }
    }
  });

  const currentUserPlayer = currentUserPlayerData?.players?.[0];

  // Query current user's army to get their faction
  const { data: currentUserArmyData } = db.useQuery(
    currentUserPlayer?.armyId ? {
      armies: {
        $: {
          where: {
            id: currentUserPlayer.armyId
          }
        }
      }
    } : {}
  );

  const currentUserArmy = currentUserArmyData?.armies?.[0];

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

  // Special case: Show choose first player screen
  // IMPORTANT: This check must come AFTER all hooks are called
  if (game.currentPhase === 'choose-first-player') {
    return (
      <ChooseFirstPlayerPhase
        gameId={gameId}
        game={game}
        players={players}
      />
    );
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX; // Initialize to start position
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    // Calculate if this was actually a swipe (moved enough distance)
    const didSwipe = Math.abs(swipeDistance) >= minSwipeDistance;

    if (didSwipe) {
      // Prevent default to stop click events from firing
      e.preventDefault();

      // Swipe left (to open panel from right)
      if (swipeDistance > 0 && !isArmyPanelOpen) {
        setIsArmyPanelOpen(true);
      }
      // Swipe right (to close panel)
      else if (swipeDistance < 0 && isArmyPanelOpen) {
        setIsArmyPanelOpen(false);
      }
    }

    // If it wasn't a swipe (tap or small movement), let the event through normally

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

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
      currentUserArmy,
      currentPlayer,
      currentUser,
      game,
      players
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

  const handleUseStratagem = async (stratagem: Stratagem) => {
    if (!currentUserPlayer) return;

    const currentCP = currentUserPlayer.commandPoints || 0;
    const newCP = Math.max(0, currentCP - stratagem.cost);

    await db.transact([
      db.tx.players[currentUserPlayer.id].update({
        commandPoints: newCP
      })
    ]);
  };

  const handleNavigation = (page: string) => {
    if (page === 'home') {
      router.push('/');
    } else if (page === 'view-armies') {
      router.push('/');
    }
  };

  const handleLogout = () => {
    db.auth.signOut();
  };

  return (
    <div
      className="min-h-screen bg-gray-900"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Hamburger Menu */}
      <HamburgerMenu isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentPage="game"
        onNavigate={handleNavigation}
        onLogout={handleLogout}
      />

      {/* Army View Panel */}
      <ArmyViewPanel
        isOpen={isArmyPanelOpen}
        onClose={() => setIsArmyPanelOpen(false)}
        gameId={gameId}
        currentUserId={currentUser?.id}
        players={players}
      />

      {/* Stratagems Modal */}
      <StratagemsModal
        isOpen={showStratagemsModal}
        onClose={() => setShowStratagemsModal(false)}
        currentPhase={game.currentPhase}
        faction={currentUserArmy?.faction}
        detachment={currentUserArmy?.detachment}
        commandPoints={currentUserPlayer?.commandPoints || 0}
        onUseStratagem={handleUseStratagem}
        activePlayerId={game.activePlayerId}
        currentUserId={currentUserPlayer?.id}
      />

      {/* Shared Dice Roll Results Modal (disabled when combat sessions are active) */}
      {!game.activeCombatSessionId && showSharedResults && sharedCombatResult && sharedWeapon && sharedTarget && (() => {
        console.log('🎬 [GamePhases] Rendering shared results modal', {
          showSavePhase,
          hasCombatResult: !!sharedCombatResult,
          hasWeapon: !!sharedWeapon,
          hasTarget: !!sharedTarget,
          totalWounds: sharedCombatResult?.summary?.totalWounds,
          hasSavePhase: !!sharedCombatResult?.savePhase
        });
        return true;
      })() && (
        <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
            <h2 className="text-xl font-bold text-white">Combat Results</h2>
            <button
              onClick={() => setShowSharedResults(false)}
              className="text-gray-400 hover:text-white text-3xl font-bold leading-none"
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <DiceRollResults
              combatResult={sharedCombatResult}
              weapon={sharedWeapon}
              target={sharedTarget}
              showSavePhase={showSavePhase}
              onRollSaves={() => {
                console.log('🔘 [GamePhases] Roll Saves button clicked in modal');
                handleRollSaves();
              }}
              activeRules={sharedActiveRules as any}
              hitModifier={sharedHitModifier}
              woundModifier={sharedWoundModifier}
              addedKeywords={sharedAddedKeywords}
              modifierSources={sharedModifierSources}
              hitThresholdOverride={sharedHitThresholdOverride}
              woundThresholdOverride={sharedWoundThresholdOverride}
              initiatorPlayerId={rollInitiatorId}
              initiatorPlayerName={rollInitiatorName}
              currentPlayerId={currentUser?.id}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 pt-20">
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
            <div className="flex items-center gap-4">
              {/* CP Button */}
              <button
                onClick={() => setShowStratagemsModal(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
              >
                <span className="text-lg">{currentUserPlayer?.commandPoints || 0}</span>
                <span className="text-sm">CP</span>
              </button>
              <div className="text-right text-sm text-gray-400">
                <p>Game {game.code}</p>
                <p>Phase {getCurrentPhaseIndex() + 1} of {PHASES.length}</p>
              </div>
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
