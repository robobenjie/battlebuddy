/**
 * Stratagems for Warhammer 40k 10th Edition
 */

export type StratagemPhase = 'any' | 'command' | 'move' | 'shoot' | 'charge' | 'fight' | 'move-or-charge';

export interface Stratagem {
  id: string;
  name: string;
  cost: number;
  phase: StratagemPhase;
  when: string;
  effect: string;
  faction?: string; // undefined = core stratagem, otherwise faction-specific
  detachment?: string; // specific detachment requirement
  turnRestriction?: 'any' | 'first-turn-only' | 'second-turn-onwards';
  turn?: 'your-turn' | 'opponent-turn' | 'either'; // who can use this stratagem
}

export interface StratagemDrawerEntry {
  stratagem: Stratagem;
  isAvailableNow: boolean;
}

// Core Stratagems (available to all factions)
export const CORE_STRATAGEMS: Stratagem[] = [
  {
    id: 'command-reroll',
    name: 'Command Re-roll',
    cost: 1,
    phase: 'any',
    when: 'Any phase',
    effect: 'Re-roll one Hit roll, Wound roll, Damage roll, saving throw, Advance roll, Charge roll, Desperate Escape test, Hazardous test, or the number of attacks made with a weapon.',
    turn: 'either',
  },
  {
    id: 'grenade',
    name: 'Grenade',
    cost: 1,
    phase: 'shoot',
    when: 'Your Shooting phase',
    effect: 'Select one enemy unit within 8" of and visible to a GRENADES unit from your army. Roll six D6: for each 4+, that enemy unit suffers 1 mortal wound.',
    turn: 'your-turn',
  },
  {
    id: 'fire-overwatch',
    name: 'Fire Overwatch',
    cost: 1,
    phase: 'any',
    when: "Your opponent's Charge or Movement phase, just after an enemy unit is set up or when an enemy unit starts or ends a Normal, Advance, Fall Back or Charge move",
    effect: 'Select one unit from your army that is within 24" of that enemy unit and would be eligible to shoot if it were your Shooting phase. That unit can shoot that enemy unit as if it were your Shooting phase, but when resolving those attacks, a successful unmodified Hit roll of 6 is required to score a hit, irrespective of the attacking weapon\'s Ballistic Skill or any modifiers. Note that the target unit is not required to be a unit that declared a charge.',
    turn: 'opponent-turn',
  },
  {
    id: 'heroic-intervention',
    name: 'Heroic Intervention',
    cost: 2,
    phase: 'charge',
    when: "Your opponent's Charge phase, just after an enemy unit ends a Charge move",
    effect: 'Select one unit from your army that is within 6" of that enemy unit and would be eligible to declare a charge against that enemy unit if it were your Charge phase. That unit from your army can now declare a charge against that enemy unit, and you resolve that charge as if it were your Charge phase.',
    turn: 'opponent-turn',
  },
  {
    id: 'smokescreen',
    name: 'Smokescreen',
    cost: 1,
    phase: 'shoot',
    when: "Your opponent's Shooting phase, just after an enemy unit has selected its targets",
    effect: 'Select one SMOKE unit from your army that was selected as the target of one or more of the attacking unit\'s attacks. Until the end of the phase, all models in your unit have the Benefit of Cover and the Stealth ability against those attacks.',
    turn: 'opponent-turn',
  },
  {
    id: 'go-to-ground',
    name: 'Go to Ground',
    cost: 1,
    phase: 'any',
    when: "Your opponent's Shooting phase, just after an enemy unit has selected its targets",
    effect: 'Select one INFANTRY unit from your army that was selected as the target of one or more of that attack\'s attacks. Until the end of the phase, all models in your unit have a 6+ invulnerable save and the Benefit of Cover.',
    turn: 'opponent-turn',
  },
  {
    id: 'insane-bravery',
    name: 'Insane Bravery',
    cost: 1,
    phase: 'any',
    when: 'Any phase, just after you have failed a Battle-shock test for a unit from your army',
    effect: 'That unit is treated as having passed that test instead.',
    turn: 'either',
  },
  {
    id: 'tank-shock',
    name: 'Tank Shock',
    cost: 1,
    phase: 'charge',
    when: 'Your Charge phase, when a VEHICLE unit from your army ends a Charge move',
    effect: 'Select one enemy unit within Engagement Range of that VEHICLE unit and roll one D6 for each model in that enemy unit: for each 5+, that enemy unit suffers 1 mortal wound (to a maximum of 6 mortal wounds).',
    turn: 'your-turn',
  },
  {
    id: 'rapid-ingress',
    name: 'Rapid Ingress',
    cost: 1,
    phase: 'move',
    when: "End of your opponent's Movement phase",
    effect: 'Select one unit from your army that is in Reserves. Set up that unit anywhere on the battlefield that is more than 9" horizontally away from all enemy models.',
    turn: 'opponent-turn',
  },
  {
    id: 'epic-challenge',
    name: 'Epic Challenge',
    cost: 1,
    phase: 'fight',
    when: 'Your opponent\'s Fight phase, just after an enemy unit has selected its targets',
    effect: 'Select one CHARACTER model from your army that is within Engagement Range of that enemy unit. Until the end of the phase, that CHARACTER model\'s unit is the only eligible target of attacks made by models in that enemy unit.',
    turn: 'opponent-turn',
  },
  {
    id: 'new-orders',
    name: 'New Orders',
    cost: 1,
    phase: 'command',
    when: 'Your Command phase',
    effect: 'Once per battle, discard your active Secondary Mission and select a new one from your Mission deck (do not count this Secondary Mission towards the limit of Secondary Missions you have selected).',
    turnRestriction: 'second-turn-onwards',
    turn: 'your-turn',
  },
];

