/**
 * Type definitions for the rules engine
 */

/**
 * Scope defines what level the rule applies at
 */
export type RuleScope = 'weapon' | 'unit' | 'model' | 'detachment' | 'army';

/**
 * Duration defines how long a rule effect lasts
 */
export type RuleDuration = 'permanent' | 'turn' | 'phase' | 'until-deactivated';

/**
 * Activation defines how a rule is triggered
 */
export interface RuleActivation {
  type: 'manual' | 'automatic';
  limit?: 'once-per-battle' | 'once-per-turn' | 'unlimited';
  phase?: 'command' | 'movement' | 'shooting' | 'charge' | 'fight' | 'before-game-start' | string;
  turn?: 'own' | 'opponent' | 'both'; // Whose turn the ability activates on
}

/**
 * Condition types that can be checked
 */
export type ConditionType =
  | 'target-category'      // Target has specific category (MONSTER, VEHICLE, etc.)
  | 'weapon-type'          // Weapon is melee or ranged
  | 'range'                // Range-based conditions (within half, etc.)
  | 'unit-status'          // Unit has specific status (charged, moved, etc.)
  | 'army-state'           // Army has specific state (waaagh-active, etc.)
  | 'is-leading'           // Model is leading a unit
  | 'being-led'            // Unit is being led by a model
  | 'combat-phase'         // Specific combat phase (shooting, melee)
  | 'combat-role'          // Unit's role in combat (attacker or defender)
  | 'user-input';          // Check user-provided input value

/**
 * Effect types that can be applied
 */
export type EffectType =
  | 'modify-hit'           // Modify hit roll threshold
  | 'modify-wound'         // Modify wound roll threshold
  | 'modify-characteristic' // Modify model/weapon characteristic
  | 'add-keyword'          // Add keyword to weapon
  | 'grant-ability'        // Grant special ability
  | 'modify-save'          // Modify save value
  | 'reroll'               // Allow rerolls
  | 'auto-success';        // Automatic success on phase

/**
 * Target of an effect
 */
export type EffectTarget = 'self' | 'weapon' | 'unit' | 'enemy';

/**
 * Operator for combining conditions
 */
export type ConditionOperator = 'AND' | 'OR';

/**
 * Parameters for different condition types
 */
export interface RuleConditionParams {
  // For target-category
  categories?: string[];

  // For weapon-type
  weaponTypes?: ('melee' | 'ranged')[];

  // For range
  range?: {
    operator: 'within-half' | 'min' | 'max';
    value?: number;
  };

  // For unit-status
  statuses?: string[];

  // For army-state
  armyStates?: string[];

  // For combat-phase
  phases?: string[];

  // For combat-role
  role?: 'attacker' | 'defender';

  // For user-input
  inputId?: string;      // ID of the user input to check
  inputValue?: any;      // Expected value (can be boolean, string, number, etc.)
}

/**
 * A condition that must be met for a rule to apply
 */
export interface RuleCondition {
  type: ConditionType;
  params: RuleConditionParams;
  operator?: ConditionOperator;
}

/**
 * Parameters for different effect types
 */
export interface RuleEffectParams {
  // For modify-hit, modify-wound, modify-characteristic
  stat?: 'WS' | 'S' | 'A' | 'AP' | 'D' | 'T' | 'SV' | 'INV';
  modifier?: number;

  // For add-keyword
  keyword?: string;
  keywordValue?: number;

  // For grant-ability
  ability?: string;
  abilityValue?: string;

  // For reroll
  rerollType?: 'all' | 'failed' | 'ones';
  rerollPhase?: 'hit' | 'wound' | 'damage';

  // For auto-success
  autoPhase?: 'hit' | 'wound';
}

/**
 * An effect that is applied when a rule's conditions are met
 */
export interface RuleEffect {
  type: EffectType;
  target: EffectTarget;
  params: RuleEffectParams;
  conditions?: RuleCondition[]; // Optional effect-level conditions
}

/**
 * User input configuration for conditional rules
 */
export interface RuleUserInput {
  type: 'toggle' | 'radio' | 'select';
  id: string;
  label: string;
  defaultValue?: any;
  options?: Array<{
    value: any;
    label: string;
    effects?: RuleEffect[]; // NEW: Effects applied when this option is selected
  }>;
}

/**
 * A complete rule definition
 */
export interface Rule {
  id: string;
  name: string;
  description: string;
  faction?: string; // Optional faction (Orks, Space Marines, etc.)
  scope: RuleScope;
  conditions: RuleCondition[];
  effects: RuleEffect[];
  duration: RuleDuration;
  activation?: RuleActivation;
  userInput?: RuleUserInput; // Optional user input requirement
  reactive: boolean; // Whether this is a reactive ability (triggers on opponent's turn)
}

/**
 * A modifier that can be applied to a stat
 */
export interface Modifier {
  source: string;           // Rule ID that created this
  stat: string;             // Stat being modified
  value: number;            // Modification value
  operation: '+' | '-' | 'set' | 'min' | 'max';
  priority: number;         // Order of application (lower = earlier)
}

/**
 * Army state tracking (for activated abilities like Waaagh!)
 */
export interface ArmyState {
  id: string;
  armyId: string;
  state: string;
  activatedTurn: number;
  expiresPhase?: string;
}
