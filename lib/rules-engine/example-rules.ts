/**
 * Collection of validated, working rule implementations
 *
 * These examples are used for:
 * 1. Testing rule schema validation
 * 2. Training AI for rule implementation
 * 3. Documentation of rule structure
 *
 * All optional fields use explicit null values (strict schema)
 */

import { Rule } from './types';

/**
 * Explanations for why each example rule was included
 * These help the AI understand the different patterns and use cases
 */
export const EXAMPLE_EXPLANATIONS: Record<string, string> = {
  'waaagh-energy': 'Demonstrates radio input with multiple options based on unit size. Shows how effects scale with context (more models = stronger ability, but we can just ask the player for complicated conditional state). Example of leader-only effects using appliesTo field.',

  'drive-by-dakka': 'Shows toggle input for conditional ability activation. Demonstrates how to handle "if X happened this turn" mechanics using user input rather than automatic detection.',

  'dakka-dakka-dakka': 'Simple automatic keyword addition. Shows the most basic pattern: check weapon type condition, add keyword. No user input needed.',

  'tank-hunter': 'Demonstrates target-category conditions (VEHICLE) and reroll effects. Shows how to handle "against X targets" mechanics.',

  'furious-charge': 'Shows unit-status conditions (charged) and temporary duration (turn). Demonstrates abilities that trigger based on unit actions.',

  'super-runts': 'Complex example showing being-led condition, appliesTo field (leader vs bodyguard), and effect-level conditions (combat-role). Demonstrates how leader auras work: (scope is unit!) Also shows we can use multiple objects for a single written rule.',

  'bomb-squigs': 'Reminder-only rule with manual activation and once-per-battle limit. Shows that rules can have empty conditions/effects arrays when they just need to remind the player.',

  'shooty-power-trip': 'Radio input representing die roll outcomes with multiple effects. Shows that not all options need effects (1-2 causes mortal wounds, handled outside combat calculator). Demonstrates random ability outcomes (ask the player).',

  'waaagh-call': 'Demonstrates army-state conditions. Shows how abilities can depend on army-wide states like "Waaagh!" being active.',

  'wild-ride-movement': 'Reminder-only rule showing that many abilities that can\'t be calculated in combat should still be implemented as reminders. Even if we can\'t compute the effect, we can remind the player at the right time. NOTE: This rule activates in TWO phases (movement and charge), so we create TWO rule objects with the same name but different phase values.',

  'wild-ride-charge': 'Second part of Wild Ride rule. Shows that a single written rule often needs to be split into multiple rule objects when it activates in different phases. Both rules share the same name and description but have different activation phases.',

  'waaagh-strength': 'Part of multi-rule Waaagh! ability. Demonstrates how a single complex ability with multiple independent effects should be split into separate rule objects. Each effect is a separate rule.',

  'waaagh-attacks': 'Part 2 of Waaagh!. Shows that multiple effects of the same type (modify-characteristic) should be separate rules, not combined into one rule with multiple effects.',

  'waaagh-invuln': 'Part 3 of Waaagh!. Demonstrates modify-save effect for invulnerable saves.',

  'waaagh-charge-after-advance': 'Part 4 of Waaagh!. Shows a reminder-only rule that grants an ability we can\'t calculate. Together, these 4 Waaagh! rules show how to decompose complex faction abilities into independent, testable pieces.',

  'krumpin-time': 'Demonstrates Feel No Pain keyword. Shows how to grant defensive abilities that trigger after damage is rolled. FNP is calculated in the combat engine after saves.',
};

