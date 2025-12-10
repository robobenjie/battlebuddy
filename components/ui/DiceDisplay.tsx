/**
 * Component for displaying dice rolls visually
 */

import { DiceRoll } from '../../lib/dice-utils';

interface DiceProps {
  value: number;
  type: 'miss' | 'hit' | 'critical';
  size?: number;
  sides?: number; // Number of sides (3 or 6)
}

export function Die({ value, type, size = 15, sides = 6 }: DiceProps) {
  const isD3 = sides === 3;

  const colors = {
    miss: isD3 ? 'bg-yellow-400 border-yellow-600' : 'bg-white border-black',
    hit: 'bg-green-700 border-green-900',
    critical: 'bg-green-400 border-green-600'
  };

  const pipColor = type === 'miss' ? (isD3 ? 'bg-black' : 'bg-black') : 'bg-white';

  // D3s always show numbers, D6s show pips
  if (isD3) {
    return (
      <div
        className={`inline-flex items-center justify-center border-2 rounded font-bold ${colors[type]}`}
        style={{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.6}px` }}
      >
        <span className="text-black">{value}</span>
      </div>
    );
  }

  // Pip positions for each die face
  const getPipPositions = (value: number) => {
    const positions: Record<number, string[]> = {
      1: ['center'],
      2: ['top-left', 'bottom-right'],
      3: ['top-left', 'center', 'bottom-right'],
      4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
      6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
    };
    return positions[value] || [];
  };

  const pips = getPipPositions(value);
  const pipSize = Math.max(2, size * 0.2);

  return (
    <div
      className={`relative inline-flex items-center justify-center border-2 rounded ${colors[type]}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {pips.map((position, i) => {
        const positionStyles: Record<string, any> = {
          'top-left': { top: '15%', left: '15%' },
          'top-right': { top: '15%', right: '15%' },
          'middle-left': { top: '50%', left: '15%', transform: 'translateY(-50%)' },
          'middle-right': { top: '50%', right: '15%', transform: 'translateY(-50%)' },
          'bottom-left': { bottom: '15%', left: '15%' },
          'bottom-right': { bottom: '15%', right: '15%' },
          'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        };

        return (
          <div
            key={i}
            className={`absolute rounded-full ${pipColor}`}
            style={{
              width: `${pipSize}px`,
              height: `${pipSize}px`,
              ...positionStyles[position]
            }}
          />
        );
      })}
    </div>
  );
}

interface RerollDiceProps {
  original: number;
  reroll: number;
  type: 'miss' | 'hit' | 'critical';
  size?: number;
}

function RerollDice({ original, reroll, type, size = 15 }: RerollDiceProps) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {/* Original die with strikethrough */}
      <div className="relative inline-block">
        <Die value={original} type="miss" size={size} />
        {/* Diagonal line through die */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-0.5 bg-red-500 rotate-45 transform"></div>
        </div>
      </div>

      {/* Arrow */}
      <span className="text-gray-400 text-xs mx-0.5">→</span>

      {/* New die */}
      <Die value={reroll} type={type} size={size} />
    </div>
  );
}

interface BonusSquareProps {
  count: number;
  size?: number;
}

function BonusSquare({ count, size = 15 }: BonusSquareProps) {
  return (
    <div
      className="inline-flex items-center justify-center border-2 rounded font-bold border-green-600"
      style={{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.5}px` }}
    >
      <span className="text-green-400">+{count}</span>
    </div>
  );
}

interface DiceDisplayProps {
  rolls: DiceRoll[];
  successIndices: number[];
  criticalIndices?: number[];
  sustainedHitsIndices?: number[]; // Indices of critical hits that generate sustained hits
  label?: string;
  size?: number;
}

export default function DiceDisplay({
  rolls,
  successIndices,
  criticalIndices = [],
  sustainedHitsIndices = [],
  label,
  size = 15
}: DiceDisplayProps) {
  const successSet = new Set(successIndices);
  const criticalSet = new Set(criticalIndices);
  const sustainedHitsSet = new Set(sustainedHitsIndices);

  const getDieType = (index: number): 'miss' | 'hit' | 'critical' => {
    if (criticalSet.has(index)) return 'critical';
    if (successSet.has(index)) return 'hit';
    return 'miss';
  };

  return (
    <div className="flex flex-wrap gap-1">
      {rolls.map((roll, index) => {
        const dieElement = roll.isReroll && roll.originalValue !== undefined ? (
          <RerollDice
            key={`die-${index}`}
            original={roll.originalValue}
            reroll={roll.value}
            type={getDieType(index)}
            size={size}
          />
        ) : (
          <Die key={`die-${index}`} value={roll.value} type={getDieType(index)} size={size} />
        );

        // Show +1 bonus square next to critical hits that generate sustained hits
        if (sustainedHitsSet.has(index)) {
          return (
            <div key={index} className="inline-flex items-center gap-1">
              {dieElement}
              <BonusSquare count={1} size={size} />
            </div>
          );
        }

        return <div key={index} className="inline-block">{dieElement}</div>;
      })}
    </div>
  );
}

interface AutoHitsDisplayProps {
  count: number;
  label?: string;
  size?: number;
}

export function AutoHitsDisplay({ count, label, size = 15 }: AutoHitsDisplayProps) {
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: count }, (_, i) => (
        <Die key={i} value={6} type="critical" size={size} />
      ))}
    </div>
  );
}
