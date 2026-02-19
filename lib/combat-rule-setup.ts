import { ArmyState, Rule } from './rules-engine';
import { getAllUnitRules } from './rules-engine/load-rules';

function parseRulesFromArmyRules(armyRules: any[] | undefined): Rule[] {
  const rules: Rule[] = [];
  for (const rule of armyRules || []) {
    if (!rule?.ruleObject) continue;
    try {
      const parsed = JSON.parse(rule.ruleObject);
      const asArray = Array.isArray(parsed) ? parsed : [parsed];
      rules.push(...asArray);
    } catch {
      // Ignore malformed rules and continue
    }
  }
  return rules;
}

function filterRulesForPhase(rules: Rule[], currentCombatPhase: 'shooting' | 'fight'): Rule[] {
  return rules.filter((rule: Rule) => {
    if (!rule.trigger?.phase) return true;
    const phases = Array.isArray(rule.trigger.phase) ? rule.trigger.phase : [rule.trigger.phase];
    return phases.includes('any') || phases.includes(currentCombatPhase as any);
  });
}

function dedupeRulesById(rules: Rule[]): Rule[] {
  const seen = new Set<string>();
  const deduped: Rule[] = [];
  for (const rule of rules) {
    if (seen.has(rule.id)) continue;
    seen.add(rule.id);
    deduped.push(rule);
  }
  return deduped;
}

export function prepareCombatRuleSetup(params: {
  game: any;
  currentArmyId?: string;
  unit: any;
  selectedTarget?: any;
  weaponType?: string;
  getUnitRulesFn?: (unit: any) => Rule[];
}): {
  currentCombatPhase: 'shooting' | 'fight';
  attackerRules: Rule[];
  defenderRules: Rule[];
  attackerArmyStates: ArmyState[];
  defenderArmyStates: ArmyState[];
} {
  const getUnitRulesFn = params.getUnitRulesFn || getAllUnitRules;
  const currentCombatPhase: 'shooting' | 'fight' = params.weaponType === 'melee' ? 'fight' : 'shooting';

  const currentArmy = params.game?.armies?.find((a: any) => a.id === params.currentArmyId);
  const attackerArmyRules = parseRulesFromArmyRules(currentArmy?.armyRules);
  const attackerUnitRules = filterRulesForPhase(getUnitRulesFn(params.unit) || [], currentCombatPhase);
  const attackerRules = dedupeRulesById([...attackerArmyRules, ...attackerUnitRules]);

  const defenderArmyId = params.selectedTarget?.armyId;
  const defenderArmy = params.game?.armies?.find((a: any) => a.id === defenderArmyId);
  const defenderArmyRules = parseRulesFromArmyRules(defenderArmy?.armyRules);
  const defenderUnitRules = filterRulesForPhase(
    params.selectedTarget ? (getUnitRulesFn(params.selectedTarget) || []) : [],
    currentCombatPhase
  );
  const defenderRules = dedupeRulesById([...defenderArmyRules, ...defenderUnitRules]);

  const attackerArmyStates: ArmyState[] = (currentArmy?.states || []).map((state: any) => ({
    ...state,
    armyId: params.currentArmyId || ''
  }));

  const defenderArmyStates: ArmyState[] = (defenderArmy?.states || []).map((state: any) => ({
    ...state,
    armyId: defenderArmyId || ''
  }));

  return {
    currentCombatPhase,
    attackerRules,
    defenderRules,
    attackerArmyStates,
    defenderArmyStates
  };
}
