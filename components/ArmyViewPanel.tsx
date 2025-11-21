'use client';

import { useState } from 'react';
import { db } from '../lib/db';
import UnitCard from './ui/UnitCard';

interface ArmyViewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  currentUserId: string;
  players: Array<{
    id: string;
    userId: string;
    name: string;
    armyId?: string;
  }>;
}

export default function ArmyViewPanel({ isOpen, onClose, gameId, currentUserId, players }: ArmyViewPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Query all armies for this game
  const { data } = db.useQuery({
    armies: {
      units: {
        models: {
          weapons: {}
        }
      }
    }
  });

  const allArmies = data?.armies || [];

  // Get game-specific armies for the players
  const gameArmies = allArmies.filter((army: any) => army.gameId === gameId);

  // Find current user's army and opponent's army
  const currentUserPlayer = players.find(p => p.userId === currentUserId);
  const currentUserArmy = gameArmies.find((army: any) => army.ownerId === currentUserId);

  const opponentPlayer = players.find(p => p.userId !== currentUserId);
  const opponentArmy = gameArmies.find((army: any) => army.ownerId === opponentPlayer?.userId);

  // Filter units based on search query
  const filterUnits = (units: any[]) => {
    if (!searchQuery.trim()) return units;
    const query = searchQuery.toLowerCase();
    return units.filter((unit: any) =>
      unit.name.toLowerCase().includes(query) ||
      unit.nickname?.toLowerCase().includes(query)
    );
  };

  const renderArmy = (army: any, playerName: string, isCurrentUser: boolean) => {
    if (!army) {
      return (
        <div className="p-4 text-center text-gray-400">
          <p>No army assigned to {playerName}</p>
        </div>
      );
    }

    const units = army.units || [];
    const filteredUnits = filterUnits(units);

    return (
      <div className="mb-6">
        <div className="bg-gray-700 p-3 mb-2 rounded-lg">
          <h3 className="text-lg font-bold text-white">
            {playerName}'s Army {isCurrentUser && <span className="text-sm text-blue-400">(You)</span>}
          </h3>
          <p className="text-sm text-gray-400">{army.name} - {army.faction}</p>
        </div>

        {filteredUnits.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <p>No units found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUnits.map((unit: any) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                expandable={true}
                defaultExpanded={false}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-96 bg-gray-800 border-l border-gray-700 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-700 bg-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white">Army Overview</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl font-bold w-10 h-10 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {/* Search Box */}
            <input
              type="text"
              placeholder="Search units..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Current User's Army */}
            {renderArmy(currentUserArmy, currentUserPlayer?.name || 'You', true)}

            {/* Opponent's Army */}
            {renderArmy(opponentArmy, opponentPlayer?.name || 'Opponent', false)}
          </div>
        </div>
      </div>
    </>
  );
}
