/**
 * Reusable component for displaying active rules
 *
 * Note: This component now works with the new rules schema which uses
 * `then` blocks instead of a simple `effects` array. Since the effects
 * are now more complex (with conditionals, choices, etc.), we just display
 * the rule name and description rather than trying to parse all possible effects.
 */

interface ActiveRule {
  id: string;
  name: string;
  description: string;
}

interface ActiveRulesDisplayProps {
  rules: ActiveRule[];
}

export default function ActiveRulesDisplay({ rules }: ActiveRulesDisplayProps) {
  if (rules.length === 0) return null;

  // Group rules by name (remove duplicates)
  const uniqueRulesMap = new Map<string, ActiveRule>();

  for (const rule of rules) {
    if (!uniqueRulesMap.has(rule.name)) {
      uniqueRulesMap.set(rule.name, rule);
    }
  }

  const uniqueRules = Array.from(uniqueRulesMap.values());

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <h4 className="text-xs font-medium text-gray-500 uppercase px-3 py-2">
        Active Rules
      </h4>
      <div className="px-3 pb-3 space-y-2">
        {uniqueRules.map((rule, index) => (
          <div key={index} className="text-xs">
            <p className="font-medium text-gray-300 mb-0.5">{rule.name}</p>
            <p className="text-gray-500 leading-snug">{rule.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
