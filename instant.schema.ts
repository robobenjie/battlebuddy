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
      createdAt: i.number().indexed(),
      status: i.string(), // "setup", "active", "completed", "archived"
      currentTurn: i.number(),
      currentPhase: i.string(),
      activePlayerId: i.string().optional(),
      playerIds: i.json(), // array of player IDs
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
    }),

    units: i.entity({
      name: i.string(),
      type: i.string(), // "Infantry", "Vehicle", "Monster"
      abilities: i.json(), // array of unit abilities
      modelIds: i.json(), // array of model IDs
      keywords: i.json(), // array of keywords
      startingModels: i.number(),
      currentModels: i.number(),
      currentWounds: i.number(),
      hasMoved: i.boolean(),
      hasAdvanced: i.boolean(),
      hasCharged: i.boolean(),
      isBattleShocked: i.boolean(),
      hasFallenBack: i.boolean(),
      isEngaged: i.boolean(),
      isDestroyed: i.boolean(),
      armyId: i.string().indexed(),
      gameId: i.string().optional(), // null for user templates, gameId for game copies
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
      unitId: i.string().indexed(),
      gameId: i.string().optional(), // null for user templates, gameId for game copies
    }),

    weapons: i.entity({
      name: i.string(),
      type: i.string(), // "Ranged", "Melee"
      profiles: i.json(), // array of weapon profiles
      abilities: i.json(), // array of weapon abilities
      keywords: i.json(), // array of weapon keywords
      modelId: i.string().indexed(),
      gameId: i.string().optional(), // null for user templates, gameId for game copies
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