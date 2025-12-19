import { z } from "zod";


/** ---------------------------
 *  Triggers / scope
 *  ---------------------------
 */
export const Scope = z.enum(["model", "unit", "army"]);
export const Turn = z.enum(["own", "opponent", "both"]);
export const TriggerType = z.enum(["automatic", "manual", "reactive"]);
export const Limit = z.enum(["none", "once-per-turn", "once-per-battle"]);

// 10th edition phases
export const Phase = z.enum(["command", "movement", "shooting", "charge", "fight", "any"]);

export const Trigger = z.object({
  t: TriggerType,
  phase: z.union([Phase, z.array(Phase).min(1)]), // Single phase or array of phases
  turn: Turn,
  limit: Limit,
}).strict();

/** ---------------------------
 *  Typed abilities (Wahapedia-derived starter set)
 *  ---------------------------
 */

// Flag-like unit abilities (no parameters)
export const UnitAbilityFlag = z.enum([
  "deepStrike",
  "fightsFirst",
  "infiltrators",
  "leader",
  "loneOperative",
]);

// Parameterized unit abilities
export const UnitAbility = z.union([
  z.object({ t: z.literal("deadlyDemise"), x: z.number().int().min(1) }).strict(),
  z.object({ t: z.literal("feelNoPain"), threshold: z.number().int().min(2).max(6) }).strict(),
  z.object({ t: z.literal("scouts"), distance: z.number().int().min(1).max(12) }).strict(),
  z.object({ t: z.literal("flag"), id: UnitAbilityFlag }).strict(),
]);

// Flag-like weapon abilities (no parameters)
export const WeaponAbilityFlag = z.enum([
  "assault",
  "blast",
  "devastatingWounds",
  "hazardous",
  "heavy",
  "ignoresCover",
  "indirectFire",
  "lethalHits",
  "pistol",
  "torrent",
  "twinLinked",
]);

// Parameterized weapon abilities
export const WeaponAbility = z.union([
  z.object({ t: z.literal("rapidFire"), x: z.number().int().min(1) }).strict(),
  z.object({ t: z.literal("sustainedHits"), x: z.number().int().min(1) }).strict(),
  z.object({
    t: z.literal("anti"),
    keyword: z.string(),                    // could later be a typed keyword enum if you want
    threshold: z.number().int().min(2).max(6),
  }).strict(),
  z.object({ t: z.literal("flag"), id: WeaponAbilityFlag }).strict(),
]);

/** ---------------------------
 *  Conditions / When AST
 *  ---------------------------
 */
export const Atom = z.union([
  z.object({ t: z.literal("true") }).strict(),
  z.object({ t: z.literal("false") }).strict(),

  z.object({ t: z.literal("weaponType"), any: z.array(z.enum(["ranged", "melee"])).min(1) }).strict(),
  z.object({ t: z.literal("targetCategory"), any: z.array(z.string()).min(1) }).strict(),
  z.object({ t: z.literal("unitStatus"), has: z.array(z.string()).min(1) }).strict(),
  z.object({ t: z.literal("armyState"), is: z.array(z.string()).min(1) }).strict(),
  z.object({ t: z.literal("isLeading") }).strict(),

  // Optional: ability-based conditions (typed)
  z.object({ t: z.literal("weaponHasAbility"), ability: WeaponAbility }).strict(),
  z.object({ t: z.literal("unitHasAbility"), ability: UnitAbility }).strict(),
]);

export const When: z.ZodType<any> = z.lazy(() =>
  z.union([
    Atom,
    z.object({ t: z.literal("all"), xs: z.array(When).min(1) }).strict(),
    z.object({ t: z.literal("any"), xs: z.array(When).min(1) }).strict(),
    z.object({ t: z.literal("not"), x: When }).strict(),
  ])
);

/** ---------------------------
 *  Effects
 *  ---------------------------
 */
export const WeaponStat = z.enum(["S", "AP", "A", "D"]);
export const DefensiveStat = z.enum(["T", "SV"]);

