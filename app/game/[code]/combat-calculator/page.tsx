'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '../../../../lib/db';
import UnitCard from '../../../../components/ui/UnitCard';
import { formatUnitForCard } from '../../../../lib/unit-utils';

export default function CombatCalculatorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId') || '';
  const unitId = searchParams.get('unitId') || '';

  // Query the unit data
  const { data: unitData } = db.useQuery({
    units: {
      $: {
        where: {
          id: unitId,
        }
      }
    }
  });

  // Query models for this unit
  const { data: modelsData } = db.useQuery({
    models: {
      $: {
        where: {
          unitId: unitId,
        }
      }
    }
  });

  // Query weapons for this unit (via models)
  const { data: weaponsData } = db.useQuery({
    weapons: {
      $: {
        where: {
          gameId: gameId,
        }
      }
    }
  });

  const unit = unitData?.units?.[0];
  const models = modelsData?.models || [];
  const weapons = weaponsData?.weapons || [];

  const handleBack = () => {
    router.back();
  };

  if (!unit) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Combat Calculator</h1>
            <p className="text-gray-400 mb-6">Unit not found</p>
            <button
              onClick={handleBack}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const unitDataForCard = formatUnitForCard(unit);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Combat Calculator</h1>
          <button
            onClick={handleBack}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Back
          </button>
        </div>

        {/* Unit Card */}
        <div className="max-w-2xl mx-auto">
          <UnitCard
            unit={unitDataForCard.unit}
            expandable={true}
            defaultExpanded={true}
            className="border-0"
          />
        </div>

        {/* Placeholder for future combat calculator features */}
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Combat Calculator Features</h2>
            <div className="space-y-3 text-gray-400 text-sm">
              <p>• Target Selection</p>
              <p>• Weapon Profile Selection</p>
              <p>• Hit Roll Calculator</p>
              <p>• Wound Roll Calculator</p>
              <p>• Save Roll Calculator</p>
              <p>• Damage Application</p>
              <p>• Casualty Tracking</p>
            </div>
            <div className="mt-6">
              <p className="text-gray-500 text-xs">Advanced combat calculator features coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 