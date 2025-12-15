/**
 * API Route: Implement rule using OpenAI
 *
 * Takes raw rule text and uses OpenAI to generate a structured rule implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { OpenAIResponseSchema } from '@/lib/rules-engine/rule-schema';
import { EXAMPLE_RULES } from '@/lib/rules-engine/example-rules';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ImplementRequest {
  ruleName: string;
  ruleText: string;
  faction?: string;
  scope?: string;
}

interface ImplementResponse {
  success: boolean;
  rule?: any;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ImplementRequest = await request.json();
    const { ruleName, ruleText, faction, scope } = body;

    if (!ruleName || !ruleText) {
      return NextResponse.json(
        { success: false, message: 'Missing ruleName or ruleText' },
        { status: 400 }
      );
    }

    // Build system prompt with examples
    const systemPrompt = buildSystemPrompt();

    // Build user prompt
    const userPrompt = `
RULE NAME: ${ruleName}
${faction ? `FACTION: ${faction}` : ''}
${scope ? `SCOPE: ${scope}` : ''}

RULE TEXT:
${ruleText}

Please convert this into a structured rule following the schema. 
Rules are mostly used to remind players of the rules at the appropriate time (e.g. an ability that triggers after they move).
The app also support automatic rolling of combat, so rules that affect combat calculations should be implemented modifying attributes and keywords for combat (and movement speed).

If this rule cannot be implemented as a reminder in a particular phase or can affect combat calculations in a way that is not expressible by the schema, respond with a message explaining why it cannot be implemented in the combat rules engine.`
    // Call OpenAI with structured output using Zod schema
    const completion = await openai.chat.completions.parse({
      model: 'gpt-5.2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: zodResponseFormat(OpenAIResponseSchema, 'rule_implementation'),
      temperature: 0.2,
    });

    const result = completion.choices[0].message.parsed;

    if (!result) {
      return NextResponse.json({
        success: false,
        message: 'Failed to parse response from OpenAI'
      }, { status: 500 });
    }

    if (!result.implementable) {
      return NextResponse.json({
        success: false,
        message: result.message || 'This rule cannot be implemented in the combat calculator.'
      });
    }

    // Rule is already validated by OpenAI structured outputs
    // Our schema now uses explicit nulls everywhere, so no conversion needed
    return NextResponse.json({
      success: true,
      rule: result.rule,
      message: result.message
    });

  } catch (error) {
    console.error('Error implementing rule:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(): string {
  // Format examples for the prompt
  const exampleTexts = EXAMPLE_RULES.map((rule, index) => {
    const exampleNumber = index + 1;
    const ruleJson = JSON.stringify(rule, null, 2);
    const factionLine = rule.faction ? 'Faction: ' + rule.faction : '';

    const lines = [
      '=== EXAMPLE ' + exampleNumber + ': ' + rule.name + ' ===',
      'INPUT:',
      'Name: ' + rule.name,
      factionLine,
      'Scope: ' + rule.scope,
      '',
      'Rule Text:',
      rule.description,
      '',
      'OUTPUT:',
      ruleJson,
      ''
    ];

    return lines.filter(line => line !== undefined).join('\n');
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
    '  "message": "This rule affects roster building and unit attachment. It should be handled during army list creation."',
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
    '4. If it is not clear how a rule should be implemented, respond with a message explaining why it cannot be implemented in the combat rules engine.',
    '',
    'KEY SCHEMA CONCEPTS:',
    '',
    '**Conditions** (rule-level): Must ALL be true for rule to apply',
    '- target-category: Target has specific keyword (VEHICLE, MONSTER, etc.)',
    '- weapon-type: Weapon is ranged or melee',
    '- unit-status: Unit has status (charged, remained-stationary, etc.)',
    '- is-leading: Model is leading a unit',
    '- combat-role: Unit is attacker or defender',
    '',
    '**Effects**: What happens when conditions are met',
    '- modify-hit: Modify hit roll threshold (+1 to hit = modifier: 1)',
    '- modify-wound: Modify wound roll threshold',
    '- modify-characteristic: Modify weapon/model stat (S, A, AP, D, WS)',
    '- add-keyword: Add weapon keyword (Lethal Hits, Sustained Hits 1, etc.)',
    '- reroll: Allow rerolls (hit/wound/damage, all/failed/ones)',
    '',
    '**User Input** (NEW SCHEMA): For rules requiring player decisions',
    '- Type: toggle (yes/no), radio (pick one), select (pick multiple)',
    '- Effects for this kind of rule go in userInput.options[].effects, NOT in effect.conditions',
    '- Example: "5-9 models" option has effects: [{ type: \'modify-characteristic\', params: { stat: \'S\', modifier: 1 }}]',
    '',
    '**Effect-level conditions**: Conditions on individual effects (e.g., combat-role for attacker/defender)',
    '',
    '**appliesTo**: Who effect applies to',
    '- \'all\': Everyone (default)',
    '- \'leader\': Only the leader model',
    '- \'bodyguard\': Only the bodyguard models (unit being led)',
    '',
    '**Activation**: When/how the rule activates',
    '- type: manual or automatic',
    '- phase: movement, shooting, charge, fight, any',
    '- limit: once-per-battle, once-per-turn, unlimited',
    '',
    '**Duration**: How long effects last',
    '- permanent: Always active',
    '- turn: Until end of turn',
    '- phase: Until end of phase',
    '',
    'Here are validated examples of correctly implemented rules:',
    exampleTexts,
    nonImplementableExample,
    '',
    'Now, convert the following rule following these examples and guidelines.'
  ].join('\n');

  return systemPrompt;
}
