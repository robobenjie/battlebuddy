/**
 * Attack Roll Calculation Module
 * --------------------------------
 * This module is a planning/stub implementation for how shooting/melee attack
 * resolution could be handled in BattleBuddy.  The intention is that other
 * parts of the app (UI components, dice rolling logic) will feed data into the
 * functions exported here.  No dice rolling or randomisation happens yet – the
 * goal is to define the data structures and the information required from the
 * UI so that we can later implement an automated roller.
 *
 * The steps of resolving an attack generally follow the Warhammer 40k 10th
 * edition sequence:
 *   1. Calculate attacks (number of dice to roll)
 *   2. Roll to hit / determine hits
 *   3. Roll to wound / determine wounds
 *   4. Target makes armour saves and/or invulnerable saves
 *   5. Allocate damage to models
 *
 * Weapon abilities from `RulePopup.tsx` (e.g. Rapid Fire X, Melta X, Sustained
 * Hits X, etc.) can modify several of these steps.  Some abilities care about
 * the target being within half range – therefore we need to know how many
 * attacking models/weapons are in half range.  Others care about cover or other
 * conditions around the target.  This file tries to outline a consistent way to
 * collect all that context so we can display clear instructions to the player
 * and also feed precise instructions to a future dice rolling engine.
 *
 * ## Overview of Approach
 * - The `createAttackPlan` function will analyse a list of models with their
 *   weapons plus the target unit.  It will return an `AttackPlan` consisting of
 *   two parts:
 *     1. `requirements` – a list of extra information the UI must ask the user
 *        for before rolling (e.g. "How many models are within half range?", "Is
 *        the target in cover?" ).
 *     2. `steps` – a structured description of each roll that needs to happen.
 *        These steps can be rendered to the user as human readable text and can
 *        also be interpreted by a dice rolling module later.
 *
 * - Each step includes the base number of dice, target numbers and any special
 *   rules that modify the results (extra hits on 6s, rerolls, modifiers, etc).
 *
 * - Nothing in this file mutates game state.  It simply describes what should
 *   happen.  Actual application of wounds/updates to models will be done
 *   elsewhere once a dice roller provides the results.
 *
 * - This module deliberately does not depend on React or InstantDB so that it
 *   can be unit tested separately.
 */

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

/** Basic weapon profile information needed for dice calculations. */
export interface WeaponProfile {
  name: string;
  attacks: number; // base attacks (per weapon)
  skill: number;   // to hit value e.g. 4 means 4+
  strength: number;
  ap: number;      // armour penetration
  damage: number;  // base damage
  keywords: string[]; // parsed from the weapon's ability/keyword string
}

/** Representation of a weapon carried by a model. */
export interface WeaponInstance {
  id: string;
  count: number; // number of identical weapons on this model
  profile: WeaponProfile;
}

/** Minimal representation of a model for attack resolution. */
export interface AttackingModel {
  id: string;
  weapons: WeaponInstance[];
}

/** Target unit information that might affect rolls. */
export interface TargetUnit {
  id: string;
  toughness: number;
  save: number; // normal armour save
  invulnerableSave?: number; // optional invulnerable save
  keywords: string[];
}

// ---------------------------------------------------------------------------
// Attack planning data structures
// ---------------------------------------------------------------------------

/**
 * Describes a piece of information the UI must acquire from the user before the
 * attack can be fully resolved.
 */
export interface AttackRequirement {
  /** Machine friendly identifier */
  id: string;
  /** Text to display in the UI explaining what the user needs to provide */
  prompt: string;
  /** What type of value is expected */
  type: 'number' | 'boolean';
  /** Optional ability that triggered this requirement */
  relatedAbility?: string;
}

/**
 * Description of a single dice roll.  These are intentionally generic so that a
 * future dice rolling module can interpret them.
 */
export interface DiceRollSpec {
  rolls: number;      // number of dice to roll
  target: number;     // target value on a D6 (e.g. 4 means 4+)
  modifiers?: number; // cumulative modifiers to the roll
  explodeOn?: number; // value that causes extra hits/wounds (e.g. Sustained Hits)
  explodeAmount?: number; // how many extra results when explodeOn is rolled
  autoSuccessOn?: number; // value that auto wounds (e.g. Lethal Hits on 6s)
  reroll?: 'all' | 'ones'; // generic reroll info
}

/**
 * A single step in the attack sequence.  The `instruction` can be presented to
 * the user while the `roll` object describes how many dice and what target
 * number is needed.
 */
export interface AttackStep {
  step: 'attacks' | 'hit' | 'wound' | 'save' | 'damage';
  instruction: string;
  roll?: DiceRollSpec;
}

/** High level plan produced by {@link createAttackPlan}. */
export interface AttackPlan {
  requirements: AttackRequirement[];
  steps: AttackStep[];
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Analyse attacking models and a target unit to produce an {@link AttackPlan}.
 * This does not perform any random rolls – it merely prepares all the
 * information so the UI can ask the user for missing context and a dice rolling
 * service can later execute the plan.
 */
export function createAttackPlan(models: AttackingModel[], target: TargetUnit): AttackPlan {
  // TODO: analyse weapons and abilities to generate requirements and steps
  // At the moment we return empty structures.
  return { requirements: [], steps: [] };
}

/**
 * After the UI collects all required values it should call this to compute the
 * final list of dice rolls.  `inputs` maps requirement ids to the values supplied
 * by the user.
 */
export function finalizeAttackPlan(plan: AttackPlan, inputs: Record<string, any>): AttackStep[] {
  // TODO: incorporate user inputs and abilities to produce full roll specs
  return plan.steps;
}

// ---------------------------------------------------------------------------
// Helper stubs for UI requirement detection
// ---------------------------------------------------------------------------

/** Determine how many attacking weapons are within half range. */
export function requiresHalfRangeInfo(models: AttackingModel[]): AttackRequirement | null {
  // Scan for Rapid Fire, Melta or other half-range based abilities
  const hasHalfRangeAbility = models.some(m =>
    m.weapons.some(w =>
      w.profile.keywords.some(kw => kw.toLowerCase().startsWith('rapid fire') ||
                                    kw.toLowerCase().startsWith('melta') ||
                                    kw.toLowerCase().includes('half range'))
    )
  );

  if (!hasHalfRangeAbility) return null;

  return {
    id: 'modelsWithinHalfRange',
    prompt: 'How many attacking models are within half weapon range?',
    type: 'number',
  };
}

/** Determine if the target is receiving the Benefit of Cover. */
export function requiresCoverInfo(target: TargetUnit): AttackRequirement | null {
  // Some abilities like "Ignores Cover" or "Indirect Fire" interact with cover.
  if (target.keywords.includes('In Cover')) {
    return {
      id: 'targetInCover',
      prompt: 'Is the target unit in cover?',
      type: 'boolean',
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Notes / Future Work
// ---------------------------------------------------------------------------

/**
 * TODO:
 * - Parse weapon ability strings into structured rules so that calculations can
 *   automatically modify rolls (e.g. Blast adding attacks based on target model
 *   count, Twin-linked granting rerolls to wound, etc.).
 * - Store per-weapon range information in the data model.  Currently `WeaponData`
 *   does not expose range directly – other modules may need to be updated so
 *   that `WeaponProfile` here includes it.
 * - Implement the actual maths for converting weapon profiles and user inputs
 *   into a sequence of `AttackStep` objects with populated `DiceRollSpec`.
 * - Provide helper utilities to translate `AttackStep` structures into human
 *   readable strings (e.g. "24 attacks, hitting on 4+") for the UI.
 */

