import { Rule, evaluateWhen } from './rules-engine';

interface BuildCombatActiveRulesParams {
  attackerRules: Rule[];
  defenderRules: Rule[];
  appliedAttackerRules: Rule[];
  appliedDefenderRules: Rule[];
  attackerContext: any;
  defenderContext: any;
}

export function buildCombatActiveRules(params: BuildCombatActiveRulesParams): Rule[] {
  const {
    attackerRules,
    defenderRules,
    appliedAttackerRules,
    appliedDefenderRules,
    attackerContext,
    defenderContext
  } = params;

  const conditionalAttackerRules = attackerRules.filter((rule) => {
    if (appliedAttackerRules.some((r) => r.id === rule.id)) return false;
    if (rule.kind !== 'choice') return false;
    return evaluateWhen(rule.when, attackerContext);
  });

  const conditionalDefenderRules = defenderRules.filter((rule) => {
    if (appliedDefenderRules.some((r) => r.id === rule.id)) return false;
    if (rule.kind !== 'choice') return false;
    // Only surface defender-side unresolved choices that are explicitly reactive,
    // or clearly defender-scoped by condition.
    if (rule.trigger?.t !== 'reactive' && !hasDefenderCombatRoleCondition(rule.when)) {
      return false;
    }
    return evaluateWhen(rule.when, defenderContext);
  });

  return [...appliedAttackerRules, ...conditionalAttackerRules, ...conditionalDefenderRules];
}

function hasDefenderCombatRoleCondition(when: any): boolean {
  if (!when || typeof when !== 'object') return false;

  if (when.t === 'combatRole' && when.is === 'defender') {
    return true;
  }

  if ((when.t === 'all' || when.t === 'any') && Array.isArray(when.xs)) {
    return when.xs.some((x: any) => hasDefenderCombatRoleCondition(x));
  }

  if (when.t === 'not' && when.x) {
    return hasDefenderCombatRoleCondition(when.x);
  }

  return false;
}
