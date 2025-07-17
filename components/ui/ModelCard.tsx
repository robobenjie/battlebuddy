'use client';

import StatTable from './StatTable';
import { WeaponList } from './WeaponCard';

interface ModelCardProps {
  model: {
    id: string;
    name: string;
    count: number;
    characteristics: Array<{
      name: string;
      value: string;
    }>;
  };
  weapons?: Array<{
    id: string;
    name: string;
    type: string;
    count: number;
    characteristics: Array<{
      name: string;
      value: string;
    }>;
    profiles?: Array<{
      name: string;
      characteristics: Array<{
        name: string;
        value: string;
      }>;
    }>;
  }>;
  onKeywordClick?: (name: string, description?: string) => void;
  className?: string;
  compact?: boolean;
  showWeapons?: boolean;
}

export default function ModelCard({ 
  model, 
  weapons = [],
  onKeywordClick, 
  className = '',
  compact = false,
  showWeapons = true
}: ModelCardProps) {
  // Remove model icon functionality

  // Model weapons (if any)
  const modelWeapons = weapons.filter(w => w.id); // Basic filter, could be more sophisticated

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-750 px-3 py-2 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-white text-sm">{model.name}</h4>
            {model.count > 1 && (
              <span className="text-xs text-gray-400">×{model.count}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-3">
        <StatTable 
          characteristics={model.characteristics} 
          type="model"
          className={compact ? 'mb-2' : 'mb-3'}
        />

        {/* Weapons */}
        {showWeapons && modelWeapons.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Weapons
            </div>
            <WeaponList
              weapons={modelWeapons}
              onKeywordClick={onKeywordClick}
              groupByType={!compact}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Component for displaying multiple models in a list
interface ModelListProps {
  models: ModelCardProps['model'][];
  weapons?: ModelCardProps['weapons'];
  onKeywordClick?: (name: string, description?: string) => void;
  className?: string;
  compact?: boolean;
  showWeapons?: boolean;
}

export function ModelList({ 
  models, 
  weapons = [],
  onKeywordClick, 
  className = '',
  compact = false,
  showWeapons = true 
}: ModelListProps) {
  if (!models || models.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        No models
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {models.map((model) => {
        // Filter weapons for this specific model
        const modelWeapons = weapons.filter(w => w.id); // This would need proper filtering by modelId
        
        return (
          <ModelCard
            key={model.id}
            model={model}
            weapons={modelWeapons}
            onKeywordClick={onKeywordClick}
            compact={compact}
            showWeapons={showWeapons}
          />
        );
      })}
    </div>
  );
}

// Summary component showing model counts and basic stats
interface ModelSummaryProps {
  models: ModelCardProps['model'][];
  className?: string;
}

export function ModelSummary({ models, className = '' }: ModelSummaryProps) {
  if (!models || models.length === 0) {
    return null;
  }

  const totalModels = models.reduce((sum, model) => sum + model.count, 0);
  const uniqueTypes = models.length;

  // Calculate average stats (if useful)
  const avgToughness = models.length > 0 
    ? Math.round(
        models.reduce((sum, model) => {
          const t = parseInt(model.characteristics.find(c => c.name === 'T')?.value || '0');
          return sum + t * model.count;
        }, 0) / totalModels
      )
    : 0;

  const avgWounds = models.length > 0
    ? Math.round(
        models.reduce((sum, model) => {
          const w = parseInt(model.characteristics.find(c => c.name === 'W')?.value || '0');
          return sum + w * model.count;
        }, 0) / totalModels
      )
    : 0;

  return (
    <div className={`bg-gray-750 rounded-lg p-3 ${className}`}>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-400 text-xs uppercase tracking-wider">Models</div>
          <div className="text-white font-medium">{totalModels}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs uppercase tracking-wider">Types</div>
          <div className="text-white font-medium">{uniqueTypes}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs uppercase tracking-wider">Avg T</div>
          <div className="text-white font-medium">{avgToughness}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs uppercase tracking-wider">Avg W</div>
          <div className="text-white font-medium">{avgWounds}</div>
        </div>
      </div>
    </div>
  );
} 