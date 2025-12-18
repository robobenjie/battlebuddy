/**
 * Zod schema for rule validation and OpenAI structured output
 *
 * All fields are required (as per OpenAI structured outputs requirements)
 * Optional fields use union with null: z.union([z.string(), z.null()])
 *
 * This is the single source of truth for rule validation.
 */

import { z } from 'zod';

// ===== ENUMS AND BASIC TYPES =====

export const RuleScopeSchema = z.enum(['weapon', 'unit', 'model', 'detachment', 'army']);

export const RuleDurationSchema = z.enum(['permanent', 'turn', 'phase', 'until-deactivated']);

export const ConditionTypeSchema = z.enum([
  'target-category',
  'weapon-type',
  'range',
  'unit-status',
  'army-state',
  'is-leading',
  'being-led',
  'combat-phase',
  'combat-role',
  'user-input'
]);

export const EffectTypeSchema = z.enum([
  'modify-hit',
  'modify-wound',
  'modify-characteristic',
  'add-keyword',
  'grant-ability',
  'modify-save',
  'reroll',
  'auto-success'
]);

export const EffectTargetSchema = z.enum(['self', 'weapon', 'unit', 'enemy']);

export const ConditionOperatorSchema = z.enum(['AND', 'OR']);

// ===== ACTIVATION =====

export const RuleActivationSchema = z.object({
  type: z.enum(['manual', 'automatic']),
  limit: z.union([z.enum(['once-per-battle', 'once-per-turn', 'unlimited']), z.null()]),
  phase: z.union([z.string(), z.null()]),
  turn: z.union([z.enum(['own', 'opponent', 'both']), z.null()])
}).strict();

// ===== CONDITION PARAMS =====

export const RuleConditionParamsSchema = z.object({
  categories: z.union([z.array(z.string()), z.null()]),
  weaponTypes: z.union([z.array(z.enum(['melee', 'ranged'])), z.null()]),
  range: z.union([z.object({
    operator: z.enum(['within-half', 'min', 'max']),
    value: z.union([z.number(), z.null()])
  }).strict(), z.null()]),
  statuses: z.union([z.array(z.string()), z.null()]),
  armyStates: z.union([z.array(z.string()), z.null()]),
  phases: z.union([z.array(z.string()), z.null()]),
  role: z.union([z.enum(['attacker', 'defender']), z.null()]),
  inputId: z.union([z.string(), z.null()]),
  inputValue: z.union([z.string(), z.number(), z.boolean(), z.null()])
}).strict();

// ===== CONDITION =====

export const RuleConditionSchema = z.object({
  type: ConditionTypeSchema,
  params: RuleConditionParamsSchema,
  operator: z.union([ConditionOperatorSchema, z.null()])
}).strict();

// ===== EFFECT PARAMS =====

export const RuleEffectParamsSchema = z.object({
  stat: z.union([z.enum(['WS', 'S', 'A', 'AP', 'D', 'T', 'SV', 'INV']), z.null()]),
  modifier: z.union([z.number(), z.null()]),
  keyword: z.union([z.string(), z.null()]),
  keywordValue: z.union([z.number(), z.null()]),
  ability: z.union([z.string(), z.null()]),
  abilityValue: z.union([z.string(), z.null()]),
  rerollType: z.union([z.enum(['all', 'failed', 'ones']), z.null()]),
  rerollPhase: z.union([z.enum(['hit', 'wound', 'damage']), z.null()]),
  autoPhase: z.union([z.enum(['hit', 'wound']), z.null()])
}).strict();

// ===== EFFECT =====

export const RuleEffectSchema = z.object({
  type: EffectTypeSchema,
  target: EffectTargetSchema,
  params: RuleEffectParamsSchema,
  conditions: z.union([z.array(RuleConditionSchema), z.null()])
}).strict();

// ===== USER INPUT =====

export const RuleUserInputSchema = z.object({
  type: z.enum(['toggle', 'radio', 'select']),
  id: z.string(),
  label: z.string(),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  options: z.union([z.array(z.object({
    value: z.union([z.string(), z.number(), z.boolean()]),
    label: z.string(),
    effects: z.union([z.array(RuleEffectSchema), z.null()])
  }).strict()), z.null()])
}).strict();

// ===== COMPLETE RULE SCHEMA =====

export const RuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  faction: z.union([z.string(), z.null()]),
  scope: RuleScopeSchema,
  conditions: z.array(RuleConditionSchema),
  effects: z.array(RuleEffectSchema),
  duration: RuleDurationSchema,
  activation: z.union([RuleActivationSchema, z.null()]),
  userInput: z.union([RuleUserInputSchema, z.null()]),
  reactive: z.boolean()
}).strict();

// Response schema for OpenAI API
export const OpenAIResponseSchema = z.object({
  implementable: z.boolean(),
  message: z.string(),
  rules: z.union([z.array(RuleSchema).min(1), z.null()])
}).strict();

// ===== TYPE EXPORTS =====

// Export inferred types from Zod schemas (useful for TypeScript)
export type RuleSchemaType = z.infer<typeof RuleSchema>;
export type RuleEffectSchemaType = z.infer<typeof RuleEffectSchema>;
export type RuleConditionSchemaType = z.infer<typeof RuleConditionSchema>;
export type RuleUserInputSchemaType = z.infer<typeof RuleUserInputSchema>;

// ===== VALIDATION HELPER =====

/**
 * Validates a rule against the schema and returns validation result
 */
export function validateRule(rule: unknown): { success: boolean; data?: RuleSchemaType; error?: z.ZodError } {
  const result = RuleSchema.safeParse(rule);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Validates a rule and throws if invalid
 */
export function parseRule(rule: unknown): RuleSchemaType {
  return RuleSchema.parse(rule);
}