// Orks - Green Tide Stratagems
export const ORKS_GREEN_TIDE_STRATAGEMS: Stratagem[] = [
  {
    id: 'braggin-rights',
    name: "Braggin' Rights",
    cost: 1,
    phase: 'command',
    when: 'Your Command phase',
    effect: 'Select 2 BOYZ units from your army within 6" of each other. Until the start of your next Command phase, both units count as having 10 or more models for the purposes of their Mob Mentality ability.',
    faction: 'Orks',
    detachment: 'Green Tide',
    turn: 'your-turn',
  },
  {
    id: 'come-on-ladz',
    name: "Come On Ladz!",
    cost: 1,
    phase: 'command',
    when: 'Your Command phase',
    effect: 'Select one BOYZ unit from your army. Return D3+2 destroyed models (excluding CHARACTER models) to that unit.',
    faction: 'Orks',
    detachment: 'Green Tide',
    turn: 'your-turn',
  },
  {
    id: 'tide-of-muscle',
    name: 'Tide of Muscle',
    cost: 1,
    phase: 'charge',
    when: 'Your Charge phase, when a BOYZ unit from your army is selected to declare a charge',
    effect: 'Add a number equal to the current battle round number to that unit\'s Charge roll this turn.',
    faction: 'Orks',
    detachment: 'Green Tide',
    turn: 'your-turn',
  },
  {
    id: 'competitive-streak',
    name: 'Competitive Streak',
    cost: 1,
    phase: 'fight',
    when: 'Your Fight phase, when a BOYZ unit from your army is selected to fight',
    effect: 'Until the end of the phase, improve the Armour Penetration characteristic of melee weapons equipped by models in that unit by 1. If that unit has 10 or more models, improve it by 2 instead.',
    faction: 'Orks',
    detachment: 'Green Tide',
    turn: 'your-turn',
  },
];

