armies:
   - id
   - createdAt
   - faction
   - name 
   - ownerId (linked to user)
   - sourceData (raw json)
   - units (one to many link to unit rows)

units
   - id
   - armyId (linked)
   - name
   - nickname (left blank initially)
   - abilities (many to many linked to abilities table)
   - categories
   - rules
   - statuses (one to many linked to unit_status table)
   - models (one to many linked to models table)

// Used for things like "moved" "advanced" "battle-shocked"
unitStatuses
   - id
   - unitId
   - turns (list of turns for which the status is applicable)
   - name 
   - rules

// table of different ability rules: Units point to shared copies via the "name" field.
abilities
   - id
   - name (unique)
   - Description (text to display)

models
    - id
    - name
    - unitId (reverse link to unit)
    - M (number, in inches, stripping out the ")
    - T
    - SV
    - W
    - LD
    - OC
    - woundsTaken // starts at zero at start of game. We can calculate isDestroyed as woundsTaken > W.
    - weapons (one to many link to weapons table)


weapons:
    - id
    - name
    - range (number in inches: 0 for 'melee')
    - A //(number (2) or dice representation like (d6 + 3))
    - WS // (just the number: 4 represents "4+")
    - S
    - AP
    - D // also can be dice
    - keywords ["list", "of", "keywords", "melta-2"]
    - turnsFired []












====== Below here is old and likely outdated info=======
Warhammer 40k Rules Companion App Data Model (InstantDB)
This document outlines a data model designed for a Warhammer 40k 10th Edition companion app using InstantDB. The model aims to be flexible enough to import army lists, manage game state, and support calculations, leveraging InstantDB's real-time, collaborative nature.

Core Principles
Single Global State: InstantDB operates on a single, shared JavaScript object. Our data will be nested within this object.

Normalization & Denormalization: Similar to the previous approach, core data will be stored efficiently, while game-specific ephemeral data will be denormalized within the active game's state for quick access and real-time updates.

Game-Specific Copies: When a game starts, relevant army list data will be copied into the game's specific path within the InstantDB state to isolate game state changes from a player's saved army templates.

Ephemeral State on Entities: Temporary game state (wounds, movement status) will be stored directly on the Unit and Model objects within the active game's context.

InstantDB Data Structure
We will structure the InstantDB state using top-level keys for public game data and private user data, leveraging the __app_id and userId global variables for organization.

1. Public Game Data (Shared between players in a game)
This section of the InstantDB state will contain all active game sessions and their associated data, accessible by all authenticated players participating in a specific game.

db.games: An object where keys are gameIds.

db.games[gameId]: Represents a Game document.

db.games[gameId].players: An object where keys are playerIds.

db.games[gameId].players[playerId]: Represents a Player document.

db.games[gameId].armies: An object where keys are armyIds (copies of player armies for this game).

db.games[gameId].armies[armyId]: Represents an Army document.

db.games[gameId].units: An object where keys are unitIds (copies of units for this game).

db.games[gameId].units[unitId]: Represents a Unit document.

db.games[gameId].models: An object where keys are modelIds (copies of models for this game).

db.games[gameId].models[modelId]: Represents a Model document.

db.games[gameId].weapons: An object where keys are weaponIds (copies of weapons for this game).

db.games[gameId].weapons[weaponId]: Represents a Weapon document.

2. Private User Data (User's saved army lists and templates)
This section of the InstantDB state will store a user's personal army lists and templates, accessible only by that user.

db.users: An object where keys are userIds.

db.users[userId]: Represents a specific user's data.

db.users[userId].armies: An object where keys are armyIds.

db.users[userId].armies[armyId]: Represents an Army document.

db.users[userId].units: An object where keys are unitIds.

db.users[userId].units[unitId]: Represents a Unit document.

db.users[userId].models: An object where keys are modelIds.

db.users[userId].models[modelId]: Represents a Model document.

db.users[userId].weapons: An object where keys are weaponIds.

db.users[userId].weapons[weaponId]: Represents a Weapon document.

db.users[userId].rules: An object where keys are ruleIds (for reusable rule definitions).

db.users[userId].rules[ruleId]: Represents a Rule document.

db.users[userId].keywords: An object where keys are keywordIds (for reusable keyword definitions).

db.users[userId].keywords[keywordId]: Represents a Keyword document.

Data Model Entities
The structure of individual entities remains largely the same, but their storage location and referencing within InstantDB's object model are adjusted.

1. Game (Object in db.games[gameId])
Represents an active game session.

id: string (Unique ID for the game, generated upon creation)

name: string (e.g., "John vs. Sarah - 2000 pts")

createdAt: timestamp (or number for Unix epoch)

status: string (e.g., "setup", "active", "completed", "archived")

currentTurn: number (e.g., 1, 2, 3)

currentPhase: string (e.g., "Command Phase", "Movement Phase", "Shooting Phase", "Charge Phase", "Fight Phase", "Moral Phase")

activePlayerId: string (ID of the player whose turn it currently is)

playerIds: array<string> (List of Player IDs participating in this game, e.g., ["player1Id", "player2Id"])

2. Player (Object in db.games[gameId].players[playerId])
Represents a participant in a specific game.

id: string (Unique ID for the player in this game, generated upon addition)

userId: string (The actual Firebase auth.currentUser.uid of the player)

name: string (Display name of the player)

armyId: string (ID of the Army object copied for this game, e.g., db.games[gameId].armies[armyId])

isHost: boolean (True if this player created the game)

3. Army (Object in db.users[userId].armies[armyId] or db.games[gameId].armies[armyId])
Represents a player's army list.

id: string (Unique ID for the army list)

name: string (e.g., "My Ultramarines Strike Force")

faction: string (e.g., "Adeptus Astartes", "Tyranids")

pointsValue: number (Total points value of the army)

unitIds: array<string> (References to Unit objects belonging to this army, e.g., ["unit1Id", "unit2Id"])

ownerId: string (The userId who owns this army list template)

sourceData: string (Optional: JSON string of the original newrecruit.com import for re-parsing or debugging)

4. Unit (Object in db.users[userId].units[unitId] or db.games[gameId].units[unitId])
Represents a tactical unit composed of one or more models.

id: string (Unique ID for the unit)

name: string (e.g., "Intercessor Squad")

type: string (e.g., "Infantry", "Vehicle", "Monster")

abilities: array<object> (Unit-specific abilities)

name: string

description: string

modelIds: array<string> (References to Model objects that make up this unit, e.g., ["model1Id", "model2Id"])

keywords: array<string> (Unit-specific keywords, e.g., "Faction: Imperium", "Keyword: Adeptus Astartes", "Keyword: Intercessor")

startingModels: number (Initial count of models in the unit)

currentModels: number (Current count of models remaining in the unit)

currentWounds: number (Total wounds suffered by the unit, if applicable, or sum of model wounds for multi-wound models)

hasMoved: boolean (Resets at start of new turn)

hasAdvanced: boolean (Resets at start of new turn)

hasCharged: boolean (Resets at start of new turn)

isBattleShocked: boolean (Resets at start of new turn)

hasFallenBack: boolean (Resets at start of new turn)

isEngaged: boolean (Indicates if the unit is in combat)

isDestroyed: boolean (True if the unit has been destroyed)

5. Model (Object in db.users[userId].models[modelId] or db.games[gameId].models[modelId])
Represents an individual miniature within a unit.

id: string (Unique ID for the model)

name: string (e.g., "Intercessor Sergeant", "Intercessor Marine")

baseStats: object

M: string (Movement, e.g., "6"")

T: number (Toughness)

Sv: string (Save, e.g., "3+")

W: number (Wounds per model)

Ld: string (Leadership, e.g., "6+")

OC: number (Objective Control)

currentWounds: number (Current wounds suffered by this specific model. Reset per game.)

keywords: array<string> (Model-specific keywords)

specialRules: array<object> (Model-specific rules, similar to unit abilities)

name: string

description: string

weaponIds: array<string> (References to Weapon objects carried by this model, e.g., ["weapon1Id", "weapon2Id"])

isLeader: boolean (True if this model is a leader)

isDestroyed: boolean (True if this model has been destroyed)

6. Weapon (Object in db.users[userId].weapons[weaponId] or db.games[gameId].weapons[weaponId])
Represents a weapon carried by a model.

id: string (Unique ID for the weapon)

name: string (e.g., "Bolt Rifle", "Power Fist")

type: string (e.g., "Ranged", "Melee")

profiles: array<object> (A weapon can have multiple profiles, e.g., standard, sustained hits)

name: string (e.g., "Standard", "Rapid Fire")

S: number (Strength)

AP: number (Armour Penetration)

D: string (Damage, e.g., "1", "D3", "2D6")

A: string (Attacks, e.g., "2", "D6+1")

range: string (e.g., "24"")

abilities: array<object> (Weapon-specific abilities like "Sustained Hits 1", "Lethal Hits")

name: string

description: string

keywords: array<string> (Weapon-specific keywords, e.g., "Assault", "Heavy", "Pistol")

7. Rule (Object in db.users[userId].rules[ruleId])
For storing reusable definitions of special rules and abilities.

id: string (Unique ID for the rule)

name: string (e.g., "Sustained Hits 1", "Deep Strike")

description: string (Full text of the rule)

type: string (e.g., "Unit Ability", "Weapon Ability", "Army Rule", "Core Rule")

8. Keyword (Object in db.users[userId].keywords[keywordId])
For storing reusable definitions of keywords.

id: string (Unique ID for the keyword)

name: string (e.g., "INFANTRY", "VEHICLE", "ADEPTUS ASTARTES")

description: string (Optional: brief explanation if needed)

Handling Ephemeral State
Ephemeral state (wounds, movement status, battle shock) is crucial for real-time game tracking. In this InstantDB model, these states are directly integrated as fields within the Unit and Model objects that are copied into the public game-specific db.games[gameId].units and db.games[gameId].models paths.

currentWounds: On both Unit and Model objects. For units, this could be the sum of wounds on multi-wound models, or simply a tracker for single-wound models. For models, it's their individual wounds.

hasMoved, hasAdvanced, hasCharged, isBattleShocked, hasFallenBack, isEngaged: These boolean flags on the Unit object will be updated during the relevant game phases and reset at the beginning of each new turn (e.g., hasMoved and hasAdvanced reset at the start of the Movement Phase, isBattleShocked at the start of the Morale Phase).

Importing Army Lists (e.g., from https://www.google.com/search?q=Newrecruit.com JSON)
When importing a JSON army list into InstantDB:

Parse JSON: Read the structure of the newrecruit.com JSON.

Generate IDs: For each Army, Unit, Model, Weapon, Rule, and Keyword that needs to be stored, generate a unique ID (e.g., using crypto.randomUUID() or a similar method).

Populate User Data:

Create a new Army object at db.users[userId].armies[newArmyId], populating its fields and storing the raw JSON in sourceData.

Iterate through the units in the JSON. For each unit:

Create a Unit object at db.users[userId].units[newUnitId].

For each model within that unit, create a Model object at db.users[userId].models[newModelId].

For each weapon on a model, create a Weapon object at db.users[userId].weapons[newWeaponId].

Ensure all id fields are properly linked (e.g., Unit.modelIds contains newModelIds, Model.weaponIds contains newWeaponIds).

Extract unique rules and keywords and store them as Rule and Keyword objects in db.users[userId].rules[newRuleId] and db.users[userId].keywords[newKeywordId] respectively, referencing them by ID where appropriate, or embedding them directly if simpler.

Starting a Game and Copying Data
When a game starts, the relevant army data needs to be copied from the user's private section to the public game section:

Create Game: Create a new Game object at db.games[newGameId].

Add Players: For each player joining the game, create a Player object at db.games[newGameId].players[newPlayerId].

Copy Army Data: For each player's selected army:

Retrieve the Army object from db.users[userId].armies[armyId].

Create a copy of this Army object at db.games[newGameId].armies[copiedArmyId].

Iterate through the unitIds in the copied Army object. For each unitId:

Retrieve the Unit object from db.users[userId].units[unitId].

Create a copy of this Unit object at db.games[newGameId].units[copiedUnitId].

Initialize ephemeral state fields (currentWounds, hasMoved, etc.) on these copied Unit objects.

Iterate through the modelIds in the copied Unit object. For each modelId:

Retrieve the Model object from db.users[userId].models[modelId].

Create a copy of this Model object at db.games[newGameId].models[copiedModelId].

Initialize ephemeral state fields (currentWounds) on these copied Model objects.

Iterate through the weaponIds in the copied Model object. For each weaponId:

Retrieve the Weapon object from db.users[userId].weapons[weaponId].

Create a copy of this Weapon object at db.games[newGameId].weapons[copiedWeaponId].

Update the Player.armyId in the game to point to the copiedArmyId.

Views on Models in a Game
To get a "view on the models in a given unit at a given time in the game" using InstantDB:

Identify Game: Access the gameId from the active game.

Access Game-Specific Data: Navigate to db.games[gameId].units.

Retrieve Unit and Models: For a specific unit (e.g., db.games[gameId].units[targetUnitId]), retrieve its object. Then, use the modelIds array within this Unit object to access the corresponding Model objects from db.games[gameId].models[modelId].

Combine Data: Combine the unit-level ephemeral state (e.g., hasMoved) with the model-level ephemeral state (e.g., currentWounds) and their base stats to present a comprehensive view. Since InstantDB provides real-time updates, any changes to these objects will automatically reflect in your UI.

This InstantDB-specific data model provides the necessary structure for your Warhammer 40k companion app, enabling real-time collaboration and efficient management of game state.