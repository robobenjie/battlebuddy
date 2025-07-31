'use client';

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
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Fight Phase</h2>
        <p className="text-gray-400 text-sm">
          Units engaged in combat fight with their melee weapons.
        </p>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <h3 className="text-xl font-medium text-white mb-4">Fight Phase Features</h3>
        <div className="space-y-3 text-gray-400 text-sm">
          <p>• Choose Combat Order</p>
          <p>• Select Melee Weapons</p>
          <p>• Roll to Hit and Wound</p>
          <p>• Apply Damage</p>
          <p>• Resolve Pile In and Consolidate</p>
        </div>
        <div className="mt-6">
          <p className="text-gray-500 text-xs">Implementation coming soon...</p>
        </div>
      </div>
    </div>
  );
} 