// Orks - Speed Freeks (Kult of Speed) Stratagems
export const ORKS_SPEED_FREEKS_STRATAGEMS: Stratagem[] = [
  {
    id: 'speediest-freeks',
    name: 'Speediest Freeks',
    cost: 1,
    phase: 'any',
    when: "Your opponent's Shooting phase or Fight phase, after an enemy unit selects its targets",
    effect: 'Select one SPEED FREEKS or TRUKK unit from your army that was selected as a target. Until the end of the phase, models in that unit have a 5+ invulnerable save, or 4+ invulnerable save if that unit is a VEHICLE with Toughness characteristic of 8 or less.',
    faction: 'Orks',
    detachment: 'Speed Freeks',
    turn: 'opponent-turn',
  },
  {
    id: 'dakkastorm',
    name: 'Dakkastorm',
    cost: 1,
    phase: 'shoot',
    when: 'Your Shooting phase, when a SPEED FREEKS unit from your army is selected to shoot',
    effect: 'Until the end of the phase, ranged weapons equipped by models in that unit have the [SUSTAINED HITS 1] ability. If the target is within 9", those weapons have the [SUSTAINED HITS 2] ability instead.',
    faction: 'Orks',
    detachment: 'Speed Freeks',
    turn: 'your-turn',
  },
  {
    id: 'blitza-fire',
    name: 'Blitza Fire',
    cost: 1,
    phase: 'shoot',
    when: 'Your Shooting phase, when a SPEED FREEKS unit from your army is selected to shoot',
    effect: 'Until the end of the phase, ranged weapons equipped by models in that unit have the [LETHAL HITS] ability. If the target is within 9", attacks made with those weapons score Critical Hits on unmodified Hit rolls of 5+.',
    faction: 'Orks',
    detachment: 'Speed Freeks',
    turn: 'your-turn',
  },
  {
    id: 'full-throttle',
    name: 'Full Throttle!',
    cost: 1,
    phase: 'charge',
    when: 'Your Charge phase, after a SPEED FREEKS unit from your army ends a Charge move',
    effect: 'Until the end of the turn, add 1 to the Wound roll for attacks made with melee weapons by models in that unit.',
    faction: 'Orks',
    detachment: 'Speed Freeks',
    turn: 'your-turn',
  },
  {
    id: 'squig-flingin',
    name: "Squig Flingin'",
    cost: 1,
    phase: 'move',
    when: 'Your Movement phase, just after a SPEED FREEKS or TRUKK unit from your army ends a Normal, Advance or Fall Back move',
    effect: 'Select one enemy unit within 9" of your unit. That enemy unit must take a Battle-shock test and, when doing so, subtract 1 from the result.',
    faction: 'Orks',
    detachment: 'Speed Freeks',
    turn: 'your-turn',
  },
  {
    id: 'more-gitz-over-ere',
    name: "More Gitz Over 'Ere!",
    cost: 1,
    phase: 'move',
    when: "Your opponent's Movement phase, after an enemy unit ends a move",
    effect: 'Select one SPEED FREEKS unit from your army within 9" of that enemy unit and not within Engagement Range of any enemy units. That unit can make a Normal move of up to 6".',
    faction: 'Orks',
    detachment: 'Speed Freeks',
    turn: 'opponent-turn',
  },
];

