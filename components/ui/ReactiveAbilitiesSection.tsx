'use client';

import UnitCard from './UnitCard';
import { formatUnitForCard } from '../../lib/unit-utils';
import { PhaseType } from '../../lib/rules-engine/reminder-utils';

interface ReactiveAbilitiesSectionProps {
  reactiveUnits: any[];
  currentPhase: PhaseType;
  phaseLabel: string; // e.g., "movement", "shooting", "charge", "command"
}

export default function ReactiveAbilitiesSection({
  reactiveUnits,
  currentPhase,
  phaseLabel
}: ReactiveAbilitiesSectionProps) {
  // Don't render if no reactive units
  if (reactiveUnits.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-purple-500">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-purple-300 mb-1">Reactive Abilities</h3>
        <p className="text-gray-400 text-sm">
          Opponent units with reactive {phaseLabel} abilities this phase
        </p>
      </div>

      <div className="space-y-3">
        {reactiveUnits.map(unit => {
          const unitData = formatUnitForCard(unit);
          return (
            <div key={unit.id} className="bg-gray-800/50 rounded-lg overflow-hidden border border-purple-500/30">
              <UnitCard
                unit={unitData.unit}
                expandable={true}
                defaultExpanded={false}
                className="border-0"
                currentPhase={currentPhase}
                currentTurn="opponent"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
