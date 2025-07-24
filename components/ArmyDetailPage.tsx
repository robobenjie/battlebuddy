'use client';

import { db } from '../lib/db';
import { UnitList } from './ui/UnitCard';
import { KeywordList, extractFactionKeywords } from './ui/KeywordBadge';
import RulePopup, { useRulePopup } from './ui/RulePopup';
import { formatUnitForCard, calculateArmyStats, getAllCategories } from '../lib/unit-utils';

interface ArmyDetailPageProps {
  armyId: string;
  user: any;
  onBack?: () => void;
}

export default function ArmyDetailPage({ armyId, user, onBack }: ArmyDetailPageProps) {
  const { isOpen, rule, showRule, hideRule } = useRulePopup();

  // Query army data with all related units, models, and weapons in one query
  const { data: armyData, isLoading: armyLoading } = db.useQuery({
    armies: {
      $: {
        where: {
          id: armyId,
          ownerId: user.id,
        },
      },
      units: {
        models: {
          weapons: {},
        },
      },
    },
  });

  const army = armyData?.armies?.[0];
  const isLoading = armyLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading army details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!army) {
    return (
      <div className="min-h-screen bg-gray-900 p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-300 mb-2">Army not found</h2>
            <p className="text-gray-400 mb-4">
              The requested army could not be found or you don't have access to it.
            </p>
            {onBack && (
              <button
                onClick={onBack}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Back to Armies
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Extract units from the army data
  const units = army.units || [];
  
  // Flatten all models and weapons from the nested structure
  const allModels = units.flatMap(unit => unit.models || []);
  const allWeapons = allModels.flatMap(model => model.weapons || []);

  // Organize data by relationships using utilities
  const unitsWithDetails = units.map(unit => {
    const unitModels = unit.models || [];
    const unitWeapons = unitModels.flatMap(model => model.weapons || []);
    return formatUnitForCard(unit, unitModels, unitWeapons);
  });

  // Calculate army statistics using utilities
  const { totalUnits, totalModels, totalWeapons } = calculateArmyStats(units, allModels, allWeapons);

  // Army-level keywords (could be extracted from all units)
  const allCategories = getAllCategories(units);
  const factionKeywords = [...new Set(extractFactionKeywords(allCategories))];

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 pt-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
            >
              ← Back to Armies
            </button>
          )}
          
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-red-500 mb-2">{army.name}</h1>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wider">Faction</div>
                    <div className="text-white font-medium">{army.faction}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wider">Created</div>
                    <div className="text-white font-medium">{army.createdAt ? formatDate(army.createdAt) : 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wider">Owner</div>
                    <div className="text-white font-medium">{army.ownerId}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wider">ID</div>
                    <div className="text-white font-medium text-xs">{army.id}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Army Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-700 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-semibold text-white">{totalUnits}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Units</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-white">{totalModels}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Models</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-white">{totalWeapons}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Weapons</div>
              </div>
            </div>

            {/* Faction Keywords */}
            <div className="mt-4 space-y-2">
              {factionKeywords.length > 0 && (
                <div>
                  <span className="text-gray-400 text-sm mr-2">Factions: </span>
                  <KeywordList
                    keywords={factionKeywords}
                    onKeywordClick={showRule}
                    variant="faction"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Units */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-200 mb-4">
            Units ({totalUnits})
          </h2>
          
          {unitsWithDetails.length > 0 ? (
            <UnitList
              units={unitsWithDetails}
              onKeywordClick={showRule}
              groupByType={true}
              expandable={true}
            />
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                No units found
              </h3>
              <p className="text-gray-400">
                This army doesn't have any units yet. This might be due to an import issue.
              </p>
            </div>
          )}
        </div>

        {/* Rule Popup */}
        <RulePopup
          isOpen={isOpen}
          onClose={hideRule}
          rule={rule}
        />
      </div>
    </div>
  );
} 