// Space Wolves Stratagems
export const SPACE_WOLVES_STRATAGEMS: Stratagem[] = [
  {
    id: 'envelop-and-ensnare',
    name: 'Envelop and Ensnare',
    cost: 1,
    phase: 'fight',
    when: 'Your Fight phase, when a SPACE WOLVES unit (excluding MONSTERS or VEHICLES) has not been selected to fight',
    effect: 'That unit can make 6" Pile-in and Consolidation moves. Each model does not have to end closer to the closest enemy model, but must end closer to the closest enemy unit.',
    faction: 'Space Wolves',
    detachment: 'Saga of the Hunter',
    turn: 'your-turn',
  },
  {
    id: 'territorial-advantage',
    name: 'Territorial Advantage',
    cost: 1,
    phase: 'fight',
    when: 'Your Fight phase, just after an enemy unit is destroyed by an ADEPTUS ASTARTES unit from your army',
    effect: 'Pick one objective marker that unit is within range of. That objective marker remains under your control until your opponent controls it.',
    faction: 'Space Wolves',
    detachment: 'Saga of the Hunter',
    turn: 'your-turn',
  },
  {
    id: 'overwhelming-onslaught',
    name: 'Overwhelming Onslaught',
    cost: 1,
    phase: 'fight',
    when: "Your opponent's Fight phase, just after an enemy unit has selected its targets",
    effect: 'Select either two ADEPTUS ASTARTES units or one SPACE WOLVES BEASTS unit within Engagement Range of that enemy unit. Until the end of the phase, subtract 1 from Hit rolls made by that enemy unit.',
    faction: 'Space Wolves',
    detachment: 'Saga of the Hunter',
    turn: 'opponent-turn',
  },
  {
    id: 'chosen-prey',
    name: 'Chosen Prey',
    cost: 1,
    phase: 'move',
    when: 'Your Movement phase, just after a SPACE WOLVES unit from your army Falls Back',
    effect: 'That unit can shoot and declare a charge this turn.',
    faction: 'Space Wolves',
    detachment: 'Saga of the Hunter',
    turn: 'your-turn',
  },
  {
    id: 'bounding-advance',
    name: 'Bounding Advance',
    cost: 1,
    phase: 'any',
    when: 'Your Movement phase or Charge phase, select one SPACE WOLVES INFANTRY or BEASTS unit that has not moved or declared a charge this phase',
    effect: 'Until the end of the phase, models in that unit can move through non-TITANIC models when making a Normal, Advance, Fall Back, or Charge move.',
    faction: 'Space Wolves',
    detachment: 'Saga of the Hunter',
    turn: 'your-turn',
  },
  {
    id: 'marked-for-destruction',
    name: 'Marked for Destruction',
    cost: 1,
    phase: 'shoot',
    when: 'Your Shooting phase, select two ADEPTUS ASTARTES units (excluding BEASTS) that have not been selected to shoot',
    effect: 'Select one enemy unit visible to both. Until the end of the phase, models in your units can only target that enemy unit, and re-roll Wound rolls of 1 against it.',
    faction: 'Space Wolves',
    detachment: 'Saga of the Hunter',
    turn: 'your-turn',
  },
];

// Adeptus Astartes - Gladius Task Force Stratagems
export const SPACE_MARINES_GLADIUS_STRATAGEMS: Stratagem[] = [
  {
    id: 'armour-of-contempt',
    name: 'Armour of Contempt',
    cost: 1,
    phase: 'any',
    when: "Your opponent's Shooting phase or Fight phase, just after an enemy unit has selected its targets",
    effect: 'Until the attacking unit has finished making its attacks, worsen the Armour Penetration characteristic of those attacks by 1.',
    faction: 'Adeptus Astartes',
    detachment: 'Gladius Task Force',
    turn: 'opponent-turn',
  },
  {
    id: 'only-in-death-does-duty-end',
    name: 'Only in Death Does Duty End',
    cost: 2,
    phase: 'fight',
    when: 'Fight phase, just after an enemy unit has selected its targets',
    effect: 'Until the end of the phase, each time a model in your unit is destroyed, if that model has not fought this phase, do not remove it from play. The destroyed model can fight after the attacking unit has finished making its attacks, and is then removed.',
    faction: 'Adeptus Astartes',
    detachment: 'Gladius Task Force',
    turn: 'opponent-turn',
  },
  {
    id: 'honour-the-chapter',
    name: 'Honour the Chapter',
    cost: 1,
    phase: 'fight',
    when: 'Fight phase',
    effect: 'Until the end of the phase, melee weapons equipped by models in your unit have the [LANCE] ability. If your unit is under the effects of the Assault Doctrine, improve the Armour Penetration characteristic of such weapons by 1 as well.',
    faction: 'Adeptus Astartes',
    detachment: 'Gladius Task Force',
    turn: 'your-turn',
  },
  {
    id: 'adaptive-strategy',
    name: 'Adaptive Strategy',
    cost: 1,
    phase: 'command',
    when: 'Your Command phase',
    effect: 'Select the Devastator Doctrine, Tactical Doctrine or Assault Doctrine. Until the start of your next Command phase, that Combat Doctrine is active for that unit instead of any other Combat Doctrine that is active for your army, even if you have already selected that doctrine this battle.',
    faction: 'Adeptus Astartes',
    detachment: 'Gladius Task Force',
    turn: 'your-turn',
  },
  {
    id: 'storm-of-fire',
    name: 'Storm of Fire',
    cost: 1,
    phase: 'shoot',
    when: 'Your Shooting phase',
    effect: 'Until the end of the phase, ranged weapons equipped by models in your unit have the [IGNORES COVER] ability. If your unit is under the effects of the Devastator Doctrine, improve the Armour Penetration characteristic of such weapons by 1 as well.',
    faction: 'Adeptus Astartes',
    detachment: 'Gladius Task Force',
    turn: 'your-turn',
  },
  {
    id: 'squad-tactics',
    name: 'Squad Tactics',
    cost: 1,
    phase: 'move',
    when: "Your opponent's Movement phase, just after an enemy unit ends a Normal, Advance or Fall Back move",
    effect: 'Your unit can make a Normal move of up to D6", or a Normal move of up to 6" instead if it is under the effects of the Tactical Doctrine. You cannot select a unit within Engagement Range of any enemy units.',
    faction: 'Adeptus Astartes',
    detachment: 'Gladius Task Force',
    turn: 'opponent-turn',
  },
];