export const Fx = z.union([
  // Dice modifiers - offensive (when this unit attacks)
  z.object({ t: z.literal("modHit"), add: z.number().int() }).strict(),
  z.object({ t: z.literal("modWound"), add: z.number().int() }).strict(),

  // Dice modifiers - defensive (when this unit is attacked)
  z.object({ t: z.literal("modHitAgainst"), add: z.number().int() }).strict(),
  z.object({ t: z.literal("modWoundAgainst"), add: z.number().int() }).strict(),

  // Weapon stats (offensive)
  z.object({ t: z.literal("modWeaponStat"), stat: WeaponStat, add: z.number().int() }).strict(),

  // Defensive stats
  z.object({ t: z.literal("modDefensiveStat"), stat: DefensiveStat, add: z.number().int() }).strict(),

  // Add typed abilities (no stringly-typed keywords)
  z.object({ t: z.literal("addWeaponAbility"), ability: WeaponAbility }).strict(),
  z.object({ t: z.literal("addUnitAbility"), ability: UnitAbility }).strict(),

  // Save characteristics (invuln and FNP)
  z.object({ t: z.literal("setInvuln"), n: z.number().int().min(2).max(7) }).strict(),
  z.object({ t: z.literal("setFNP"), n: z.number().int().min(2).max(7) }).strict(),

  // Rerolls
  z.object({ t: z.literal("reroll"), phase: z.enum(["hit", "wound"]), kind: z.enum(["ones", "failed"]) }).strict(),
]);

/** ---------------------------
 *  Blocks (conditional then)
 *  ---------------------------
 */
export const Block: z.ZodType<any> = z.lazy(() =>
  z.union([
    // allow fx: [] so options can be “no-op” without dummy effects
    z.object({ t: z.literal("do"), fx: z.array(Fx) }).strict(),

    z.object({ t: z.literal("if"), when: When, then: z.array(Block).min(1) }).strict(),
  ])
);

export const Then = z.array(Block).min(1);

/** ---------------------------
 *  Choices
 *  ---------------------------
 */
export const Lifetime = z.union([
  z.object({ t: z.literal("roll") }).strict(),
  z.object({ t: z.literal("turn") }).strict(),
  z.object({ t: z.literal("game") }).strict(),
]);

export const Choice = z.object({
  id: z.string(),
  prompt: z.string(),
  lifetime: Lifetime,
  options: z.array(z.object({
    v: z.string(),
    label: z.string(),
    then: Then,
  }).strict()).min(2),
}).strict();

/** ---------------------------
 *  Rule variants
 *  ---------------------------
 */
export const RuleBase = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  faction: z.string(),
  scope: Scope,
  trigger: Trigger,
  when: When,
}).strict();

export const PassiveRule = RuleBase.extend({
  kind: z.literal("passive"),
  then: Then,
}).strict();

export const ChoiceRule = RuleBase.extend({
  kind: z.literal("choice"),
  choice: Choice,
}).strict();

export const ReminderRule = RuleBase.extend({
  kind: z.literal("reminder"),
}).strict();

export const RuleSchema = z.union([PassiveRule, ChoiceRule, ReminderRule]);

/** ---------------------------
 *  Plug into your top-level schema
 *  ---------------------------
 */
export const OpenAIResponseSchema = z.object({
  implementable: z.boolean(),
  message: z.string(),
  rules: z.union([z.array(RuleSchema).min(1), z.null()]),
}).strict();

/** ---------------------------
 *  TypeScript type exports
 *  ---------------------------
 */
export type Rule = z.infer<typeof RuleSchema>;
export type PassiveRuleType = z.infer<typeof PassiveRule>;
export type ChoiceRuleType = z.infer<typeof ChoiceRule>;
export type ReminderRuleType = z.infer<typeof ReminderRule>;
export type TriggerType = z.infer<typeof Trigger>;
export type WhenType = z.infer<typeof When>;
export type FxType = z.infer<typeof Fx>;
export type BlockType = z.infer<typeof Block>;
