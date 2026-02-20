import { RollDisplayModifierSources } from './combat-roll-display';

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
}

export function getCombatModifierSources(params: {
  attackerContext: { modifiers: { getModifiers: (stat: string) => Array<{ source: string }> } };
  defenderContext: { modifiers: { getModifiers: (stat: string) => Array<{ source: string }> } };
  keywords: string[];
}): RollDisplayModifierSources {
  const { attackerContext, defenderContext, keywords } = params;

  const hit = unique([
    ...attackerContext.modifiers.getModifiers('hit').map(m => m.source),
    ...defenderContext.modifiers.getModifiers('hit').map(m => m.source),
  ]);

  const wound = unique([
    ...attackerContext.modifiers.getModifiers('wound').map(m => m.source),
    ...defenderContext.modifiers.getModifiers('wound').map(m => m.source),
  ]);

  const rerollHit = unique([
    ...attackerContext.modifiers.getModifiers('reroll:hit:all').map(m => m.source),
    ...attackerContext.modifiers.getModifiers('reroll:hit:failed').map(m => m.source),
    ...attackerContext.modifiers.getModifiers('reroll:hit:ones').map(m => m.source),
  ]);

  const rerollWound = unique([
    ...attackerContext.modifiers.getModifiers('reroll:wound:all').map(m => m.source),
    ...attackerContext.modifiers.getModifiers('reroll:wound:failed').map(m => m.source),
    ...attackerContext.modifiers.getModifiers('reroll:wound:ones').map(m => m.source),
  ]);

  const damageReroll = unique([
    ...attackerContext.modifiers.getModifiers('reroll:damage:all').map(m => m.source),
    ...attackerContext.modifiers.getModifiers('reroll:damage:failed').map(m => m.source),
    ...attackerContext.modifiers.getModifiers('reroll:damage:ones').map(m => m.source),
    ...defenderContext.modifiers.getModifiers('reroll:damage:all').map(m => m.source),
    ...defenderContext.modifiers.getModifiers('reroll:damage:failed').map(m => m.source),
    ...defenderContext.modifiers.getModifiers('reroll:damage:ones').map(m => m.source),
  ]);

  return {
    hit,
    wound,
    rerollHit,
    rerollWound,
    damageReroll,
    keywords: keywords.map(kw => ({ keyword: kw, source: 'rule' })),
  };
}
