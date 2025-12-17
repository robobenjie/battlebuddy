/**
 * Combat calculator engine that orchestrates dice rolling with keyword modifiers
 */

import {
  calculateTotalAttacks,
  rollAttacks,
  calculateWoundThreshold,
  rollWounds,
  calculateSaveThreshold,
  rollSaves,
  rollFeelNoPain,
  parseDamageValue,
  parseAttackCount,
  AttackResult,
  WoundResult,
  SaveResult,
  FNPResult
} from './dice-utils';

import {
  Rule,
  ArmyState,
  buildCombatContext,
  evaluateAllRules,
  getAddedKeywords,
  CombatContext
} from './rules-engine';

export interface WeaponStats {
  name: string;
  range: number;
  A: string; // Attack characteristic
  WS?: number; // BS/WS value (the number, not "+")
  S: number;
  AP: number;
  D: string;
  keywords: string[];
}

export interface TargetStats {
  T: number;
  SV: number;
  INV?: number;
  FNP?: number;  // Feel No Pain save (e.g. 5 for 5+)
  modelCount: number;
  categories: string[];
  keywords?: string[];  // For parsing unit keywords like Feel No Pain
}

export interface CombatOptions {
  modelsFiring: number;
  withinHalfRange: boolean;
  blastBonusAttacks: number;
  unitHasCharged: boolean;
  unitRemainedStationary: boolean;
  userInputs?: Record<string, any>; // User-provided input values for conditional rules
}

export interface KeywordModifiers {
  rapidFireValue: number | null;
  sustainedHitsValue: number | null;
  lethalHits: boolean;
  twinLinked: boolean;
  lance: boolean;
  antiXCategory: string | null;
  antiXThreshold: number | null;
  meltaValue: number | null;
  heavy: boolean;
  blast: boolean;
  torrent: boolean;
}

export interface CombatResult {
  attackPhase: AttackResult;
  woundPhase: WoundResult;
  savePhase?: SaveResult;
  fnpPhase?: FNPResult;
  keywords: KeywordModifiers;
  modifiedWeapon: WeaponStats; // The weapon with all modifiers applied
  summary: {
    totalAttacks: number;
    totalHits: number;
    sustainedHitsBonus: number;
    totalWounds: number;
    rerolledWounds: number;
    failedSaves: number;
    totalDamage: number;
  };
  options: CombatOptions;
}

/**
 * Parse weapon keywords to extract modifiers
 */
export function parseKeywords(keywords: string[], targetCategories: string[]): KeywordModifiers {
  const modifiers: KeywordModifiers = {
    rapidFireValue: null,
    sustainedHitsValue: null,
    lethalHits: false,
    twinLinked: false,
    lance: false,
    antiXCategory: null,
    antiXThreshold: null,
    meltaValue: null,
    heavy: false,
    blast: false,
    torrent: false
  };

  keywords.forEach(keyword => {
    const lower = keyword.toLowerCase();

    // Rapid Fire X
    const rapidFireMatch = keyword.match(/^rapid\s+fire\s+(\d+)$/i);
    if (rapidFireMatch) {
      modifiers.rapidFireValue = parseInt(rapidFireMatch[1], 10);
    }

    // Sustained Hits X
    const sustainedHitsMatch = keyword.match(/^sustained\s+hits\s+(\d+)$/i);
    if (sustainedHitsMatch) {
      modifiers.sustainedHitsValue = parseInt(sustainedHitsMatch[1], 10);
    }

    // Lethal Hits
    if (lower === 'lethal hits' || lower === 'lethal-hits') {
      modifiers.lethalHits = true;
    }

    // Twin-Linked
    if (lower === 'twin-linked' || lower === 'twin linked') {
      modifiers.twinLinked = true;
    }

    // Lance
    if (lower === 'lance') {
      modifiers.lance = true;
    }

    // Anti-X Y+
    const antiMatch = keyword.match(/^anti[- ](.+?)\s+(\d+)\+?$/i);
    if (antiMatch) {
      const category = antiMatch[1].trim();
      const threshold = parseInt(antiMatch[2], 10);

      // Check if target has this category
      const hasCategory = targetCategories.some(cat =>
        cat.toLowerCase() === category.toLowerCase()
      );

      if (hasCategory) {
        modifiers.antiXCategory = category;
        modifiers.antiXThreshold = threshold;
      }
    }

    // Melta X
    const meltaMatch = keyword.match(/^melta\s+(\d+)$/i);
    if (meltaMatch) {
      modifiers.meltaValue = parseInt(meltaMatch[1], 10);
    }

    // Heavy
    if (lower === 'heavy') {
      modifiers.heavy = true;
    }

    // Blast
    if (lower === 'blast') {
      modifiers.blast = true;
    }

    // Torrent
    if (lower === 'torrent') {
      modifiers.torrent = true;
    }
  });

  return modifiers;
}

