import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    // Built-in entities
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
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
    }),

    // Army entities (both user templates and game copies)
    armies: i.entity({
      name: i.string(),
      faction: i.string(),
      pointsValue: i.number(),
      unitIds: i.json(), // array of unit IDs
      ownerId: i.string().indexed(),
      sourceData: i.string().optional(), // JSON string of original import
      gameId: i.string().optional(), // null for user templates, gameId for game copies
      // Additional army metadata
      detachment: i.string().optional(),
      battleSize: i.string().optional(),
      totalPoints: i.number().optional(),
      pointsLimit: i.number().optional(),
      createdAt: i.number().optional(),
    }),

    units: i.entity({
      name: i.string(),
      type: i.string(), // "Infantry", "Vehicle", "Monster"
      abilities: i.json(), // array of unit abilities
      modelIds: i.json(), // array of model IDs
      keywords: i.json(), // array of keywords
      startingModels: i.number(),
      currentWounds: i.number(),
      hasMoved: i.boolean(),
      hasAdvanced: i.boolean(),
      hasCharged: i.boolean(),
      isBattleShocked: i.boolean(),
      hasFallenBack: i.boolean(),
      isEngaged: i.boolean(),
      isDestroyed: i.boolean(),
      // Turn tracking for undo functionality
      turnHistory: i.json(), // array of actions per turn: {turn: number, phase: string, action: string, timestamp: number}
      lastActionTurn: i.number().optional(), // track which turn the last action was taken
      armyId: i.string().indexed(),
      gameId: i.string().optional(), // null for user templates, gameId for game copies
      cost: i.number(), // cost in points for this unit
      count: i.number(), // number of this unit in the army
      categories: i.json(), // array of categories (e.g., ["Infantry", "Faction: Adeptus Astartes"])
      profiles: i.json(), // array of unit profiles with characteristics
      rules: i.json(), // array of unit rules
      sourceData: i.json(), // original source data for re-parsing
      ownerId: i.string().indexed(), // user who owns this unit
    }),

    models: i.entity({
      name: i.string(),
      baseStats: i.json(), // M, T, Sv, W, Ld, OC
      currentWounds: i.number(),
      keywords: i.json(), // array of keywords
      specialRules: i.json(), // array of model-specific rules
      weaponIds: i.json(), // array of weapon IDs
      isLeader: i.boolean(),
      isDestroyed: i.boolean(),
      // Turn tracking for individual model actions
      turnHistory: i.json(), // array of actions per turn
      lastActionTurn: i.number().optional(),
      unitId: i.string().indexed(),
      gameId: i.string().optional(), // null for user templates, gameId for game copies
      // Individual model characteristics
      characteristics: i.json(), // array of characteristics
      armyId: i.string().indexed(),
      ownerId: i.string().indexed(),
    }),

    weapons: i.entity({
      name: i.string(),
      type: i.string(), // "Ranged", "Melee"
      profiles: i.json(), // array of weapon profiles
      abilities: i.json(), // array of weapon abilities
      keywords: i.json(), // array of weapon keywords
      modelId: i.string().indexed(),
      ownerId: i.string().indexed(), // Add missing ownerId field
      gameId: i.string().optional(), // null for user templates, gameId for game copies
      // Weapon count and characteristics for game copies
      count: i.number(),
      characteristics: i.json(), // array of characteristics
      armyId: i.string().indexed(),
      unitId: i.string().indexed(),
    }),

    rules: i.entity({
      name: i.string().indexed(),
      description: i.string(),
      type: i.string(), // "Unit Ability", "Weapon Ability", "Army Rule", "Core Rule"
      ownerId: i.string().indexed(),
    }),

    keywords: i.entity({
      name: i.string().indexed(),
      description: i.string().optional(),
      ownerId: i.string().indexed(),
    }),
  },
  
  links: {
    // Game relationships
    gameOwner: {
      forward: { on: "games", has: "one", label: "owner" },
      reverse: { on: "$users", has: "many", label: "ownedGames" },
    },
    
    gamePlayers: {
      forward: { on: "players", has: "one", label: "game", required: true },
      reverse: { on: "games", has: "many", label: "players" },
    },

    playerUser: {
      forward: { on: "players", has: "one", label: "user", required: true },
      reverse: { on: "$users", has: "many", label: "playerProfiles" },
    },

    // Army relationships
    armyOwner: {
      forward: { on: "armies", has: "one", label: "owner", required: true },
      reverse: { on: "$users", has: "many", label: "armies" },
    },

    armyGame: {
      forward: { on: "armies", has: "one", label: "game" },
      reverse: { on: "games", has: "many", label: "armies" },
    },

    // Unit relationships
    unitArmy: {
      forward: { on: "units", has: "one", label: "army", required: true },
      reverse: { on: "armies", has: "many", label: "units" },
    },

    unitGame: {
      forward: { on: "units", has: "one", label: "game" },
      reverse: { on: "games", has: "many", label: "units" },
    },

    // Model relationships
    modelUnit: {
      forward: { on: "models", has: "one", label: "unit", required: true },
      reverse: { on: "units", has: "many", label: "models" },
    },

    modelGame: {
      forward: { on: "models", has: "one", label: "game" },
      reverse: { on: "games", has: "many", label: "models" },
    },

    // Weapon relationships
    weaponModel: {
      forward: { on: "weapons", has: "one", label: "model", required: true },
      reverse: { on: "models", has: "many", label: "weapons" },
    },

    weaponGame: {
      forward: { on: "weapons", has: "one", label: "game" },
      reverse: { on: "games", has: "many", label: "weapons" },
    },

    weaponOwner: {
      forward: { on: "weapons", has: "one", label: "owner", required: true },
      reverse: { on: "$users", has: "many", label: "weapons" },
    },

    // Rule and keyword relationships
    ruleOwner: {
      forward: { on: "rules", has: "one", label: "owner", required: true },
      reverse: { on: "$users", has: "many", label: "rules" },
    },

    keywordOwner: {
      forward: { on: "keywords", has: "one", label: "owner", required: true },
      reverse: { on: "$users", has: "many", label: "keywords" },
    },
  },
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema; 