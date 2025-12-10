# Rules Engine Data

This directory contains rule definitions for the Battle Buddy rules engine.

## Directory Structure

```
rules/
  orks/
    unit-abilities.json     - Unit-specific abilities (Tank Hunters, Might is Right, etc.)
    army-rules.json         - Army-wide rules (Waaagh! effects)
    detachment-rules.json   - Detachment abilities (Get Stuck In, etc.)
```

## Rule Format

Each rule is a JSON object with the following structure:

```json
{
  "id": "unique-rule-id",
  "name": "Display Name",
  "description": "Full rule text from codex",
  "scope": "weapon|unit|model|detachment|army",
  "conditions": [
    {
      "type": "condition-type",
      "params": { ... },
      "operator": "AND|OR"
    }
  ],
  "effects": [
    {
      "type": "effect-type",
      "target": "self|weapon|unit|enemy",
      "params": { ... }
    }
  ],
  "duration": "permanent|turn|phase|until-deactivated",
  "activation": {  // Optional, for activated abilities
    "type": "manual|automatic",
    "limit": "once-per-battle|once-per-turn|unlimited",
    "phase": "command|move|shoot|charge|fight"
  }
}
```

## Condition Types

- `target-category`: Target has specific category (MONSTER, VEHICLE, INFANTRY, etc.)
- `weapon-type`: Weapon is melee or ranged
- `range`: Range-based conditions (within-half, min, max)
- `unit-status`: Unit has specific status (charged, moved, stationary)
- `army-state`: Army has specific state (waaagh-active, etc.)
- `is-leading`: Model is a leader
- `being-led`: Unit is being led by a leader
- `combat-phase`: Specific combat phase (shooting, melee)

## Effect Types

- `modify-hit`: Modify hit roll (+1, -1)
- `modify-wound`: Modify wound roll (+1, -1)
- `modify-characteristic`: Modify stat (A, S, AP, D, T, SV, INV)
- `add-keyword`: Add weapon keyword (SUSTAINED HITS, LETHAL HITS, etc.)
- `grant-ability`: Grant special ability (charge-after-advance, etc.)
- `modify-save`: Modify save value
- `reroll`: Allow rerolls (all, failed, ones)
- `auto-success`: Automatic success (hit, wound)

## Examples

### Tank Hunters

Targets MONSTER or VEHICLE units, adds +1 to hit and wound:

```json
{
  "id": "tank-hunters",
  "conditions": [
    {
      "type": "target-category",
      "params": { "categories": ["MONSTER", "VEHICLE"] },
      "operator": "OR"
    }
  ],
  "effects": [
    { "type": "modify-hit", "target": "self", "params": { "modifier": 1 } },
    { "type": "modify-wound", "target": "self", "params": { "modifier": 1 } }
  ]
}
```

### Waaagh! - Strength Bonus

When Waaagh! is active, melee weapons get +1 Strength:

```json
{
  "id": "waaagh-strength-bonus",
  "conditions": [
    { "type": "army-state", "params": { "armyStates": ["waaagh-active"] } },
    { "type": "weapon-type", "params": { "weaponTypes": ["melee"] } }
  ],
  "effects": [
    {
      "type": "modify-characteristic",
      "target": "weapon",
      "params": { "stat": "S", "modifier": 1 }
    }
  ]
}
```

### Get Stuck In (Detachment)

All melee weapons gain SUSTAINED HITS 1:

```json
{
  "id": "get-stuck-in",
  "conditions": [
    { "type": "weapon-type", "params": { "weaponTypes": ["melee"] } }
  ],
  "effects": [
    {
      "type": "add-keyword",
      "target": "weapon",
      "params": { "keyword": "SUSTAINED HITS", "keywordValue": 1 }
    }
  ]
}
```

## Loading Rules into Database

To load these rules into the database:

1. Import the JSON files
2. Create `rules` entities for each rule
3. Link rules to units/weapons/detachments using the linking tables:
   - `unitRules` - Links rules to units
   - `weaponRules` - Links rules to weapons
   - `detachmentRules` - Links rules to armies (for detachment-wide effects)

## Army State Management

Army states (like waaagh-active) are tracked in the `armyStates` table:

```typescript
{
  armyId: string,        // Which army this state belongs to
  state: string,         // State identifier (e.g., "waaagh-active")
  activatedTurn: number, // Turn when activated
  expiresPhase?: string  // Optional expiration phase
}
```

This ensures multiple Ork players can have separate Waaghs!

## Using Rules in Combat

The combat calculator automatically:
1. Loads all applicable rules (weapon + unit + detachment + army)
2. Filters by conditions (target type, weapon type, army state, etc.)
3. Applies effects (modifiers to hit/wound, added keywords, etc.)
4. Merges added keywords with weapon keywords
5. Calculates final stats with all modifiers applied
