'use client';

interface CommandPhaseProps {
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

export default function CommandPhase({ gameId, army, currentPlayer, currentUser, game }: CommandPhaseProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Command Phase</h2>
        <p className="text-gray-400 text-sm">
          Issue orders to your forces, gain command points, and use stratagems.
        </p>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <h3 className="text-xl font-medium text-white mb-4">Command Phase Features</h3>
        <div className="space-y-3 text-gray-400 text-sm">
          <p>• Gain Command Points</p>
          <p>• Use Stratagems</p>
          <p>• Issue Orders to Units</p>
          <p>• Activate Leader Abilities</p>
        </div>
        <div className="mt-6">
          <p className="text-gray-500 text-xs">Implementation coming soon...</p>
        </div>
      </div>
    </div>
  );
} 