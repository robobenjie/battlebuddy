/**
 * OpenAI prompt utilities
 *
 * Provides the system prompt used for rule implementation with a placeholder
 * for the rule text insertion point.
 */

import { EXAMPLE_RULES, EXAMPLE_EXPLANATIONS } from './rules-engine/test-rules';

/**
 * Get the full OpenAI prompt with a placeholder for rule insertion
 * (for display purposes)
 */
export function getOpenAIPrompt(): string {
  const systemPrompt = buildSystemPrompt();
  const userPromptTemplate = buildUserPromptTemplate();

  return `${systemPrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER PROMPT TEMPLATE (sent with each rule):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${userPromptTemplate}`;
}

/**
 * Build the system prompt for OpenAI
 * Used by both the API route and the prompt display page
 */
export function buildSystemPrompt(): string {
  // Group rules by name to show multi-rule examples
  const groupedExamples: { name: string; rules: any[]; }[] = [];
  let currentGroup: { name: string; rules: any[]; } | null = null;

  for (const rule of EXAMPLE_RULES) {
    if (!currentGroup || currentGroup.name !== rule.name) {
      // Start new group
      currentGroup = { name: rule.name, rules: [rule] };
      groupedExamples.push(currentGroup);
    } else {
      // Add to existing group
      currentGroup.rules.push(rule);
    }
  }

  // Format examples for the prompt
  const exampleTexts = groupedExamples.map((group, index) => {
    const exampleNumber = index + 1;
    const firstRule = group.rules[0];
    const factionLine = firstRule.faction ? 'Faction: ' + firstRule.faction : '';

    // Get explanations for all rules in group
    const explanations = group.rules
      .map(r => EXAMPLE_EXPLANATIONS[r.id])
      .filter(e => e)
      .join(' ');

    // Create rules array JSON
    const rulesArrayJson = JSON.stringify(group.rules, null, 2);

    const lines = [
      '=== EXAMPLE ' + exampleNumber + ': ' + group.name + (group.rules.length > 1 ? ` (${group.rules.length} rules)` : '') + ' ===',
      explanations ? 'WHY: ' + explanations : null,
      '',
      'INPUT:',
      'Name: ' + group.name,
      factionLine,
      'Scope: ' + firstRule.scope,
      '',
      'Rule Text:',
      firstRule.description,
      '',
      'OUTPUT:',
      '{',
      '  "implementable": true,',
      '  "message": "",',
      '  "rules": ' + rulesArrayJson,
      '}',
      ''
    ];

    return lines.filter(line => line !== null && line !== undefined).join('\n');
  }).join('\n');

  // Add the non-implementable example
  const nonImplementableExample = [
    '=== EXAMPLE (NON-IMPLEMENTABLE): Unit Attachment ===',
    'INPUT:',
    'Name: Gretchin Alternative Attachment',
    'Rule Text:',
    'If a CHARACTER unit from your army with the Leader ability can be attached to a LOOTAS unit, it can be attached to this unit instead.',
    '',
    'OUTPUT:',
    '{',
    '  "implementable": false,',
    '  "message": "This rule affects roster building and unit attachment. It should be handled during army list creation.",',
    '  "rules": null',
    '}',
    ''
  ].join('\n');

  const systemPrompt = [
    'You are an expert at converting Warhammer 40,000 (10th Edition) rules text into structured JSON for a deterministic combat rules engine.',
    '',
    'IMPORTANT GUIDELINES:',
    '1. Most rules are just reminders that show up at the appropriate time (e.g. an ability that triggers after they move).',
    '2. The app also support automatic rolling of combat, so rules that affect combat calculations should be implemented modifying attributes and keywords for combat (and movement speed).',
    '3. Be precise - only extract explicitly stated rules, do not infer',
    '4. If the rule does not modify dice rolls in combat, and it is not clear how to represent it in the schema, it should probably be implemented as a reminder in a particular phase, even if it modifies other attributes or has other rule effects.',
    '5. If it is not clear how a rule can be implemented in the schema, respond with a message explaining why it cannot be implemented in the combat rules engine.',
    '6. IMPORTANT: A single written rule may needs MULTIPLE rule objects. Return an array with multiple rules when:',
    '   - The rule has multiple independent effects (e.g., Waaagh! grants <+1 Strenght and +1 Attacks> AND <5+ invuln>)',
    'KEY SCHEMA CONCEPTS:',
    '',
    '',
    '# Rules Schema v2 – Authoring Instructions',
    'You are converting Warhammer 40k rules text into a **strictly typed JSON rules schema** using OpenAI Structured Outputs.',
    'Your output **must exactly conform** to the schema. If a rule cannot be represented, fail cleanly.',
    '',
    '# 1) Scope',
    'What the rule applies to:',
    '- `model` – only the model with the ability',
    '- `unit` – the entire unit',
    '- `army` – the entire army',
    '- `detachment` – the entire detachment',
    'Choose the **smallest correct scope**.',
    '',
    '# 2) Rule Kind',
    'Each rule must be exactly one:',
    '- `passive` – automatic mechanical effects',
    '- `choice` – player decision affects mechanics',
    '- `reminder` – informational only (no mechanics)',
    '',
    '# 3) Trigger',
    'When the rule appears:',
    '- `t`: `automatic`, `manual`, or `reactive`',
    '- `phase`: movement, shooting, charge, fight, command, any',
    '- `turn`: `own`, `opponent`, or `both`',
    '- `limit`: `none`, `once-per-turn`, `once-per-battle`',
    'Use `reactive` only for opponent-turn reminders.',
    '',
    '# 4) Conditions (`when`)',
    'All conditions are a **boolean expression tree**:',
    '- `{t:"true"}` – unconditional',
    '- `{t:"all", xs:[...]}` – AND',
    '- `{t:"any", xs:[...]}` – OR',
    '- `{t:"not", x:...}` – NOT',
    'Atoms include:',
    '- `weaponType` (melee / ranged)',
    '- `targetCategory` (VEHICLE, MONSTER, etc.)',
    '- `unitStatus` (advanced, charged, etc.)',
    '- `armyState` (e.g. `waaagh-active`)',
    '- `isLeading`',
    '**Do not duplicate rules to express OR.**',
    '# 5) Effects (`then`)',
    'Effects are grouped into **Blocks**:',
    '- `{t:"do", fx:[...]}` – apply effects',
    '- `{t:"if", when:..., then:[...]}` – conditional branch',
    'Effects are **typed variants** (no param bags, no unused fields):',
    '- (offensive): `modWeaponStat`, `modHit`, `modWound`, (defensive): `modHitAgainst`, `modWoundAgainst`',
    '- `reroll`',
    '- `addWeaponAbility`, `addUnitAbility`',
    '- `setInvuln`',
    'If an effect has a number, use a **typed numeric effect**, not a keyword string.',
    '# 6) Typed Abilities (Important)',
    'Abilities are **canonical enums**, not free strings:',
    '- Examples: `lethalHits`, `hazardous`, `sustainedHits(x)`, `scouts(distance)`',
    '',
    '**Never invent new ability IDs.**',
    'If an ability is unsupported, fail cleanly.',
    '# 7) Choice Rules',
    'Use `kind:"choice"` when a player decision or state the app can\'t know about (like a die roll or wound count or distance to a target etc.) affects mechanics.',
    '',
    'Choice rules include:',  
    '- `prompt`',
    '- `lifetime`: `roll`, `turn`, or `game`',
    '- `options[]`, each with a `then` block',
    'All mechanical effects of a choice go **inside the option**.', 
    '# 8) Reminder Rules',
    'Use `kind:"reminder"` for rules with **no mechanical effects**:',
    '- charge-after-advance prompts',
    '- reactive opponent-turn reminders',
    'Reminder rules never include `then`.',
    '',
    '# 9) Failure Handling',
    'If a rule cannot be represented:',
    '- `implementable: false`',
    '- `rules: null`',
    '- Explain briefly in `message`',
    'Do **not** approximate or invent effects.',
    '',
    '# 10) Hard Rules',
    '- Output valid JSON only (no comments)',
    '- No `null`',
    '- No unknown fields',
    '- Use canonical enum values exactly',
    '- Prefer the smallest valid representation',
    '',
    '**Rule of thumb:**',
    '> If it validates, it should work. If it can’t work, fail cleanly.',
    '',
    '',
    exampleTexts,
    nonImplementableExample,
    '',
    'Now, convert the following rule following these examples and guidelines.'
  ].join('\n');

  return systemPrompt;
}

