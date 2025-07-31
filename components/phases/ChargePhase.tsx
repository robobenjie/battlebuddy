'use client';

interface ChargePhaseProps {
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

export default function ChargePhase({ gameId, army, currentPlayer, currentUser, game }: ChargePhaseProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Charge Phase</h2>
        <p className="text-gray-400 text-sm">
          Declare charges with your units to close into combat with the enemy.
        </p>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <h3 className="text-xl font-medium text-white mb-4">Charge Phase Features</h3>
        <div className="space-y-3 text-gray-400 text-sm">
          <p>• Declare Charge Targets</p>
          <p>• Roll Charge Distance (2D6)</p>
          <p>• Resolve Overwatch</p>
          <p>• Make Charge Moves</p>
          <p>• Set up Combat</p>
        </div>
        <div className="mt-6">
          <p className="text-gray-500 text-xs">Implementation coming soon...</p>
        </div>
      </div>
    </div>
  );
} 