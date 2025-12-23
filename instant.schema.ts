import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    // Built-in entities
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),

    // Performance test entities
    perfCounters: i.entity({
      value: i.number(),
      createdAt: i.number(),
    }),

    // Performance test with indexes (like players table)
    perfCountersIndexed: i.entity({
      value: i.number(),
      gameId: i.string().indexed(),
      userId: i.string().indexed(),
      createdAt: i.number(),
    }),

    // Game entities
    games: i.entity({
      name: i.string(),
      code: i.string().unique().indexed(), // 5-digit game code
      hostId: i.string().indexed(), // user ID of the host
      createdAt: i.number().indexed(),
      status: i.string(), // "waiting", "setup", "active", "completed", "archived"
      currentTurn: i.number(),
      currentPhase: i.string(), // "command", "move", "shoot", "charge", "fight"
      activePlayerId: i.string().optional(),
      playerIds: i.json(), // array of player IDs
      phaseHistory: i.json(), // track phase progression for undo functionality
    }),

    players: i.entity({
      name: i.string(),
      userId: i.string().indexed(),
      gameId: i.string().indexed(),
      armyId: i.string().optional(),
      isHost: i.boolean(),
      victoryPoints: i.number().optional(), // VP tracking
      commandPoints: i.number().optional(), // CP tracking
      configReady: i.boolean().optional(), // Ready status for army config phase
    }),

    // Core army entity
    armies: i.entity({
      createdAt: i.number(),
      faction: i.string(),
      name: i.string(),
      ownerId: i.string().indexed(),
      sourceData: i.string(), // raw json
      gameId: i.string().optional().indexed(), // optional link to game for game-specific army copies
      detachment: i.string().optional(), // detachment name (e.g., "Green Tide", "Speed Freeks")
    }),

    // Core unit entity
    units: i.entity({
      armyId: i.string().indexed(),
      name: i.string(),
      nickname: i.string().optional(),
      categories: i.json(), // array of categories
      rules: i.json(), // array of rules
      abilities: i.json(), // array of abilities
    }),

    // Unit status tracking for game state
    unitStatuses: i.entity({
      unitId: i.string().indexed(),
      turns: i.json(), // list of turns for which the status is applicable
      name: i.string(),
      rules: i.json(), // array of rules
    }),

    // Shared abilities table
    abilities: i.entity({
      name: i.string().unique().indexed(),
      description: i.string(),
    }),

    // Core model entity
    models: i.entity({
      name: i.string(),
      unitId: i.string().indexed(),
      M: i.number(), // movement in inches
      T: i.number(), // toughness
      SV: i.number(), // save value
      INV: i.number().optional(), // invulnerable save value
      W: i.number(), // wounds
      LD: i.number(), // leadership
      OC: i.number(), // objective control
      woundsTaken: i.number(), // starts at zero, tracks damage
    }),

    // Core weapon entity
    weapons: i.entity({
      name: i.string().optional(), // weapon name
      range: i.number(), // range in inches, 0 for melee
      A: i.string(), // attacks (number or dice representation like "d6 + 3")
      WS: i.number().optional(), // weapon skill (just the number: 4 represents "4+", null for N/A)
      S: i.number(), // strength
      AP: i.number(), // armour penetration
      D: i.string(), // damage (number or dice)
      keywords: i.json(), // array of keywords like ["melta-2", "assault"]
      turnsFired: i.json(), // array of turns when this weapon was fired
      modelId: i.string().indexed(),
    }),

    // Rules entity - stores both imported rules and rules-engine implementations
    rules: i.entity({
      name: i.string().indexed(),
      // Import data (from BattleScribe/NewRecruit)
      rawText: i.string().optional(), // Original rule description from import
      battlescribeId: i.string().optional().indexed(), // BattleScribe unique ID for deduplication
      faction: i.string().optional().indexed(), // Faction this rule belongs to
      createdAt: i.number(),
      // Rules-engine implementation (optional - null if not yet implemented)
      ruleObject: i.string().optional(), // JSON stringified Rule engine object
      // Legacy fields (kept for backwards compatibility, can be deprecated)
      description: i.string().optional(),
      scope: i.string().optional(), // 'weapon', 'unit', 'model', 'detachment', 'army'
      conditions: i.json().optional(), // array of RuleCondition objects
      effects: i.json().optional(), // array of RuleEffect objects
      duration: i.string().optional(), // 'permanent', 'turn', 'phase', 'until-deactivated'
      activation: i.json().optional(), // RuleActivation object
    }),

    // Army states tracking (e.g., Waaagh!, Oath of Moment target, army-wide choices)
    // Each army has its own states, so multiple Ork armies can have separate Waaghs
    // Note: armyId is handled by the armyStateArmy link, not as a field
    armyStates: i.entity({
      state: i.string(), // 'waaagh-active', 'oath-target', 'hyper-adaptation-selected', etc.
      activatedTurn: i.number(),
      expiresPhase: i.string().optional(),
      targetUnitId: i.string().optional(), // For targeting abilities like Oath of Moment
      choiceValue: i.string().optional(),  // For storing selected choice option (e.g., 'swarming-instincts')
    }),

  },
  
  links: {
    // Army relationships
    armyOwner: {
      forward: { on: "armies", has: "one", label: "owner", required: true },
      reverse: { on: "$users", has: "many", label: "armies" },
    },

    // Unit relationships
    unitArmy: {
      forward: { on: "units", has: "one", label: "army", required: true, onDelete: "cascade" },
      reverse: { on: "armies", has: "many", label: "units" },
    },

    // Unit status relationships
    unitStatusUnit: {
      forward: { on: "unitStatuses", has: "one", label: "unit", required: true, onDelete: "cascade" },
      reverse: { on: "units", has: "many", label: "statuses"},
    },

    // Model relationships
    modelUnit: {
      forward: { on: "models", has: "one", label: "unit", required: true, onDelete: "cascade" },
      reverse: { on: "units", has: "many", label: "models" },
    },

    // Weapon relationships
    weaponModel: {
      forward: { on: "weapons", has: "one", label: "model", required: true, onDelete: "cascade" },
      reverse: { on: "models", has: "many", label: "weapons" },
    },

    // Game-Army relationships
    gameArmies: {
      forward: { on: "armies", has: "one", label: "game", required: false, onDelete: "cascade" },
      reverse: { on: "games", has: "many", label: "armies" },
    },

    // Game-Unit relationships for destroyed units
    gameDestroyedUnits: {
      forward: { on: "units", has: "many", label: "gamesWhereDestroyed" },
      reverse: { on: "games", has: "many", label: "destroyedUnits" },
    },

    // Rule relationships (many-to-many)
    armyRules: {
      forward: { on: "armies", has: "many", label: "armyRules" },
      reverse: { on: "rules", has: "many", label: "rulesArmies" },
    },

    unitRules: {
      forward: { on: "units", has: "many", label: "unitRules" },
      reverse: { on: "rules", has: "many", label: "rulesUnits" },
    },

    modelRules: {
      forward: { on: "models", has: "many", label: "modelRules" },
      reverse: { on: "rules", has: "many", label: "rulesModels" },
    },

    weaponRules: {
      forward: { on: "weapons", has: "many", label: "weaponRules" },
      reverse: { on: "rules", has: "many", label: "rulesWeapons" },
    },

    // Army state relationships
    armyStateArmy: {
      forward: { on: "armyStates", has: "one", label: "army", required: true, onDelete: "cascade" },
      reverse: { on: "armies", has: "many", label: "states" },
    },

    // Unit leader attachments (CHARACTER units attached to bodyguard units)
    // Uses self-referential many-to-many relationship
    // Automatically scoped per-game since units are copied per-game
    unitLeaders: {
      forward: { on: "units", has: "many", label: "leaders" },
      reverse: { on: "units", has: "many", label: "bodyguardUnits" },
    },
  },
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema; 