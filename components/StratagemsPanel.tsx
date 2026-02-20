'use client';

import { useMemo, useState } from 'react';
import {
  Stratagem,
  StratagemDrawerEntry,
  getAvailableStratagems,
  getStratagemsForDrawer,
} from '../lib/stratagems';

interface StratagemsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  faction?: string;
  detachment?: string;
  commandPoints: number;
  isYourTurn: boolean;
  onUseStratagem: (stratagem: Stratagem) => Promise<void>;
  onAdjustCommandPoints: (delta: number) => Promise<void>;
}

function getTurnColor(stratagem: Stratagem): string {
  if (!stratagem.turn || stratagem.turn === 'either') return 'border-green-500';
  if (stratagem.turn === 'your-turn') return 'border-blue-500';
  return 'border-red-500';
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

export default function StratagemsPanel({
  isOpen,
  onClose,
  faction,
  detachment,
  commandPoints,
  isYourTurn,
  onUseStratagem,
  onAdjustCommandPoints,
}: StratagemsPanelProps) {
  const [selected, setSelected] = useState<Stratagem | null>(null);
  const [isUsing, setIsUsing] = useState(false);
  const [isAdjustingCp, setIsAdjustingCp] = useState(false);

  const entries = useMemo<StratagemDrawerEntry[]>(() => {
    const all = getAvailableStratagems(faction, detachment);
    return getStratagemsForDrawer(all, isYourTurn);
  }, [faction, detachment, isYourTurn]);

  const availableCount = entries.filter((x) => x.isAvailableNow).length;

  const handleUse = async () => {
    if (!selected || isUsing || commandPoints < selected.cost) return;
    setIsUsing(true);
    try {
      await onUseStratagem(selected);
    } finally {
      setIsUsing(false);
    }
  };

  const adjustCp = async (delta: number) => {
    if (isAdjustingCp) return;
    if (delta < 0 && commandPoints <= 0) return;
    setIsAdjustingCp(true);
    try {
      await onAdjustCommandPoints(delta);
    } finally {
      setIsAdjustingCp(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 transition-opacity"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 left-0 z-[80] h-full w-full sm:w-[28rem] bg-gray-900 border-r border-gray-700 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-700 bg-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white">
                {selected ? selected.name : 'Stratagems'}
              </h2>
              <button
                onClick={selected ? () => setSelected(null) : onClose}
                className="text-gray-400 hover:text-white text-2xl font-bold w-10 h-10 flex items-center justify-center"
              >
                {selected ? '←' : '×'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400">
                {faction || 'Faction'}{detachment ? ` • ${detachment}` : ''}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjustCp(-1)}
                  disabled={isAdjustingCp || commandPoints <= 0}
                  className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-bold"
                >
                  -
                </button>
                <div className="min-w-14 text-center text-yellow-400 font-bold">
                  {commandPoints} CP
                </div>
                <button
                  onClick={() => adjustCp(1)}
                  disabled={isAdjustingCp}
                  className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selected ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-400">{selected.when}</p>
                <p className="text-sm text-gray-200 whitespace-pre-line">{selected.effect}</p>
                <button
                  onClick={handleUse}
                  disabled={isUsing || commandPoints < selected.cost}
                  className={`w-full font-semibold py-2 px-3 rounded-lg transition-colors ${
                    commandPoints >= selected.cost
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-gray-700 text-gray-500'
                  }`}
                >
                  Use ({selected.cost} CP)
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.length === 0 && (
                  <div className="text-sm text-gray-400">No stratagems available.</div>
                )}
                {entries.map((entry, index) => {
                  const isFirstUnavailable =
                    !entry.isAvailableNow &&
                    index > 0 &&
                    entries[index - 1]?.isAvailableNow;
                  return (
                    <div key={entry.stratagem.id}>
                      {isFirstUnavailable && (
                        <div className="text-xs uppercase tracking-wide text-gray-500 pt-2 pb-1">
                          Other Stratagems
                        </div>
                      )}
                      {index === 0 && availableCount > 0 && (
                        <div className="text-xs uppercase tracking-wide text-gray-500 pb-1">
                          Available Now
                        </div>
                      )}
                      <button
                        onClick={() => setSelected(entry.stratagem)}
                        className={`w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg p-3 border-l-4 ${getTurnColor(entry.stratagem)} ${
                          entry.isAvailableNow ? '' : 'opacity-60'
                        }`}
                      >
                        <div className="text-sm font-semibold text-white">{entry.stratagem.name}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {entry.stratagem.cost} CP • {truncateText(entry.stratagem.effect, 120)}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