// Death Guard - Mortarion's Hammer Stratagems
export const DEATH_GUARD_MORTARIONS_HAMMER_STRATAGEMS: Stratagem[] = [
  {
    id: 'blighted-land',
    name: 'Blighted Land',
    cost: 2,
    phase: 'move',
    when: 'End of your Movement phase',
    effect: 'Select one terrain feature within 24" of and visible to one DEATH GUARD VEHICLE unit from your army. Until the start of your next turn, enemy units are Afflicted while they are within 3" of that terrain feature.',
    faction: 'Death Guard',
    detachment: "Mortarion's Hammer",
    turn: 'your-turn',
  },
  {
    id: 'relentless-grind',
    name: 'Relentless Grind',
    cost: 1,
    phase: 'move-or-charge',
    when: 'Your Movement phase or your Charge phase',
    effect: 'Select one DEATH GUARD VEHICLE unit from your army that has not been selected to move or charge this phase. Until the end of the phase, each time your unit makes a Normal, Advance or Charge move, it can move horizontally through terrain features.',
    faction: 'Death Guard',
    detachment: "Mortarion's Hammer",
    turn: 'your-turn',
  },
  {
    id: 'drawn-to-despair',
    name: 'Drawn to Despair',
    cost: 1,
    phase: 'shoot',
    when: 'Your Shooting phase',
    effect: 'Select one DEATH GUARD unit from your army that has not been selected to shoot this phase. Until the end of the phase, each time a model in your unit makes an attack that targets a visible enemy unit (excluding AIRCRAFT) within your opponent\'s deployment zone, you can re-roll the Hit roll.',
    faction: 'Death Guard',
    detachment: "Mortarion's Hammer",
    turn: 'your-turn',
  },
  {
    id: 'font-of-filth',
    name: 'Font of Filth',
    cost: 1,
    phase: 'shoot',
    when: 'Your Shooting phase',
    effect: 'Select one DEATH GUARD VEHICLE unit from your army that has not been selected to shoot this phase. Until the end of the phase, ranged weapons equipped by models in your unit have the [ASSAULT] ability.',
    faction: 'Death Guard',
    detachment: "Mortarion's Hammer",
    turn: 'your-turn',
  },
  {
    id: 'eyestinger-storm',
    name: 'Eyestinger Storm',
    cost: 1,
    phase: 'command',
    when: "Your opponent's Command phase",
    effect: 'Select one DEATH GUARD VEHICLE unit from your army, then select one objective marker visible to one or more models in your unit. Each Afflicted enemy unit within range of that objective marker must take a Battle-shock test; enemy units affected by this Stratagem do not need to take any other Battle-shock tests in the same phase.',
    faction: 'Death Guard',
    detachment: "Mortarion's Hammer",
    turn: 'opponent-turn',
  },
  {
    id: 'stinking-mire',
    name: 'Stinking Mire',
    cost: 1,
    phase: 'charge',
    when: "Start of your opponent's Charge phase",
    effect: 'Select one DEATH GUARD VEHICLE unit from your army. Until the end of the phase, each time an enemy unit selects your unit as the target of a charge, subtract 2 from the Charge roll (this is not cumulative with any other negative modifiers to that Charge roll).',
    faction: 'Death Guard',
    detachment: "Mortarion's Hammer",
    turn: 'opponent-turn',
  },
];

