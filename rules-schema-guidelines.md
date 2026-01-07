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

How Rules Are Evaluated (Critical Concept)

IMPORTANT: Rules are evaluated PER-ATTACK, not once per game.

When a unit attacks:
1. The rules engine evaluates each rule's when condition against the current attack context
2. If when evaluates to TRUE, the effects (then) are applied to THIS ATTACK ONLY
3. If when evaluates to FALSE, the effects are NOT applied

Example: Psychic Hood grants FNP 4+ vs Psychic attacks

{
  "when": {
    "t": "all",
    "xs": [
      {"t": "isLeading"},
      {"t": "attackHasAbility", "ability": {"t": "flag", "id": "psychic"}}
    ]
  },
  "then": [{"t": "do", "fx": [{"t": "setFNP", "n": 4}]}]
}

This is evaluated for EVERY attack:
- Attack with psychic keyword: when = TRUE → FNP 4+ applied
- Attack without psychic keyword: when = FALSE → FNP 4+ NOT applied

The setFNP effect is NOT global - it only applies when the when condition is satisfied.

Effects Are Conditional, Not Permanent

DO NOT think of setFNP, setInvuln, modHit, etc. as "setting a permanent state"
They are modifiers applied ONLY IF the when condition is true for this specific attack

This means you CAN implement:
- FNP only vs psychic attacks (use attackHasAbility)
- +1 to hit only vs VEHICLE targets (use targetCategory)
- Reroll wounds only when charged (use unitStatus)
- Different effects based on weapon type (use weaponType)

Core Schema Decisions
1) Conditions become a Boolean Expression AST (when)

Problem: conditions were implicit AND; OR required duplicating entire rules.

Solution: when is a recursive expression tree:

{t:"true"} and {t:"false"} for obvious unconditional / disabled behavior

{t:"all", xs:[...]} for AND

{t:"any", xs:[...]} for OR

{t:"not", x: ...} for NOT

leaf nodes are "atoms" like {t:"weaponType", any:["melee"]}

Why this is good

Arbitrary nesting supports complex logic without duplicated rules.

{t:"true"} makes unconditional rules visually obvious (no subtle "empty AND" semantics).

Atoms are a discriminated union, so we avoid a giant params bag.

The when condition is evaluated per-attack, so effects can be contextual (e.g., FNP only vs psychic).

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

Weapon abilities: lethalHits, hazardous, psychic, sustainedHits(x), rapidFire(x), etc.

Unit abilities: deepStrike, scouts(distance), feelNoPain(threshold), etc.

Important rule

If the ability has a number, model it as a parameterized ability or a dedicated property effect.

Example: use setInvuln(n) rather than "addKeywordN invulnerableSave=5".

Available Condition Atoms

The when clause supports these condition types:

Offensive (checking your own attack):
- weaponType: {t:"weaponType", any:["melee"|"ranged"]}
- weaponHasAbility: {t:"weaponHasAbility", ability:WeaponAbility} (check your weapon)

Defensive (checking incoming attacks):
- attackHasAbility: {t:"attackHasAbility", ability:WeaponAbility} (check enemy weapon)
- attackHasKeyword: {t:"attackHasKeyword", any:["string"]} (free-text fallback)

Target checking:
- targetCategory: {t:"targetCategory", any:["VEHICLE", "INFANTRY", etc.]}

Unit state:
- unitStatus: {t:"unitStatus", has:["charged"|"moved"|"stationary"]}
- isLeading: {t:"isLeading"} (for leader abilities)

Game state:
- armyState: {t:"armyState", is:["waaagh-active", etc.]}
- isTargetedUnit: {t:"isTargetedUnit"} (for Oath of Moment)

Boolean:
- {t:"true"} / {t:"false"}
- {t:"all", xs:[...]} / {t:"any", xs:[...]} / {t:"not", x:...}

Defensive Abilities Checking Incoming Attacks

IMPORTANT: You CAN implement conditional defensive abilities.

For defensive abilities that grant bonuses against specific attack types (e.g., "FNP 4+ vs Psychic Attacks"):

Use attackHasAbility with typed canonical abilities:

{t:"attackHasAbility", ability:{t:"flag", id:"psychic"}}

This checks if the incoming weapon has the "psychic" keyword. The FNP is ONLY applied when this condition is TRUE.

Example: Psychic Hood rule grants FNP 4+ when defending against psychic attacks:

{
  "when": {
    "t": "all",
    "xs": [
      {"t": "isLeading"},
      {"t": "attackHasAbility", "ability": {"t": "flag", "id": "psychic"}}
    ]
  },
  "then": [{"t": "do", "fx": [{"t": "setFNP", "n": 4}]}]
}

This is implementable: true because:
- attackHasAbility checks the incoming attack's weapon
- setFNP only applies when the when condition is satisfied
- The effect is scoped to psychic attacks only

Available weapon ability flags: assault, blast, devastatingWounds, hazardous, heavy, ignoresCover, indirectFire, lethalHits, pistol, psychic, torrent, twinLinked.

Fallback behavior

If an input refers to an ability not in the enum set and we haven't implemented it yet:

set implementable:false

rules:null

explain what ability/effect is missing in message

This prevents the model from inventing new identifiers.

Practical Authoring Rules for the LLM

Common Implementability Mistakes

MISTAKE: "Cannot implement FNP only vs psychic attacks because setFNP would apply to all attacks"
CORRECT: setFNP is conditional - it ONLY applies when the when clause is TRUE

Example of what IS implementable:
"FNP 4+ vs Psychic attacks" ✅
{when: {t:"attackHasAbility", ability:{t:"flag", id:"psychic"}}, fx:[{t:"setFNP", n:4}]}

"Reroll wounds vs VEHICLE targets" ✅
{when: {t:"targetCategory", any:["VEHICLE"]}, fx:[{t:"reroll", phase:"wound", kind:"failed"}]}

"+1 to hit with melee weapons when charged" ✅
{when: {t:"all", xs:[{t:"weaponType", any:["melee"]}, {t:"unitStatus", has:["charged"]}]}, fx:[{t:"modHit", add:1}]}

Example of what is NOT implementable:
"Cannot use ability if within 6\" of terrain" ❌ (no distance/terrain checking)
"Gain CP on a 5+" ❌ (no CP modification effect)
"Allocate wounds to specific model" ❌ (no wound allocation control)

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

If you can't represent it, fail cleanly
Return:

implementable:false

rules:null

message:"Missing effect type for …" (be specific about what condition or effect is missing)

Non-goals (for now)

Full mathematical expressions (min/max/cap/multiply) — introduce new Fx variants if needed.

Full coverage of every 40k rule concept — we grow the union variants intentionally over time.

Summary

Schema v2 reduces verbosity and increases reliability by:

replacing param-bags with discriminated unions,

representing conditions as a boolean expression tree,

moving conditional logic into structured blocks,

typing abilities to eliminate naming drift,

evaluating rules per-attack (enabling conditional defensive abilities),

supporting incoming attack property checks (attackHasAbility),

preserving a clean failure mode (implementable/message) so the model doesn't hallucinate unsupported constructs.

CRITICAL: Effects (setFNP, modHit, etc.) are NOT global. They apply ONLY when the when condition is TRUE for a specific attack. This enables conditional defensive abilities like "FNP 4+ vs psychic attacks."

If the JSON validates, it should be mechanically implementable with high confidence.