/**
 * Parse unit keywords to extract defensive abilities like Invuln and FNP
 */
export function parseUnitKeywords(keywords: string[]): { invuln: number | null; fnp: number | null } {
  let invuln: number | null = null;
  let fnp: number | null = null;

  keywords?.forEach(keyword => {
    // Invulnerable Save X+ (e.g. "Invulnerable Save 5" or "Invulnerable Save 4+")
    const invulnMatch = keyword.match(/^invulnerable\s+save\s+(\d+)\+?$/i);
    if (invulnMatch) {
      invuln = parseInt(invulnMatch[1], 10);
    }

    // Feel No Pain X+ (e.g. "Feel No Pain 5" or "Feel No Pain 6+")
    const fnpMatch = keyword.match(/^feel\s+no\s+pain\s+(\d+)\+?$/i);
    if (fnpMatch) {
      fnp = parseInt(fnpMatch[1], 10);
    }
  });

  return { invuln, fnp };
}

/**
 * Calculate and merge combat modifiers from both attacker and defender perspectives
 * Returns the combined modifiers that should be applied to the combat
 */
export function calculateCombatModifiers(params: {
  attacker: any;
  defender: any;
  weapon: WeaponStats;
  game: any;
  combatPhase: 'shooting' | 'melee';
  options: CombatOptions;
  attackerRules: Rule[];
  defenderRules: Rule[];
  attackerArmyStates: ArmyState[];
  defenderArmyStates: ArmyState[];
}): {
  hitModifier: number;
  woundModifier: number;
  weaponModifiers: { A: number; S: number; AP: number; D: number };
  targetModifiers: { T: number; SV: number; INV?: number; FNP?: number };
  addedKeywords: string[];
  appliedRules: Rule[];
} {
  // Build separate contexts for attacker and defender
  const attackerContext = buildCombatContext({
    attacker: params.attacker,
    defender: params.defender,
    weapon: params.weapon,
    game: params.game,
    combatPhase: params.combatPhase,
    combatRole: 'attacker',
    options: params.options,
    rules: params.attackerRules,
    armyStates: params.attackerArmyStates
  });

  const defenderContext = buildCombatContext({
    attacker: params.attacker,
    defender: params.defender,
    weapon: params.weapon,
    game: params.game,
    combatPhase: params.combatPhase,
    combatRole: 'defender',
    options: params.options,
    rules: params.defenderRules,
    armyStates: params.defenderArmyStates
  });

  // Evaluate rules separately for attacker and defender
  const appliedAttackerRules = evaluateAllRules(params.attackerRules, attackerContext);
  const appliedDefenderRules = evaluateAllRules(params.defenderRules, defenderContext);

  // Merge applied rules
  const appliedRules = [...appliedAttackerRules, ...appliedDefenderRules];

  // Extract modifiers from attacker context (offensive modifiers)
  const hitModifier = attackerContext.modifiers.get('hit');
  const attackerWoundModifier = attackerContext.modifiers.get('wound');

  // Extract modifiers from defender context (defensive modifiers)
  // Defensive wound modifiers affect the attacker's wound roll
  const defenderWoundModifier = defenderContext.modifiers.get('wound');

  // Combine wound modifiers (attacker bonuses + defender penalties)
  const woundModifier = attackerWoundModifier + defenderWoundModifier;

  // Extract weapon characteristic modifiers (from attacker)
  const weaponModifiers = {
    A: attackerContext.modifiers.get('A') || 0,
    S: attackerContext.modifiers.get('S') || 0,
    AP: attackerContext.modifiers.get('AP') || 0,
    D: attackerContext.modifiers.get('D') || 0
  };

  // Extract target stat modifiers (from defender)
  const tMod = defenderContext.modifiers.get('T') || 0;
  const svMod = defenderContext.modifiers.get('SV') || 0;

  // Extract save modifiers from defender context
  const invulnKeywords = defenderContext.modifiers.getModifiers('keyword:Invulnerable Save');
  const invMod = invulnKeywords.length > 0
    ? Math.min(...invulnKeywords.map(m => m.value))
    : undefined;

  const fnpKeywords = defenderContext.modifiers.getModifiers('keyword:Feel No Pain');
  const fnpMod = fnpKeywords.length > 0
    ? Math.min(...fnpKeywords.map(m => m.value))
    : undefined;

  const targetModifiers = {
    T: tMod,
    SV: svMod,
    INV: invMod,
    FNP: fnpMod
  };

  // Get added keywords from attacker context
  const addedKeywords = getAddedKeywords(attackerContext);

  return {
    hitModifier,
    woundModifier,
    weaponModifiers,
    targetModifiers,
    addedKeywords,
    appliedRules
  };
}