// Helper function to get all stratagems for a faction/detachment
export function getAvailableStratagems(faction?: string, detachment?: string): Stratagem[] {
  const stratagems = [...CORE_STRATAGEMS];

  if (faction?.toLowerCase().includes('ork')) {
    if (detachment === 'Green Tide') {
      stratagems.push(...ORKS_GREEN_TIDE_STRATAGEMS);
    } else if (detachment === 'Speed Freeks' || detachment === 'Kult of Speed') {
      stratagems.push(...ORKS_SPEED_FREEKS_STRATAGEMS);
    }
  }

  if (faction?.toLowerCase().includes('space wolves')) {
    if (detachment === 'Saga of the Hunter') {
      stratagems.push(...SPACE_WOLVES_STRATAGEMS);
    }
  }

  if (faction?.toLowerCase().includes('adeptus astartes')) {
    if (detachment === 'Gladius Task Force') {
      stratagems.push(...SPACE_MARINES_GLADIUS_STRATAGEMS);
    }
  }

  if (faction?.toLowerCase().includes('death guard')) {
    const normalizedDetachment = detachment?.toLowerCase() || '';
    if (normalizedDetachment.includes('mortarion') && normalizedDetachment.includes('hammer')) {
      stratagems.push(...DEATH_GUARD_MORTARIONS_HAMMER_STRATAGEMS);
    }
  }

  return stratagems;
}

// Helper function to filter stratagems by phase
export function getStratagemsForPhase(stratagems: Stratagem[], phase: string): Stratagem[] {
  return stratagems.filter((s) => {
    if (s.phase === 'any' || s.phase === phase) return true;
    if (s.phase === 'move-or-charge') return phase === 'move' || phase === 'charge';
    return false;
  });
}

// Helper function to filter stratagems by turn
export function getStratagemsForTurn(stratagems: Stratagem[], isYourTurn: boolean): Stratagem[] {
  return stratagems.filter(s => {
    if (!s.turn || s.turn === 'either') return true;
    if (isYourTurn) return s.turn === 'your-turn';
    return s.turn === 'opponent-turn';
  });
}

function isStratagemAvailableNow(stratagem: Stratagem, isYourTurn: boolean): boolean {
  if (!stratagem.turn || stratagem.turn === 'either') return true;
  if (isYourTurn) return stratagem.turn === 'your-turn';
  return stratagem.turn === 'opponent-turn';
}

function compareDrawerPriority(a: Stratagem, b: Stratagem): number {
  const aIsDetachment = !!a.detachment;
  const bIsDetachment = !!b.detachment;
  if (aIsDetachment !== bIsDetachment) {
    return aIsDetachment ? -1 : 1;
  }
  return a.name.localeCompare(b.name);
}

export function getStratagemsForDrawer(stratagems: Stratagem[], isYourTurn: boolean): StratagemDrawerEntry[] {
  const availableNow: Stratagem[] = [];
  const unavailableNow: Stratagem[] = [];

  for (const stratagem of stratagems) {
    if (isStratagemAvailableNow(stratagem, isYourTurn)) {
      availableNow.push(stratagem);
    } else {
      unavailableNow.push(stratagem);
    }
  }

  availableNow.sort(compareDrawerPriority);
  unavailableNow.sort(compareDrawerPriority);

  return [
    ...availableNow.map((stratagem) => ({ stratagem, isAvailableNow: true })),
    ...unavailableNow.map((stratagem) => ({ stratagem, isAvailableNow: false })),
  ];
}
