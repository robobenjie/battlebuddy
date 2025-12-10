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
    <div className="bg-purple-900 border-2 border-purple-500 rounded-lg overflow-hidden">
      <h4 className="font-semibold text-purple-200 px-4 py-3 bg-purple-950">
        ⚡ ACTIVE RULES
      </h4>
      <div className="p-4 space-y-3">
        {rules.map((rule, index) => (
          <div key={index} className="bg-purple-950 rounded p-3">
            <p className="font-semibold text-purple-200 mb-1">{rule.name}</p>
            <p className="text-xs text-purple-300 mb-2">{rule.description}</p>
            <div className="flex flex-wrap gap-2">
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
                      className="bg-purple-800 text-purple-100 text-xs px-2 py-1 rounded font-semibold"
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
