/**
 * Reusable component for displaying active rules and their effects
 */

interface ActiveRule {
  id: string;
  name: string;
  description: string;
  effects: Array<{
    type: string;
    params: any;
  }>;
}

interface ActiveRulesDisplayProps {
  rules: ActiveRule[];
}

export default function ActiveRulesDisplay({ rules }: ActiveRulesDisplayProps) {
  if (rules.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <h4 className="text-xs font-medium text-gray-500 uppercase px-3 py-2">
        Active Rules
      </h4>
      <div className="px-3 pb-3 space-y-2">
        {rules.map((rule, index) => (
          <div key={index} className="text-xs">
            <p className="font-medium text-gray-300 mb-0.5">{rule.name}</p>
            <p className="text-gray-500 mb-1 leading-snug">{rule.description}</p>
            <div className="flex flex-wrap gap-1">
              {rule.effects.map((effect, effIndex) => {
                let effectText = '';
                if (effect.type === 'modify-hit' && effect.params.modifier) {
                  effectText = `+${effect.params.modifier} to Hit`;
                } else if (effect.type === 'modify-wound' && effect.params.modifier) {
                  effectText = `+${effect.params.modifier} to Wound`;
                } else if (effect.type === 'modify-characteristic') {
                  effectText = `+${effect.params.modifier} ${effect.params.stat}`;
                } else if (effect.type === 'add-keyword') {
                  effectText = effect.params.keywordValue
                    ? `${effect.params.keyword} ${effect.params.keywordValue}`
                    : effect.params.keyword;
                }

                if (effectText) {
                  return (
                    <span
                      key={effIndex}
                      className="bg-gray-700 text-gray-300 text-xs px-1.5 py-0.5 rounded"
                    >
                      {effectText}
                    </span>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