export const EXAMPLE_RULES: Rule[] = [
  {
    "id": "waaagh-energy",
    "name": "Waaagh! Energy",
    "description": "While this model is leading a unit, add 1 to the Strength and Damage characteristics of this model's 'Eadbanger weapon for every 5 models in that unit (rounding down), but while that unit contains 10 or more models, that weapon has the [HAZARDOUS] ability.",
    "faction": "Orks",
    "scope": "model",
    "conditions": [
      {
        "type": "combat-role",
        "params": {
          "role": "attacker",
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      },
      {
        "type": "is-leading",
        "params": {
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      }
    ],
    "effects": [],
    "userInput": {
      "type": "radio",
      "id": "unit-size",
      "label": "Unit size (models in led unit)",
      "defaultValue": "0-4",
      "options": [
        {
          "value": "0-4",
          "label": "0-4 models (+0)",
          "effects": []
        },
        {
          "value": "5-9",
          "label": "5-9 models (+1 S/D)",
          "effects": [
            {
              "type": "modify-characteristic",
              "target": "weapon",
              "params": {
                "stat": "S",
                "modifier": 1,
                "keyword": null,
                "keywordValue": null,
                "ability": null,
                "abilityValue": null,
                "rerollType": null,
                "rerollPhase": null,
                "autoPhase": null
              },
              "appliesTo": "leader",
              "conditions": null
            },
            {
              "type": "modify-characteristic",
              "target": "weapon",
              "params": {
                "stat": "D",
                "modifier": 1,
                "keyword": null,
                "keywordValue": null,
                "ability": null,
                "abilityValue": null,
                "rerollType": null,
                "rerollPhase": null,
                "autoPhase": null
              },
              "appliesTo": "leader",
              "conditions": null
            }
          ]
        },
        {
          "value": "10-14",
          "label": "10-14 models (+2 S/D, HAZARDOUS)",
          "effects": [
            {
              "type": "modify-characteristic",
              "target": "weapon",
              "params": {
                "stat": "S",
                "modifier": 2,
                "keyword": null,
                "keywordValue": null,
                "ability": null,
                "abilityValue": null,
                "rerollType": null,
                "rerollPhase": null,
                "autoPhase": null
              },
              "appliesTo": "leader",
              "conditions": null
            },
            {
              "type": "modify-characteristic",
              "target": "weapon",
              "params": {
                "stat": "D",
                "modifier": 2,
                "keyword": null,
                "keywordValue": null,
                "ability": null,
                "abilityValue": null,
                "rerollType": null,
                "rerollPhase": null,
                "autoPhase": null
              },
              "appliesTo": "leader",
              "conditions": null
            },
            {
              "type": "add-keyword",
              "target": "weapon",
              "params": {
                "keyword": "Hazardous",
                "stat": null,
                "modifier": null,
                "keywordValue": null,
                "ability": null,
                "abilityValue": null,
                "rerollType": null,
                "rerollPhase": null,
                "autoPhase": null
              },
              "appliesTo": "leader",
              "conditions": null
            }
          ]
        },
        {
          "value": "15-19",
          "label": "15-19 models (+3 S/D, HAZARDOUS)",
          "effects": [
            {
              "type": "modify-characteristic",
              "target": "weapon",
              "params": {
                "stat": "S",
                "modifier": 3,
                "keyword": null,
                "keywordValue": null,
                "ability": null,
                "abilityValue": null,
                "rerollType": null,
                "rerollPhase": null,
                "autoPhase": null
              },
              "appliesTo": "leader",
              "conditions": null
            },
            {
              "type": "modify-characteristic",
              "target": "weapon",
              "params": {
                "stat": "D",
                "modifier": 3,
                "keyword": null,
                "keywordValue": null,
                "ability": null,
                "abilityValue": null,
                "rerollType": null,
                "rerollPhase": null,
                "autoPhase": null
              },
              "appliesTo": "leader",
              "conditions": null
            },
            {
              "type": "add-keyword",
              "target": "weapon",
              "params": {
                "keyword": "Hazardous",
                "stat": null,
                "modifier": null,
                "keywordValue": null,
                "ability": null,
                "abilityValue": null,
                "rerollType": null,
                "rerollPhase": null,
                "autoPhase": null
              },
              "appliesTo": "leader",
              "conditions": null
            }
          ]
        },
        {
          "value": "20+",
          "label": "20+ models (+4 S/D, HAZARDOUS)",
          "effects": [
            {
              "type": "modify-characteristic",
              "target": "weapon",
              "params": {
                "stat": "S",
                "modifier": 4,
                "keyword": null,
                "keywordValue": null,
                "ability": null,
                "abilityValue": null,
                "rerollType": null,
                "rerollPhase": null,
                "autoPhase": null
              },
              "appliesTo": "leader",
              "conditions": null
            },
            {
              "type": "modify-characteristic",
              "target": "weapon",
              "params": {
                "stat": "D",
                "modifier": 4,
                "keyword": null,
                "keywordValue": null,
                "ability": null,
                "abilityValue": null,
                "rerollType": null,
                "rerollPhase": null,
                "autoPhase": null
              },
              "appliesTo": "leader",
              "conditions": null
            },
            {
              "type": "add-keyword",
              "target": "weapon",
              "params": {
                "keyword": "Hazardous",
                "stat": null,
                "modifier": null,
                "keywordValue": null,
                "ability": null,
                "abilityValue": null,
                "rerollType": null,
                "rerollPhase": null,
                "autoPhase": null
              },
              "appliesTo": "leader",
              "conditions": null
            }
          ]
        }
      ]
    },
    "duration": "permanent",
    "activation": {
      "type": "automatic",
      "phase": "any",
      "limit": null,
      "turn": null
    }
  },
  {
    "id": "drive-by-dakka",
    "name": "Drive-by Dakka",
    "description": "Each time this model makes a ranged attack, if it Advanced this turn, improve the Armour Penetration characteristic of that attack by 1.",
    "faction": "Orks",
    "scope": "model",
    "conditions": [
      {
        "type": "combat-role",
        "params": {
          "role": "attacker",
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      },
      {
        "type": "weapon-type",
        "params": {
          "weaponTypes": [
            "ranged"
          ],
          "categories": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      }
    ],
    "effects": [],
    "userInput": {
      "type": "toggle",
      "id": "advanced-this-turn",
      "label": "Advanced this turn?",
      "defaultValue": false,
      "options": [
        {
          "value": false,
          "label": "No",
          "effects": []
        },
        {
          "value": true,
          "label": "Yes",
          "effects": [
            {
              "type": "modify-characteristic",
              "target": "weapon",
              "params": {
                "stat": "AP",
                "modifier": -1,
                "keyword": null,
                "keywordValue": null,
                "ability": null,
                "abilityValue": null,
                "rerollType": null,
                "rerollPhase": null,
                "autoPhase": null
              },
              "appliesTo": null,
              "conditions": null
            }
          ]
        }
      ]
    },
    "duration": "turn",
    "activation": {
      "type": "automatic",
      "phase": "any",
      "limit": null,
      "turn": null
    }
  },
  {
    "id": "dakka-dakka-dakka",
    "name": "Dakka Dakka Dakka",
    "description": "Each time a model in this unit makes a ranged attack, an unmodified hit roll of 6 automatically wounds the target.",
    "faction": "Orks",
    "scope": "unit",
    "conditions": [
      {
        "type": "combat-role",
        "params": {
          "role": "attacker",
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      },
      {
        "type": "weapon-type",
        "params": {
          "weaponTypes": [
            "ranged"
          ],
          "categories": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      }
    ],
    "effects": [
      {
        "type": "add-keyword",
        "target": "weapon",
        "params": {
          "keyword": "Lethal Hits",
          "stat": null,
          "modifier": null,
          "keywordValue": null,
          "ability": null,
          "abilityValue": null,
          "rerollType": null,
          "rerollPhase": null,
          "autoPhase": null
        },
        "appliesTo": null,
        "conditions": null
      }
    ],
    "duration": "permanent",
    "activation": {
      "type": "automatic",
      "phase": "shooting",
      "limit": null,
      "turn": null
    },
    "userInput": null
  },
  {
    "id": "tank-hunter",
    "name": "Tank Hunter",
    "description": "Each time this model makes a ranged attack that targets a VEHICLE unit, re-roll a Wound roll of 1.",
    "faction": "Space Marines",
    "scope": "model",
    "conditions": [
      {
        "type": "combat-role",
        "params": {
          "role": "attacker",
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      },
      {
        "type": "weapon-type",
        "params": {
          "weaponTypes": [
            "ranged"
          ],
          "categories": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      },
      {
        "type": "target-category",
        "params": {
          "categories": [
            "VEHICLE"
          ],
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      }
    ],
    "effects": [
      {
        "type": "reroll",
        "target": "weapon",
        "params": {
          "rerollPhase": "wound",
          "rerollType": "ones",
          "stat": null,
          "modifier": null,
          "keyword": null,
          "keywordValue": null,
          "ability": null,
          "abilityValue": null,
          "autoPhase": null
        },
        "appliesTo": null,
        "conditions": null
      }
    ],
    "duration": "permanent",
    "activation": {
      "type": "automatic",
      "phase": "shooting",
      "limit": null,
      "turn": null
    },
    "userInput": null
  },
  {
    "id": "furious-charge",
    "name": "Furious Charge",
    "description": "Each time this unit makes a Charge move, until the end of the turn, add 1 to the Strength characteristic of melee weapons equipped by models in this unit.",
    "faction": "Orks",
    "scope": "unit",
    "conditions": [
      {
        "type": "combat-role",
        "params": {
          "role": "attacker",
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      },
      {
        "type": "weapon-type",
        "params": {
          "weaponTypes": [
            "melee"
          ],
          "categories": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      },
      {
        "type": "unit-status",
        "params": {
          "statuses": [
            "charged"
          ],
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "armyStates": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      }
    ],
    "effects": [
      {
        "type": "modify-characteristic",
        "target": "weapon",
        "params": {
          "stat": "S",
          "modifier": 1,
          "keyword": null,
          "keywordValue": null,
          "ability": null,
          "abilityValue": null,
          "rerollType": null,
          "rerollPhase": null,
          "autoPhase": null
        },
        "appliesTo": null,
        "conditions": null
      }
    ],
    "duration": "turn",
    "activation": {
      "type": "automatic",
      "phase": "charge",
      "limit": null,
      "turn": null
    },
    "userInput": null
  },
  {
    "id": "super-runts",
    "name": "Super Runts",
    "description": "While this model is leading a unit: Models in that unit have the Scouts 9\" ability. Each time a model in that unit makes an attack, add 1 to the Hit roll and add 1 to the Wound roll. Each time an attack targets that unit, subtract 1 from the Wound roll.",
    "faction": "Orks",
    "scope": "unit",
    "conditions": [
      {
        "type": "being-led",
        "params": {
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      }
    ],
    "effects": [
      {
        "type": "add-keyword",
        "target": "unit",
        "params": {
          "keyword": "Scouts",
          "keywordValue": 9,
          "stat": null,
          "modifier": null,
          "ability": null,
          "abilityValue": null,
          "rerollType": null,
          "rerollPhase": null,
          "autoPhase": null
        },
        "appliesTo": "bodyguard",
        "conditions": null
      },
      {
        "type": "modify-hit",
        "target": "self",
        "params": {
          "modifier": 1,
          "stat": null,
          "keyword": null,
          "keywordValue": null,
          "ability": null,
          "abilityValue": null,
          "rerollType": null,
          "rerollPhase": null,
          "autoPhase": null
        },
        "appliesTo": "bodyguard",
        "conditions": [
          {
            "type": "combat-role",
            "params": {
              "role": "attacker",
              "categories": null,
              "weaponTypes": null,
              "range": null,
              "statuses": null,
              "armyStates": null,
              "phases": null,
              "inputId": null,
              "inputValue": null
            },
            "operator": null
          }
        ]
      },
      {
        "type": "modify-wound",
        "target": "self",
        "params": {
          "modifier": 1,
          "stat": null,
          "keyword": null,
          "keywordValue": null,
          "ability": null,
          "abilityValue": null,
          "rerollType": null,
          "rerollPhase": null,
          "autoPhase": null
        },
        "appliesTo": "bodyguard",
        "conditions": [
          {
            "type": "combat-role",
            "params": {
              "role": "attacker",
              "categories": null,
              "weaponTypes": null,
              "range": null,
              "statuses": null,
              "armyStates": null,
              "phases": null,
              "inputId": null,
              "inputValue": null
            },
            "operator": null
          }
        ]
      },
      {
        "type": "modify-wound",
        "target": "self",
        "params": {
          "modifier": -1,
          "stat": null,
          "keyword": null,
          "keywordValue": null,
          "ability": null,
          "abilityValue": null,
          "rerollType": null,
          "rerollPhase": null,
          "autoPhase": null
        },
        "appliesTo": "bodyguard",
        "conditions": [
          {
            "type": "combat-role",
            "params": {
              "role": "defender",
              "categories": null,
              "weaponTypes": null,
              "range": null,
              "statuses": null,
              "armyStates": null,
              "phases": null,
              "inputId": null,
              "inputValue": null
            },
            "operator": null
          }
        ]
      }
    ],
    "duration": "permanent",
    "activation": {
      "type": "automatic",
      "phase": "any",
      "limit": null,
      "turn": null
    },
    "userInput": null
  },
  {
    "id": "bomb-squigs",
    "name": "Bomb Squigs",
    "description": "Once per battle, for each bomb squig this unit has, after this unit ends a Normal move, you can use one Bomb Squig. If you do, select one enemy unit within 12\" and visible to this unit and roll one D6: on a 3+, that enemy unit suffers D3 mortal wounds. **Designer's Note:** Place two Bomb Squig tokens next to the unit, removing one each time this unit uses this ability.",
    "faction": "Orks",
    "scope": "unit",
    "conditions": [],
    "effects": [],
    "duration": "permanent",
    "activation": {
      "type": "manual",
      "phase": "movement",
      "turn": "own",
      "limit": "once-per-battle"
    },
    "userInput": null
  },
  {
    "id": "shooty-power-trip",
    "name": "Shooty Power Trip",
    "description": "Each time this unit is selected to shoot, you can roll one D6: On a 1-2, this unit suffers D3 mortal wounds. On a 3-4, until the end of the phase, add 1 to the Strength characteristic of ranged weapons equipped by models in this unit. On a 5-6, until the end of the phase, add 1 to the Attacks characteristic of ranged weapons equipped by models in this unit.",
    "faction": "Orks",
    "scope": "unit",
    "conditions": [
      {
        "type": "combat-role",
        "params": {
          "role": "attacker",
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      },
      {
        "type": "weapon-type",
        "params": {
          "weaponTypes": [
            "ranged"
          ],
          "categories": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      }
    ],
    "effects": [],
    "userInput": {
      "type": "radio",
      "id": "power-trip-roll",
      "label": "D6 Roll Result",
      "defaultValue": "no-roll",
      "options": [
        {
          "value": "no-roll",
          "label": "Not activated",
          "effects": []
        },
        {
          "value": "1-2",
          "label": "1-2 (D3 mortal wounds)",
          "effects": []
        },
        {
          "value": "3-4",
          "label": "3-4 (+1 Strength)",
          "effects": [
            {
              "type": "modify-characteristic",
              "target": "weapon",
              "params": {
                "stat": "S",
                "modifier": 1,
                "keyword": null,
                "keywordValue": null,
                "ability": null,
                "abilityValue": null,
                "rerollType": null,
                "rerollPhase": null,
                "autoPhase": null
              },
              "appliesTo": null,
              "conditions": null
            }
          ]
        },
        {
          "value": "5-6",
          "label": "5-6 (+1 Attacks)",
          "effects": [
            {
              "type": "modify-characteristic",
              "target": "weapon",
              "params": {
                "stat": "A",
                "modifier": 1,
                "keyword": null,
                "keywordValue": null,
                "ability": null,
                "abilityValue": null,
                "rerollType": null,
                "rerollPhase": null,
                "autoPhase": null
              },
              "appliesTo": null,
              "conditions": null
            }
          ]
        }
      ]
    },
    "duration": "phase",
    "activation": {
      "type": "manual",
      "phase": "shooting",
      "turn": "own",
      "limit": null
    }
  },
  {
    "id": "waaagh-call",
    "name": "Waaagh! Call",
    "description": "While the Waaagh! is active, add 1 to the Attacks characteristic of melee weapons equipped by models in this unit.",
    "faction": "Orks",
    "scope": "unit",
    "conditions": [
      {
        "type": "combat-role",
        "params": {
          "role": "attacker",
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      },
      {
        "type": "army-state",
        "params": {
          "armyStates": [
            "waaagh-active"
          ],
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      },
      {
        "type": "weapon-type",
        "params": {
          "weaponTypes": [
            "melee"
          ],
          "categories": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      }
    ],
    "effects": [
      {
        "type": "modify-characteristic",
        "target": "weapon",
        "params": {
          "stat": "A",
          "modifier": 1,
          "keyword": null,
          "keywordValue": null,
          "ability": null,
          "abilityValue": null,
          "rerollType": null,
          "rerollPhase": null,
          "autoPhase": null
        },
        "appliesTo": null,
        "conditions": null
      }
    ],
    "duration": "permanent",
    "activation": {
      "type": "automatic",
      "phase": "fight",
      "limit": null,
      "turn": null
    },
    "userInput": null
  },
  {
    "id": "wild-ride-movement",
    "name": "Wild Ride",
    "description": "You can ignore any or all modifiers to this unit's Move characteristic and to Advance and Charge rolls made for this unit.",
    "faction": "Orks",
    "scope": "unit",
    "conditions": [],
    "effects": [],
    "duration": "permanent",
    "activation": {
      "type": "manual",
      "phase": "movement",
      "turn": "own",
      "limit": null
    },
    "userInput": null
  },
  {
    "id": "wild-ride-charge",
    "name": "Wild Ride",
    "description": "You can ignore any or all modifiers to this unit's Move characteristic and to Advance and Charge rolls made for this unit.",
    "faction": "Orks",
    "scope": "unit",
    "conditions": [],
    "effects": [],
    "duration": "permanent",
    "activation": {
      "type": "manual",
      "phase": "charge",
      "turn": "own",
      "limit": null
    },
    "userInput": null
  },
  {
    "id": "waaagh-strength",
    "name": "Waaagh!",
    "description": "If your Army Faction is Orks, once per battle, at the start of your Command phase, you can call a Waaagh! If you do, until the start of your next Command phase, the Waaagh! is active for your army and: Units from your army with this ability are eligible to declare a charge in a turn in which they Advanced. Add 1 to the Strength and Attacks characteristics of melee weapons equipped by models from your army with this ability. Models from your army with this ability have a 5+ invulnerable save.",
    "faction": "Orks",
    "scope": "army",
    "conditions": [
      {
        "type": "combat-role",
        "params": {
          "role": "attacker",
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      },
      {
        "type": "army-state",
        "params": {
          "armyStates": ["waaagh-active"],
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      },
      {
        "type": "weapon-type",
        "params": {
          "weaponTypes": ["melee"],
          "categories": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      }
    ],
    "effects": [
      {
        "type": "modify-characteristic",
        "target": "weapon",
        "params": {
          "stat": "S",
          "modifier": 1,
          "keyword": null,
          "keywordValue": null,
          "ability": null,
          "abilityValue": null,
          "rerollType": null,
          "rerollPhase": null,
          "autoPhase": null
        },
        "appliesTo": null,
        "conditions": null
      }
    ],
    "duration": "permanent",
    "activation": {
      "type": "automatic",
      "phase": "any",
      "limit": null,
      "turn": null
    },
    "userInput": null
  },
  {
    "id": "waaagh-attacks",
    "name": "Waaagh!",
    "description": "If your Army Faction is Orks, once per battle, at the start of your Command phase, you can call a Waaagh! If you do, until the start of your next Command phase, the Waaagh! is active for your army and: Units from your army with this ability are eligible to declare a charge in a turn in which they Advanced. Add 1 to the Strength and Attacks characteristics of melee weapons equipped by models from your army with this ability. Models from your army with this ability have a 5+ invulnerable save.",
    "faction": "Orks",
    "scope": "army",
    "conditions": [
      {
        "type": "combat-role",
        "params": {
          "role": "attacker",
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      },
      {
        "type": "army-state",
        "params": {
          "armyStates": ["waaagh-active"],
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      },
      {
        "type": "weapon-type",
        "params": {
          "weaponTypes": ["melee"],
          "categories": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      }
    ],
    "effects": [
      {
        "type": "modify-characteristic",
        "target": "weapon",
        "params": {
          "stat": "A",
          "modifier": 1,
          "keyword": null,
          "keywordValue": null,
          "ability": null,
          "abilityValue": null,
          "rerollType": null,
          "rerollPhase": null,
          "autoPhase": null
        },
        "appliesTo": null,
        "conditions": null
      }
    ],
    "duration": "permanent",
    "activation": {
      "type": "automatic",
      "phase": "any",
      "limit": null,
      "turn": null
    },
    "userInput": null
  },
  {
    "id": "waaagh-invuln",
    "name": "Waaagh!",
    "description": "If your Army Faction is Orks, once per battle, at the start of your Command phase, you can call a Waaagh! If you do, until the start of your next Command phase, the Waaagh! is active for your army and: Units from your army with this ability are eligible to declare a charge in a turn in which they Advanced. Add 1 to the Strength and Attacks characteristics of melee weapons equipped by models from your army with this ability. Models from your army with this ability have a 5+ invulnerable save.",
    "faction": "Orks",
    "scope": "army",
    "conditions": [
      {
        "type": "combat-role",
        "params": {
          "role": "defender",
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      },
      {
        "type": "army-state",
        "params": {
          "armyStates": ["waaagh-active"],
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      }
    ],
    "effects": [
      {
        "type": "add-keyword",
        "target": "unit",
        "params": {
          "keyword": "Invulnerable Save",
          "keywordValue": 5,
          "stat": null,
          "modifier": null,
          "ability": null,
          "abilityValue": null,
          "rerollType": null,
          "rerollPhase": null,
          "autoPhase": null
        },
        "appliesTo": null,
        "conditions": null
      }
    ],
    "duration": "permanent",
    "activation": {
      "type": "automatic",
      "phase": "any",
      "limit": null,
      "turn": null
    },
    "userInput": null
  },
  {
    "id": "waaagh-charge-after-advance",
    "name": "Waaagh!",
    "description": "If your Army Faction is Orks, once per battle, at the start of your Command phase, you can call a Waaagh! If you do, until the start of your next Command phase, the Waaagh! is active for your army and: Units from your army with this ability are eligible to declare a charge in a turn in which they Advanced. Add 1 to the Strength and Attacks characteristics of melee weapons equipped by models from your army with this ability. Models from your army with this ability have a 5+ invulnerable save.",
    "faction": "Orks",
    "scope": "army",
    "conditions": [
      {
        "type": "army-state",
        "params": {
          "armyStates": ["waaagh-active"],
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      }
    ],
    "effects": [],
    "duration": "permanent",
    "activation": {
      "type": "manual",
      "phase": "charge",
      "turn": "own",
      "limit": null
    },
    "userInput": null
  },
  {
    "id": "krumpin-time",
    "name": "Krumpin' Time",
    "description": "While the Waaagh! is active for your army, models in this unit have the Feel No Pain 5+ ability.",
    "faction": "Orks",
    "scope": "unit",
    "conditions": [
      {
        "type": "combat-role",
        "params": {
          "role": "defender",
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "armyStates": null,
          "phases": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      },
      {
        "type": "army-state",
        "params": {
          "armyStates": ["waaagh-active"],
          "categories": null,
          "weaponTypes": null,
          "range": null,
          "statuses": null,
          "phases": null,
          "role": null,
          "inputId": null,
          "inputValue": null
        },
        "operator": null
      }
    ],
    "effects": [
      {
        "type": "add-keyword",
        "target": "unit",
        "params": {
          "keyword": "Feel No Pain",
          "keywordValue": 5,
          "stat": null,
          "modifier": null,
          "ability": null,
          "abilityValue": null,
          "rerollType": null,
          "rerollPhase": null,
          "autoPhase": null
        },
        "appliesTo": null,
        "conditions": null
      }
    ],
    "duration": "permanent",
    "activation": {
      "type": "automatic",
      "phase": "any",
      "limit": null,
      "turn": null
    },
    "userInput": null
  }
] as Rule[];
