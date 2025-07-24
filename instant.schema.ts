import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    // Built-in entities
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),

    // Core army entity
    armies: i.entity({
      id: i.string().unique().indexed(),
      createdAt: i.number(),
      faction: i.string(),
      name: i.string(),
      ownerId: i.string().indexed(),
      sourceData: i.string(), // raw json
    }),

    // Core unit entity
    units: i.entity({
      id: i.string().unique().indexed(),
      armyId: i.string().indexed(),
      name: i.string(),
      nickname: i.string().optional(),
      categories: i.json(), // array of categories
      rules: i.json(), // array of rules
      abilities: i.json(), // array of abilities
    }),

    // Unit status tracking for game state
    unitStatuses: i.entity({
      id: i.string().unique().indexed(),
      unitId: i.string().indexed(),
      turns: i.json(), // list of turns for which the status is applicable
      name: i.string(),
      rules: i.json(), // array of rules
    }),

    // Shared abilities table
    abilities: i.entity({
      id: i.string().unique().indexed(),
      name: i.string().unique().indexed(),
      description: i.string(),
    }),

    // Core model entity
    models: i.entity({
      id: i.string().unique().indexed(),
      name: i.string(),
      unitId: i.string().indexed(),
      M: i.number(), // movement in inches
      T: i.number(), // toughness
      SV: i.number(), // save value
      W: i.number(), // wounds
      LD: i.number(), // leadership
      OC: i.number(), // objective control
      woundsTaken: i.number(), // starts at zero, tracks damage
    }),

    // Core weapon entity
    weapons: i.entity({
      id: i.string().unique().indexed(),
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
  },
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema; 