/**
 * Execute the full combat sequence with rules engine support
 */
export function executeCombatSequence(
  weapon: WeaponStats,
  target: TargetStats,
  options: CombatOptions,
  params?: {
    attacker?: any;
    game?: any;
    combatPhase?: 'shooting' | 'melee';
    rules?: Rule[];
    armyStates?: ArmyState[];
    // Pre-calculated modifiers (if provided, skip rule evaluation)
    preCalculatedModifiers?: {
      hitModifier: number;
      woundModifier: number;
      weaponModifiers: { A: number; S: number; AP: number; D: number };
      addedKeywords: string[];
      appliedRules: Rule[];
    };
  }
): CombatResult {
  // Use pre-calculated modifiers if provided, otherwise calculate from rules
  let hitMod = 0;
  let woundMod = 0;
  let aMod = 0;
  let sMod = 0;
  let apMod = 0;
  let dMod = 0;
  let addedKeywords: string[] = [];
  let appliedRules: Rule[] = [];

  if (params?.preCalculatedModifiers) {
    // Use pre-calculated modifiers (already merged from attacker and defender)
    hitMod = params.preCalculatedModifiers.hitModifier;
    woundMod = params.preCalculatedModifiers.woundModifier;
    aMod = params.preCalculatedModifiers.weaponModifiers.A;
    sMod = params.preCalculatedModifiers.weaponModifiers.S;
    apMod = params.preCalculatedModifiers.weaponModifiers.AP;
    dMod = params.preCalculatedModifiers.weaponModifiers.D;
    addedKeywords = params.preCalculatedModifiers.addedKeywords;
    appliedRules = params.preCalculatedModifiers.appliedRules;
  } else if (params?.rules && params?.attacker && params?.game) {
    // Legacy path: calculate modifiers from rules (only supports attacker rules)
    const context = buildCombatContext({
      attacker: params.attacker,
      defender: target,
      weapon,
      game: params.game,
      combatPhase: params.combatPhase || 'shooting',
      options,
      rules: params.rules,
      armyStates: params.armyStates || []
    });

    // Evaluate all rules and apply modifiers
    appliedRules = evaluateAllRules(params.rules, context);

    // Extract modifiers from context
    hitMod = context.modifiers.get('hit');
    woundMod = context.modifiers.get('wound');
    aMod = context.modifiers.get('A') || 0;
    sMod = context.modifiers.get('S') || 0;
    apMod = context.modifiers.get('AP') || 0;
    dMod = context.modifiers.get('D') || 0;
    addedKeywords = getAddedKeywords(context);
  }

  // Apply weapon modifiers (works for both legacy and new paths)
  // Merge added keywords with weapon keywords
  weapon = {
    ...weapon,
    keywords: [...weapon.keywords, ...addedKeywords]
  };

  // Check for "Extra Attacks" keyword - these weapons cannot have attacks modified
  const hasExtraAttacks = weapon.keywords?.some((kw: string) =>
    kw.toLowerCase() === 'extra attacks'
  );

  // Modify attacks properly (handle string parsing)
  let modifiedA = weapon.A;
  // Only apply A modifier if weapon doesn't have "Extra Attacks" keyword
  if (aMod !== 0 && !hasExtraAttacks) {
    const parsed = parseAttackCount(weapon.A);
    if (parsed.dice > 0) {
      // Dice notation: add to modifier (e.g., "d6" → "d6+5")
      const newMod = parsed.modifier + aMod;
      if (newMod > 0) {
        modifiedA = `D${parsed.dice}+${newMod}`;
      } else {
        modifiedA = `D${parsed.dice}`;
      }
    } else {
      // Fixed attacks: add to fixed value (e.g., "5" → "10")
      const newFixed = parsed.fixed + parsed.modifier + aMod;
      modifiedA = newFixed.toString();
    }
  }

  // Modify damage properly (handle string parsing)
  let modifiedD = weapon.D;
  if (dMod !== 0) {
    const parsed = parseAttackCount(weapon.D); // Reuse attack parser - same format
    if (parsed.dice > 0) {
      // Dice notation: add to modifier (e.g., "d6" → "d6+2")
      const newMod = parsed.modifier + dMod;
      if (newMod > 0) {
        modifiedD = `D${parsed.dice}+${newMod}`;
      } else if (newMod < 0) {
        modifiedD = `D${parsed.dice}${newMod}`;
      } else {
        modifiedD = `D${parsed.dice}`;
      }
    } else {
      // Fixed damage: add to fixed value (e.g., "3" → "5")
      const newFixed = parsed.fixed + parsed.modifier + dMod;
      modifiedD = Math.max(1, newFixed).toString();
    }
  }

  weapon = {
    ...weapon,
    A: modifiedA,
    S: weapon.S + sMod,
    AP: weapon.AP + apMod,
    D: modifiedD
  };

  console.log('⚔️ Applied weapon modifiers:', { A: aMod, S: sMod, AP: apMod, D: dMod });
  console.log('📈 Modified weapon stats:', { A: weapon.A, S: weapon.S, AP: weapon.AP, D: weapon.D });

  // Parse keywords (now includes rule-added keywords)
  const keywords = parseKeywords(weapon.keywords, target.categories);

  // ===== ATTACK PHASE =====

  // Calculate rapid fire bonus
  let rapidFireBonus = 0;
  if (keywords.rapidFireValue && options.withinHalfRange) {
    rapidFireBonus = keywords.rapidFireValue * options.modelsFiring;
  }

  // Calculate total attacks
  const attacksResult = calculateTotalAttacks(
    weapon.A,
    options.modelsFiring,
    rapidFireBonus,
    options.blastBonusAttacks
  );
  const totalAttacks = attacksResult.total;

  // Calculate hit threshold
  let hitThreshold = weapon.WS || -99; // Use -99 to make missing WS obvious

  // Heavy: +1 to hit if remained stationary
  if (keywords.heavy && options.unitRemainedStationary) {
    hitThreshold = Math.max(2, hitThreshold - 1);
  }

  // Apply hit modifiers (works for both legacy and new paths)
  hitThreshold = Math.max(2, Math.min(6, hitThreshold - hitMod));

  // Roll attacks
  const attackPhase = rollAttacks(totalAttacks, hitThreshold, {
    sustainedHitsValue: keywords.sustainedHitsValue || undefined,
    lethalHits: keywords.lethalHits,
    torrent: keywords.torrent,
    attackCountRolls: attacksResult.rolls
  });

  // ===== WOUND PHASE =====

  // Calculate wound threshold
  const woundThreshold = calculateWoundThreshold(weapon.S, target.T, {
    lance: keywords.lance && options.unitHasCharged
  });

  // Apply wound modifiers (works for both legacy and new paths)
  // NOTE: woundMod now includes both attacker bonuses AND defender penalties (merged in calculateCombatModifiers)
  let adjustedWoundThreshold = Math.max(2, Math.min(6, woundThreshold - woundMod));

  // Roll wounds
  const woundPhase = rollWounds(
    attackPhase.hits.length,
    attackPhase.lethalHits,
    adjustedWoundThreshold,
    {
      twinLinked: keywords.twinLinked,
      antiXThreshold: keywords.antiXThreshold || undefined
    }
  );

  // ===== CALCULATE SUMMARY =====

  const sustainedHitsBonus = keywords.sustainedHitsValue
    ? attackPhase.criticalHits.length * keywords.sustainedHitsValue
    : 0;

  const rerolledWounds = woundPhase.woundRolls.filter(r => r.isReroll).length;

  const summary = {
    totalAttacks,
    totalHits: attackPhase.hits.length,
    sustainedHitsBonus,
    totalWounds: woundPhase.wounds.length,
    rerolledWounds,
    failedSaves: 0,
    totalDamage: 0
  };

  return {
    attackPhase,
    woundPhase,
    keywords,
    modifiedWeapon: weapon, // Return the modified weapon
    summary,
    options
  };
}

