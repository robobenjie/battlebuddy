/**
 * Type definitions for the rules engine
 *
 * All rule schema types are now imported from rule-schema.ts
 */

// Export new schema types
export type {
  Rule,
  PassiveRuleType,
  ChoiceRuleType,
  ReminderRuleType,
  TriggerType,
  WhenType,
  FxType,
  BlockType
} from './rule-schema';

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
 * Army state tracking (for activated abilities like Waaagh!, Oath of Moment, army-wide choices)
 */
export interface ArmyState {
  id: string;
  armyId: string;
  state: string;
  activatedTurn: number;
  expiresPhase?: string;
  targetUnitId?: string;  // For targeting abilities like Oath of Moment
  choiceValue?: string;   // For storing selected choice option (e.g., 'swarming-instincts')
}
