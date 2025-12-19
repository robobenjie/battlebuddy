/**
 * API Route: Implement rule using OpenAI
 *
 * Takes raw rule text and uses OpenAI to generate a structured rule implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { OpenAIResponseSchema } from '@/lib/rules-engine/rule-schema';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/openai-prompt';

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
  rules?: any[];
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

    // Build prompts using shared functions
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({ ruleName, ruleText, faction, scope });

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

    // Rules are already validated by OpenAI structured outputs
    // Our schema now uses explicit nulls everywhere, so no conversion needed
    return NextResponse.json({
      success: true,
      rules: result.rules,
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
