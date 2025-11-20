'use client';

import { useState } from 'react';
import { Stratagem, getAvailableStratagems, getStratagemsForPhase, getStratagemsForTurn } from '../lib/stratagems';
import RuleTip from './ui/RuleTip';

interface StratagemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhase: string;
  faction?: string;
  detachment?: string;
  commandPoints: number;
  onUseStratagem: (stratagem: Stratagem) => Promise<void>;
  activePlayerId?: string;
  currentUserId?: string;
}

export default function StratagemsModal({
  isOpen,
  onClose,
  currentPhase,
  faction,
  detachment,
  commandPoints,
  onUseStratagem,
  activePlayerId,
  currentUserId
}: StratagemsModalProps) {
  const [selectedStratagem, setSelectedStratagem] = useState<Stratagem | null>(null);
  const [isUsing, setIsUsing] = useState(false);

  if (!isOpen) return null;

  const allStratagems = getAvailableStratagems(faction, detachment);
  const phaseStratagems = getStratagemsForPhase(allStratagems, currentPhase);

  // Determine if it's the current user's turn
  const isYourTurn = activePlayerId === currentUserId;
  const filteredStratagems = getStratagemsForTurn(phaseStratagems, isYourTurn);

  const handleUseStratagem = async (stratagem: Stratagem) => {
    if (commandPoints < stratagem.cost || isUsing) return;

    setIsUsing(true);
    try {
      await onUseStratagem(stratagem);
      onClose();
    } catch (error) {
      console.error('Failed to use stratagem:', error);
    } finally {
      setIsUsing(false);
    }
  };

  const canAfford = (cost: number) => commandPoints >= cost;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Stratagems</h2>
            <p className="text-sm text-gray-400 mt-1">
              {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)} Phase
              {faction && <span className="ml-2">• {faction}</span>}
              {detachment && <span className="ml-2">• {detachment}</span>}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Command Points</div>
              <div className="text-2xl font-bold text-yellow-400">{commandPoints} CP</div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl font-bold w-10 h-10 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>

        {/* Stratagems List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {filteredStratagems.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No stratagems available for this phase and turn
              </div>
            ) : (
              filteredStratagems.map((stratagem) => {
                const affordable = canAfford(stratagem.cost);

                return (
                  <div
                    key={stratagem.id}
                    className={`bg-gray-800 rounded-lg overflow-hidden border-2 ${
                      !affordable ? 'border-gray-700 opacity-50' : 'border-gray-600'
                    }`}
                  >
                    <div className="p-4">
                      {/* Stratagem Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <button
                            onClick={() => setSelectedStratagem(
                              selectedStratagem?.id === stratagem.id ? null : stratagem
                            )}
                            className="text-left hover:text-yellow-400 transition-colors"
                          >
                            <h3 className="text-lg font-semibold text-white">
                              {stratagem.name}
                            </h3>
                          </button>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">{stratagem.when}</span>
                            {stratagem.faction && (
                              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                                {stratagem.faction}
                              </span>
                            )}
                            {stratagem.detachment && (
                              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                                {stratagem.detachment}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUseStratagem(stratagem)}
                          disabled={!affordable || isUsing}
                          className={`ml-4 font-bold py-2 px-4 rounded-lg transition-colors whitespace-nowrap ${
                            affordable
                              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          Use ({stratagem.cost} CP)
                        </button>
                      </div>

                      {/* Expanded Rules */}
                      {selectedStratagem?.id === stratagem.id && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <div className="text-sm text-gray-300 whitespace-pre-line">
                            {stratagem.effect}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 p-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 text-center">
            Click stratagem name to view full rules • Click "Use" button to spend CP
          </div>
        </div>
      </div>
    </div>
  );
}