/**
 * Execute save phase separately (called after attacks/wounds)
 */
export function executeSavePhase(
  combatResult: CombatResult,
  weapon: WeaponStats,
  target: TargetStats
): CombatResult {
  // Use the modified weapon from combat result (which has all modifiers applied)
  const effectiveWeapon = combatResult.modifiedWeapon;

  // Calculate save threshold
  const saveCalc = calculateSaveThreshold(target.SV, effectiveWeapon.AP, target.INV);

  // Calculate Melta bonus
  const meltaBonus = (combatResult.keywords.meltaValue && combatResult.options.withinHalfRange)
    ? combatResult.keywords.meltaValue
    : 0;

  // Roll saves (pass damage string so it can roll individually for variable damage)
  const savePhase = rollSaves(
    combatResult.woundPhase.wounds.length,
    saveCalc.threshold,
    effectiveWeapon.D,
    meltaBonus
  );

  // Update summary
  const updatedSummary = {
    ...combatResult.summary,
    failedSaves: savePhase.failedSaves.length,
    totalDamage: savePhase.totalDamage
  };

  return {
    ...combatResult,
    savePhase,
    summary: updatedSummary
  };
}

/**
 * Execute Feel No Pain phase (called after save phase)
 * Rolls FNP saves for each point of damage to negate wounds
 */
export function executeFNPPhase(
  combatResult: CombatResult,
  target: TargetStats
): CombatResult {
  // Check if target has FNP
  if (!target.FNP || !combatResult.savePhase) {
    return combatResult;
  }

  const totalDamage = combatResult.savePhase.totalDamage;

  // If no damage, skip FNP
  if (totalDamage === 0) {
    return combatResult;
  }

  // Roll Feel No Pain saves
  const fnpPhase = rollFeelNoPain(totalDamage, target.FNP);

  // Update summary with final damage after FNP
  const updatedSummary = {
    ...combatResult.summary,
    totalDamage: fnpPhase.finalDamage
  };

  return {
    ...combatResult,
    fnpPhase,
    summary: updatedSummary
  };
}
