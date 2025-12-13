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
  parseDamageValue,
  parseAttackCount,
  AttackResult,
  WoundResult,
  SaveResult
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
  modelCount: number;
  categories: string[];
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
  keywords: KeywordModifiers;
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
  }
): CombatResult {
  // Build context if rules are provided
  let context: CombatContext | null = null;
  let appliedRules: Rule[] = [];

  if (params?.rules && params?.attacker && params?.game) {
    context = buildCombatContext({
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

    // Get added keywords from rules
    const addedKeywords = getAddedKeywords(context);

    // Merge with weapon keywords
    weapon = {
      ...weapon,
      keywords: [...weapon.keywords, ...addedKeywords]
    };

    // Apply weapon characteristic modifiers from rules
    const aMod = context.modifiers.get('A') || 0;
    const sMod = context.modifiers.get('S') || 0;
    const apMod = context.modifiers.get('AP') || 0;
    const dMod = context.modifiers.get('D') || 0;

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

    weapon = {
      ...weapon,
      A: modifiedA,
      S: weapon.S + sMod,
      AP: weapon.AP + apMod,
      D: weapon.D + dMod
    };

    console.log('⚔️ Applied weapon modifiers:', { A: aMod, S: sMod, AP: apMod, D: dMod });
    console.log('📈 Modified weapon stats:', { A: weapon.A, S: weapon.S, AP: weapon.AP, D: weapon.D });
  }

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

  // Apply hit modifiers from rules
  if (context) {
    const hitMod = context.modifiers.get('hit');
    hitThreshold = Math.max(2, Math.min(6, hitThreshold - hitMod));
  }

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

  // Apply wound modifiers from rules
  let adjustedWoundThreshold = woundThreshold;
  if (context) {
    const woundMod = context.modifiers.get('wound');
    adjustedWoundThreshold = Math.max(2, Math.min(6, woundThreshold - woundMod));
  }

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
  // Calculate save threshold
  const saveCalc = calculateSaveThreshold(target.SV, weapon.AP, target.INV);

  // Calculate Melta bonus
  const meltaBonus = (combatResult.keywords.meltaValue && combatResult.options.withinHalfRange)
    ? combatResult.keywords.meltaValue
    : 0;

  // Roll saves (pass damage string so it can roll individually for variable damage)
  const savePhase = rollSaves(
    combatResult.woundPhase.wounds.length,
    saveCalc.threshold,
    weapon.D,
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
