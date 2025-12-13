'use client';

import { useState } from 'react';
import { db } from '../../lib/db';
import { id } from '@instantdb/react';
import UnitCard from '../ui/UnitCard';
import { formatUnitForCard, sortUnitsByPriority, getUnitDisplayName } from '../../lib/unit-utils';
import CombatCalculatorPage from '../CombatCalculatorPage';
import ReminderBadge from '../ui/ReminderBadge';
import { useRulePopup } from '../ui/RulePopup';
import RulePopup from '../ui/RulePopup';
import { getUnitReminders } from '../../lib/rules-engine/reminder-utils';
import { UNIT_FULL_QUERY } from '../../lib/query-fragments';

interface FightPhaseProps {
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
}

export default function FightPhase({ gameId, army, currentPlayer, currentUser, game }: FightPhaseProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCombatCalculator, setShowCombatCalculator] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [selectedUnitArmyId, setSelectedUnitArmyId] = useState<string>('');
  const { isOpen, rule, showRule, hideRule } = useRulePopup();

  // Query ALL armies and units in this game, including destroyed units
  const { data: gameData } = db.useQuery({
    games: {
      armies: {
        armyRules: {},
        units: {
          ...UNIT_FULL_QUERY,
        },
      },
      destroyedUnits: {},
      $: {
        where: {
          id: gameId
        }
      }
    },
  });

  // Query players to get player names
  const { data: playersData } = db.useQuery({
    players: {
      $: {
        where: {
          gameId: gameId
        }
      }
    }
  });

  const gameRecord = gameData?.games[0];
  const allArmies = gameRecord?.armies || [];
  const destroyedUnitIds = new Set((gameRecord?.destroyedUnits || []).map((u: any) => u.id));
  const players = playersData?.players || [];

  // Filter out destroyed units from all armies
  const armiesWithoutDestroyed = allArmies.map((army: any) => ({
    ...army,
    units: (army.units || []).filter((unit: any) => !destroyedUnitIds.has(unit.id))
  }));

  // Helper to get army name (fallback to player name if needed)
  const getArmyDisplayName = (army: any) => {
    return army?.name || 'Unknown Army';
  };

  // Helper function to check if unit has charged this player's turn
  const hasChargedThisTurn = (unit: any) => {
    if (!unit || !unit.statuses) return false;
    // Create turn+player identifier (e.g., "2-player123")
    const turnPlayerId = `${game.currentTurn}-${currentPlayer.id}`;
    return unit.statuses.some((status: any) =>
      status.name === 'charged' &&
      status.turns && status.turns.includes(turnPlayerId)
    );
  };

  // Helper function to check if unit has fought this player's turn
  const hasFoughtThisTurn = (unit: any) => {
    if (!unit || !unit.statuses) return false;
    // Create turn+player identifier (e.g., "2-player123")
    const turnPlayerId = `${game.currentTurn}-${currentPlayer.id}`;
    return unit.statuses.some((status: any) =>
      status.name === 'fought' &&
      status.turns && status.turns.includes(turnPlayerId)
    );
  };

  // Helper function to create unit status for current player's turn
  const createUnitStatus = async (unitId: string, statusName: string) => {
    // Create turn+player identifier (e.g., "2-player123")
    const turnPlayerId = `${game.currentTurn}-${currentPlayer.id}`;
    await db.transact([
      db.tx.unitStatuses[id()].update({
        unitId: unitId,
        name: statusName,
        turns: [turnPlayerId],
        rules: []
      }).link({ unit: unitId })
    ]);
  };

  // Helper function to delete fought status for current player's turn
  const deleteFoughtStatusForTurn = async (unit: any) => {
    if (!unit || !unit.statuses) return;

    // Create turn+player identifier (e.g., "2-player123")
    const turnPlayerId = `${game.currentTurn}-${currentPlayer.id}`;
    const statusesToDelete = unit.statuses.filter((status: any) =>
      status.name === 'fought' &&
      status.turns && status.turns.includes(turnPlayerId)
    );

    if (statusesToDelete.length > 0) {
      await db.transact(
        statusesToDelete.map((status: any) =>
          db.tx.unitStatuses[status.id].delete()
        )
      );
    }
  };

  // Open combat calculator for melee weapons
  const openCombatCalculator = (unit: any, armyId: string) => {
    setSelectedUnit(unit);
    setSelectedUnitArmyId(armyId);
    setShowCombatCalculator(true);
  };

  // Close combat calculator and mark unit as fought
  const closeCombatCalculator = async () => {
    if (selectedUnit) {
      // Mark unit as fought
      try {
        await createUnitStatus(selectedUnit.id, 'fought');
      } catch (error) {
        console.error('Error marking unit as fought:', error);
      }
    }
    setShowCombatCalculator(false);
    setSelectedUnit(null);
    setSelectedUnitArmyId('');
  };

  // Handle undo action
  const handleUndo = async (unit: any) => {
    setIsProcessing(true);
    try {
      // Delete fought status
      await deleteFoughtStatusForTurn(unit);

      // Reset melee weapons (remove current turn from turnsFired)
      const turnPlayerId = `${game.currentTurn}-${currentPlayer.id}`;
      const meleeWeapons = (unit.models || []).flatMap((model: any) =>
        (model.weapons || []).filter((weapon: any) => weapon.range === 0)
      );

      // Remove this turn from each weapon's turnsFired array
      const weaponUpdates = meleeWeapons
        .filter((weapon: any) => weapon.turnsFired && weapon.turnsFired.includes(turnPlayerId))
        .map((weapon: any) => {
          const newTurnsFired = weapon.turnsFired.filter((t: string) => t !== turnPlayerId);
          return db.tx.weapons[weapon.id].update({
            turnsFired: newTurnsFired
          });
        });

      if (weaponUpdates.length > 0) {
        await db.transact(weaponUpdates);
      }
    } catch (error) {
      console.error('Error undoing fight:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Organize units by section and army (using filtered armies without destroyed units)
  const fightsFirstUnits: Array<{ army: any; units: any[] }> = [];
  const regularUnits: Array<{ army: any; units: any[] }> = [];

  armiesWithoutDestroyed.forEach((army: any) => {
    const charged = (army.units || []).filter((unit: any) => hasChargedThisTurn(unit));
    const regular = (army.units || []).filter((unit: any) => !hasChargedThisTurn(unit));

    if (charged.length > 0) {
      fightsFirstUnits.push({ army, units: sortUnitsByPriority(charged, destroyedUnitIds) });
    }
    if (regular.length > 0) {
      regularUnits.push({ army, units: sortUnitsByPriority(regular, destroyedUnitIds) });
    }
  });

  // Check if a unit belongs to the current user
  const isMyUnit = (armyId: string) => {
    const unitArmy = allArmies.find((a: any) => a.id === armyId) as any;
    return unitArmy?.ownerId === currentUser?.id;
  };

  if (armiesWithoutDestroyed.length === 0 || armiesWithoutDestroyed.every((a: any) => !a.units || a.units.length === 0)) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No units available for combat.</p>
      </div>
    );
  }

  // Render a unit with fight button (compact single-row layout)
  const renderUnit = (unit: any, armyId: string) => {
    const hasFought = hasFoughtThisTurn(unit);
    const isOwner = isMyUnit(armyId);

    // Determine turn context: is this unit's owner the active player?
    const unitArmy = allArmies.find((a: any) => a.id === armyId);
    const isActivePlayerUnit = unitArmy?.ownerId === currentPlayer.userId;
    const turnContext = isActivePlayerUnit ? 'own' : 'opponent';

    // Get fight phase reminders for this unit
    const unitReminders = getUnitReminders(unit, 'fight', turnContext);

    return (
      <div key={unit.id} className="py-2">
        <div className={`flex items-center justify-between ${!isOwner ? 'opacity-60' : ''}`}>
          {/* Unit name and status */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <span className="text-white font-medium truncate">{getUnitDisplayName(unit)}</span>
            {hasFought && (
              <span className="px-2 py-0.5 rounded text-xs bg-red-600 text-red-100 whitespace-nowrap">
                Fought
              </span>
            )}
          </div>

          {/* Fight button and undo */}
          <div className="flex items-center space-x-2">
            {hasFought && isOwner && (
              <button
                onClick={() => handleUndo(unit)}
                disabled={isProcessing}
                className="text-xs text-blue-400 hover:text-blue-300 underline disabled:text-gray-500"
              >
                undo
              </button>
            )}
            <button
              onClick={() => openCombatCalculator(unit, armyId)}
              disabled={!isOwner || hasFought}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-semibold py-1.5 px-3 rounded transition-colors text-sm disabled:cursor-not-allowed whitespace-nowrap"
            >
              Fight
            </button>
          </div>
        </div>

        {/* Reminders - show below the unit if any exist */}
        {unitReminders.length > 0 && (
          <div className="mt-2 ml-1 flex flex-wrap gap-2">
            {unitReminders.map((reminder) => (
              <ReminderBadge
                key={reminder.id}
                rule={reminder}
                onClick={() => showRule(reminder.name, reminder.description)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Fight Phase</h2>
        <p className="text-gray-400 text-sm">
          Units engaged in combat fight with their melee weapons. Either player can activate their units.
        </p>
      </div>

      {/* Fights First Section */}
      {fightsFirstUnits.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-md font-semibold text-white mb-1">Fights First</h3>
          <p className="text-gray-400 text-xs mb-4">
            Units that charged this turn
          </p>
          <div className="space-y-3">
            {fightsFirstUnits.map(({ army, units }) => (
              <div key={army.id}>
                {/* Army header */}
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  {getArmyDisplayName(army)}
                </div>
                <div className="space-y-1 border-l-2 border-gray-700 pl-3">
                  {units.map((unit: any) => renderUnit(unit, army.id))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Fight Phase Section */}
      {regularUnits.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-md font-semibold text-white mb-1">Fight Phase</h3>
          <p className="text-gray-400 text-xs mb-4">
            All other units
          </p>
          <div className="space-y-3">
            {regularUnits.map(({ army, units }) => (
              <div key={army.id}>
                {/* Army header */}
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  {getArmyDisplayName(army)}
                </div>
                <div className="space-y-1 border-l-2 border-gray-700 pl-3">
                  {units.map((unit: any) => renderUnit(unit, army.id))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Combat Calculator Modal */}
      {showCombatCalculator && selectedUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <CombatCalculatorPage
                gameId={gameId}
                unit={selectedUnit}
                currentArmyId={selectedUnitArmyId}
                weaponType="melee"
                onClose={closeCombatCalculator}
                currentPlayer={currentPlayer}
              />
            </div>
          </div>
        </div>
      )}

      {/* Rule Popup */}
      <RulePopup
        isOpen={isOpen}
        onClose={hideRule}
        rule={rule}
      />
    </div>
  );
}
