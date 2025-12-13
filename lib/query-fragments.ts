/**
 * Reusable InstantDB query fragments
 *
 * These fragments define common query structures that can be spread into queries
 * to avoid repeating the same nested structures across components.
 */

/**
 * Query fragment for loading a unit with all its data including:
 * - Attached leaders (with their unit rules and model rules)
 * - Unit rules
 * - Models (with model rules and weapons with weapon rules)
 * - Statuses
 * - Bodyguard units
 *
 * Usage:
 * ```typescript
 * const { data } = db.useQuery({
 *   armies: {
 *     units: {
 *       ...UNIT_FULL_QUERY,
 *       // Add any additional fields specific to your component
 *     }
 *   }
 * });
 * ```
 */
export const UNIT_FULL_QUERY = {
  leaders: {
    unitRules: {},
    models: {
      modelRules: {}
    }
  }, // Load attached leaders with their rules
  bodyguardUnits: {}, // Load bodyguard units (for CHARACTER filtering)
  unitRules: {},
  models: {
    modelRules: {},
    weapons: {
      weaponRules: {}
    }
  },
  statuses: {},
};

/**
 * Query fragment for loading a unit with minimal data (no statuses)
 * Useful for read-only displays or when status tracking isn't needed.
 */
export const UNIT_BASIC_QUERY = {
  leaders: {
    unitRules: {},
    models: {
      modelRules: {}
    }
  }, // Load attached leaders with their rules
  bodyguardUnits: {}, // Load bodyguard units (for CHARACTER filtering)
  unitRules: {},
  models: {
    modelRules: {},
    weapons: {
      weaponRules: {}
    }
  },
};
