Rules Schema v2 Design Notes (for LLM + humans)

This doc explains the reasoning and constraints behind the v2 rules representation used by the app’s LLM-powered “rule parser”.

Goals

Small, low-noise examples
The previous schema required many null fields (because “optional” fields weren’t supported by Structured Outputs). That made examples wordy and increased the chance of “context rot” in the model.

High confidence: “parses ⇒ likely works”
We want the schema to be strict enough that if JSON passes validation, it probably maps cleanly onto behaviors the app can execute.

Model-friendly generation
We prefer discriminated unions with small variants, not “parameter bags” with many unused keys.

Support OR / NOT without duplicating rules
Old schema used implicit AND and implemented OR by creating multiple duplicate rules. v2 supports arbitrary boolean nesting.

Key Constraints from OpenAI Structured Outputs

Outputs must conform to a provided JSON Schema under strict: true.

How OpenAI Structured Outputs Differ from “Vanilla” JSON / JSON Schema

OpenAI Structured Outputs use a strict subset of JSON Schema, and schemas must be designed differently than general-purpose JSON APIs. The key differences and constraints are:

Strict conformance is enforced
When using response_format: { type: "json_schema", strict: true }, the model must output JSON that exactly matches the schema.

Extra fields are not allowed

Missing required fields are not allowed

The model will not “partially” match the schema

“Optional” fields are effectively unsupported
While JSON Schema allows optional properties, OpenAI Structured Outputs behave as if:

every defined property is required, unless

the schema explicitly encodes optionality via a union (e.g. anyOf including a variant without the field)

Design implication: optional data must be modeled as separate union variants, not as nullable or missing properties.

Discriminated unions must be explicit
Features like oneOf, dependentSchemas, or advanced conditionals are not fully supported.
The reliable pattern is:

use anyOf

include a required discriminator field (e.g. t, kind)

make each variant a fully-specified object

additionalProperties must be disabled
Schemas must forbid unknown fields (e.g., additionalProperties: false, Zod .strict()), otherwise the output may be rejected.
This also prevents the model from inventing keys.

Recursive schemas are allowed, but must be simple
Recursive definitions (e.g., a boolean expression tree) are supported, but only when built from:

objects

arrays

anyOf
Avoid advanced JSON Schema features such as references with complex conditions.

Enums are strongly preferred over free strings
Enums significantly reduce hallucinations and near-miss outputs (e.g., "lethal hits" vs "lethalHits").
Unlike vanilla JSON, where strings are flexible, Structured Outputs reward tight enumerations.

No implicit defaults or computed fields
Unlike many JSON APIs:

default values are not injected

omitted fields are not auto-filled
If a value is required, it must appear explicitly in the output.

The model will force-fit the schema if not given an escape hatch
If the input cannot be represented, the model will still try to produce valid JSON unless given a way to fail safely.

Design implication: include an explicit failure path (e.g., implementable: false, rules: null, message: "…") instead of relying on partial output or comments.

JSON only — no comments, no trailing commas
The output must be pure JSON:

no comments

no trailing commas

Top-level response shape (unchanged)

We keep the existing outer response contract:

export const OpenAIResponseSchema = z.object({
  implementable: z.boolean(),
  message: z.string(),
  rules: z.union([z.array(RuleSchema).min(1), z.null()])
}).strict();

Semantics

implementable: true means: rules are provided and should be executable by the app.

implementable: false means: rules are absent (rules: null) and message explains what could not be represented.

message should be short, user-readable, and point out missing constructs or ambiguous inputs.

Core Schema Decisions
1) Conditions become a Boolean Expression AST (when)

Problem: conditions were implicit AND; OR required duplicating entire rules.

Solution: when is a recursive expression tree:

{t:"true"} and {t:"false"} for obvious unconditional / disabled behavior

{t:"all", xs:[...]} for AND

{t:"any", xs:[...]} for OR

{t:"not", x: ...} for NOT

leaf nodes are “atoms” like {t:"weaponType", any:["melee"]}

Why this is good

Arbitrary nesting supports complex logic without duplicated rules.

{t:"true"} makes unconditional rules visually obvious (no subtle “empty AND” semantics).

Atoms are a discriminated union, so we avoid a giant params bag.

2) Effects are tagged unions (Fx) — no params bags

Problem: effects used a shared params object containing many nullable fields; Structured Outputs forced those nulls to be explicit everywhere.

Solution: each effect type is its own strict shape:

modWeaponStat / modHit / modWound

reroll

typed “add ability” effects (see below)

typed numeric properties like setInvuln

Why this is good

Much smaller JSON output (no nulls).

Stronger validation (wrong fields can’t appear).

Easier to visually inspect.

3) Conditional effects live in Blocks, not in each effect

Problem: each effect had optional conditions, causing null spam.

Solution: then is an array of Blocks:

{t:"do", fx:[...]} — apply effects

{t:"if", when: When, then: Block[]} — conditional branches

Why this is good

Conditional logic is explicit and nestable.

No per-effect optional condition fields.

4) Choices are a rule kind (kind:"choice") with explicit lifetime

Problem: userInput existed on every rule and was null most of the time.

Solution: rules are a discriminated union:

kind:"passive" (has then)

kind:"choice" (has choice)

kind:"reminder" (no mechanics; only description + trigger/when)

Choice structure:

prompt

options[], each option has then

lifetime: {t:"roll"|"turn"|"game"}

Guideline

If a rule needs user options to affect dice math, represent it as kind:"choice".

If it’s just a reminder in a phase, use kind:"reminder" and do not invent fake effects.

Typed Abilities (avoid stringly-typed keywords)

Problem: freeform keyword strings create drift:
InvulnerableSave vs invulnerable_save vs INV etc.

Solution: model keywords/abilities as typed enums + typed parameterized abilities:

Weapon abilities: lethalHits, hazardous, sustainedHits(x), rapidFire(x), etc.

Unit abilities: deepStrike, scouts(distance), feelNoPain(threshold), etc.

Important rule

If the ability has a number, model it as a parameterized ability or a dedicated property effect.

Example: use setInvuln(n) rather than “addKeywordN invulnerableSave=5”.

Fallback behavior

If an input refers to an ability not in the enum set and we haven’t implemented it yet:

set implementable:false

rules:null

explain what ability/effect is missing in message

This prevents the model from inventing new identifiers.

Practical Authoring Rules for the LLM

When generating rules:

Never emit unused fields
Every object is strict. Do not include extra keys.

Use canonical IDs
Keywords/abilities must match the allowed enum values exactly (e.g., lethalHits).

Prefer the smallest representation

Use when: {t:"true"} for unconditional.

Use reminder when there is no mechanical effect.

No rule duplication to implement OR
Use when: {t:"any", xs:[...]}
(or nested all/any/not) instead.

If you can’t represent it, fail cleanly
Return:

implementable:false

rules:null

message:"Missing effect type for …"

Non-goals (for now)

Full mathematical expressions (min/max/cap/multiply) — introduce new Fx variants if needed.

Full coverage of every 40k rule concept — we grow the union variants intentionally over time.

Summary

Schema v2 reduces verbosity and increases reliability by:

replacing param-bags with discriminated unions,

representing conditions as a boolean expression tree,

moving conditional logic into structured blocks,

typing abilities to eliminate naming drift,

preserving a clean failure mode (implementable/message) so the model doesn’t hallucinate unsupported constructs.

If the JSON validates, it should be mechanically implementable with high confidence.