/**
 * Build the user prompt template with placeholders
 */
function buildUserPromptTemplate(): string {
  return `RULE NAME: {{RULE_NAME}}
FACTION: {{FACTION}} (optional)
SCOPE: {{SCOPE}} (optional)

RULE TEXT:
{{RULE_TEXT}}

Please convert this into a structured rule following the schema.
Rules are mostly used to remind players of the rules at the appropriate time (e.g. an ability that triggers after they move).
The app also support automatic rolling of combat, so rules that affect combat calculations should be implemented modifying attributes and keywords for combat (and movement speed).

If this rule cannot be implemented as a reminder in a particular phase or can affect combat calculations in a way that is not expressible by the schema, respond with a message explaining why it cannot be implemented in the combat rules engine.`;
}

/**
 * Build the user prompt for a specific rule
 * Used by the API route when actually calling OpenAI
 */
export function buildUserPrompt(params: {
  ruleName: string;
  ruleText: string;
  faction?: string;
  scope?: string;
}): string {
  const { ruleName, ruleText, faction, scope } = params;

  return `
RULE NAME: ${ruleName}
${faction ? `FACTION: ${faction}` : ''}
${scope ? `SCOPE: ${scope}` : ''}

RULE TEXT:
${ruleText}

Please convert this into a structured rule following the schema.
Rules are mostly used to remind players of the rules at the appropriate time (e.g. an ability that triggers after they move).
The app also support automatic rolling of combat, so rules that affect combat calculations should be implemented modifying attributes and keywords for combat (and movement speed).

If this rule cannot be implemented as a reminder in a particular phase or can affect combat calculations in a way that is not expressible by the schema, respond with a message explaining why it cannot be implemented in the combat rules engine.`;
}
