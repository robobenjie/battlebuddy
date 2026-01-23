'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '../lib/db';
import UnitCard from './ui/UnitCard';
import WeaponProfileDisplay from './ui/WeaponProfileDisplay';
import ActiveRulesDisplay from './ui/ActiveRulesDisplay';
import { formatUnitForCard, sortUnitsByPriority, getUnitDisplayName } from '../lib/unit-utils';
import DigitalDiceMenu from './DigitalDiceMenu';
import DiceRollResults from './ui/DiceRollResults';
import { executeCombatSequence, executeSavePhase, executeFNPPhase, CombatResult, CombatOptions, WeaponStats, TargetStats, calculateCombatModifiers } from '../lib/combat-calculator-engine';
import { Rule, ArmyState, buildCombatContext, evaluateAllRules, getAddedKeywords, getAllUnitRules, evaluateWhen } from '../lib/rules-engine';
import { UNIT_FULL_QUERY, UNIT_BASIC_QUERY } from '../lib/query-fragments';
import { DiceRollEvent, CombatPhaseEvent } from '../lib/rooms-types';

interface CombatCalculatorPageProps {
  gameId?: string;
  unitId?: string;
  unit?: any;
  currentArmyId?: string;
  weaponType?: string;
  preSelectedWeaponName?: string;
  onClose?: () => void;
  currentPlayer?: {
    id: string;
    userId: string;
    name: string;
  };
}

export default function CombatCalculatorPage({
  gameId: propGameId,
  unitId: propUnitId,
  unit: propUnit,
  currentArmyId: propCurrentArmyId,
  weaponType,
  preSelectedWeaponName,
  onClose,
  currentPlayer: propCurrentPlayer
}: CombatCalculatorPageProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = propGameId || searchParams.get('gameId') || '';
  const unitId = propUnitId || searchParams.get('unitId') || '';

  // If unit is passed as prop, use it directly (no query needed)
  // Otherwise, query it (for standalone usage via URL)
  const { data: unitData } = db.useQuery(
    propUnit ? {} : {
      units: {
        ...UNIT_FULL_QUERY,
        army: {
          armyRules: {}
        },
        $: {
          where: {
            id: unitId
          }
        }
      }
    }
  );

  const unit = propUnit || unitData?.units?.[0];


  // Now try the full query, including destroyed units, rules, and army states
  const { data: enemyUnitData, isLoading, error } = db.useQuery({
    games: {
      armies: {
        armyRules: {},
        states: {}, // Note: the link label is "states", not "armyStates"
        units: {
          ...UNIT_FULL_QUERY,
        }
      },
      destroyedUnits: {},
      $: {
        where: {
          id: gameId
        }
      }
    }
  });


  const game = enemyUnitData?.games?.[0];
  const destroyedUnitIds = new Set((game?.destroyedUnits || []).map((u: any) => u.id));

  // Use prop currentPlayer if provided, otherwise derive from game
  // (When called from phase components, currentPlayer is passed; when standalone, need to derive it)
  const currentPlayer = propCurrentPlayer || (game ? { id: game.activePlayerId || '', userId: '', name: '' } : null);

  // Filter out the current unit's army - use prop if available, fallback to unit.armyId
  const currentArmyId = propCurrentArmyId || unit?.armyId;

  const enemyArmies = game?.armies?.filter((army: any) => army.id !== currentArmyId) || [];
  const enemyUnits = sortUnitsByPriority(
    (enemyArmies?.flatMap((army: any) => army.units) || [])
      .filter((unit: any) => !destroyedUnitIds.has(unit.id)), // Filter out destroyed units
    destroyedUnitIds
  );
  const oathTargetId = game?.armies
    ?.find((army: any) => army.id === currentArmyId)
    ?.states?.find((state: any) => state.state === 'oath-of-moment')
    ?.targetUnitId;

  // State for selected target and weapon
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>('');
  const selectedTarget = enemyUnits.find((enemyUnit: any) => enemyUnit.id === selectedTargetId);

  // State for Digital Dice functionality
  const [showDigitalDiceMenu, setShowDigitalDiceMenu] = useState(false);
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);
  const [showSavePhase, setShowSavePhase] = useState(false);
  const [rollInitiatorId, setRollInitiatorId] = useState<string>('');
  const [rollInitiatorName, setRollInitiatorName] = useState<string>('');

  // State for active rules display
  const [activeRules, setActiveRules] = useState<Rule[]>([]);
  const [hitModifier, setHitModifier] = useState(0);
  const [woundModifier, setWoundModifier] = useState(0);
  const [weaponStatModifiers, setWeaponStatModifiers] = useState<{
    A?: number;
    S?: number;
    AP?: number;
    D?: number;
  }>({});
  const [targetStatModifiers, setTargetStatModifiers] = useState<{
    T?: number;
    SV?: number;
    INV?: number;
    FNP?: number;
  }>({});
  const [addedKeywords, setAddedKeywords] = useState<string[]>([]);
  const [modifierSources, setModifierSources] = useState<{
    hit?: string[];
    wound?: string[];
    keywords?: Array<{ keyword: string; source: string }>;
    A?: string[];
    S?: string[];
    AP?: string[];
    D?: string[];
    damageReroll?: string[];
  }>({});
  const [currentArmyStates, setCurrentArmyStates] = useState<ArmyState[]>([]);

  // Room setup for real-time collaboration
  // Always initialize room (use dummy ID if no gameId to satisfy React hooks rules)
  const room = db.room('game', gameId || 'no-game');

  // Track presence in the game room (hook must be called unconditionally)
  const { peers, publishPresence } = db.rooms.usePresence(room, {
    initialData: {
      playerId: currentPlayer?.id || '',
      playerName: currentPlayer?.name || 'Unknown Player',
      status: 'active' as const,
      currentView: 'combat-calculator',
      lastAction: Date.now(),
    },
  });

  // Publish topic for dice roll results (hook must be called unconditionally)
  const publishDiceRoll = db.rooms.usePublishTopic(room, 'diceRollResult');

  // Publish topic for combat phase advancement (hook must be called unconditionally)
  const publishPhaseAdvance = db.rooms.usePublishTopic(room, 'combatPhaseAdvance');

  // Subscribe to dice roll results from other players (hook must be called unconditionally)
  db.rooms.useTopicEffect(room, 'diceRollResult', (event, peer) => {
    // Only process if we have a valid gameId and event is from another player
    if (!gameId || event.playerId === currentPlayer?.id) return;

    console.log(`🎲 [CombatCalc] Received dice roll from ${event.playerName}, phase: ${event.phase}`, event);
    // Set the combat result to show in the UI
    setCombatResult(event.combatResult as CombatResult);
    // When receiving 'attacks' phase, saves haven't been rolled yet (showSavePhase = false)
    // When receiving 'saves' or 'fnp' phase, saves have been rolled (showSavePhase = true)
    setShowSavePhase(event.phase === 'saves' || event.phase === 'fnp');
    setShowDigitalDiceMenu(false);
    setRollInitiatorId(event.playerId);
    setRollInitiatorName(event.playerName);
  });

  // Subscribe to combat phase advancement from other players (hook must be called unconditionally)
  db.rooms.useTopicEffect(room, 'combatPhaseAdvance', (event, peer) => {
    // Only process if we have a valid gameId and event is from another player
    if (!gameId || event.playerId === currentPlayer?.id) return;

    console.log(`⏭️ Received phase advance from ${event.playerName}:`, event.phase);
    // Handle phase advancement
    if (event.phase === 'show-saves' && combatResult) {
      setShowSavePhase(true);
    } else if (event.phase === 'show-fnp' && combatResult) {
      setShowSavePhase(false);
      // FNP phase would be handled similarly
    }
    // Note: 'complete' phase removed - each player closes their own view independently
  });

  // Update presence when view changes
  useEffect(() => {
    if (gameId && publishPresence && currentPlayer) {
      publishPresence({
        currentView: 'combat-calculator',
        lastAction: Date.now(),
      });
    }
  }, [gameId, selectedTargetId, selectedWeaponId, publishPresence, currentPlayer]);

  // Helper to apply weapon modifiers (consolidates logic for display and dice rolling)
  const applyWeaponModifiers = (baseWeapon: any, modifiers: { A?: number; S?: number; AP?: number; D?: number }): WeaponStats => {
    // Check for "Extra Attacks" keyword - these weapons cannot have attacks modified
    const hasExtraAttacks = baseWeapon.keywords?.some((kw: string) =>
      kw.toLowerCase() === 'extra attacks'
    );

    let modifiedA = baseWeapon.A;
    // Only apply A modifier if weapon doesn't have "Extra Attacks" keyword
    if (modifiers.A && !hasExtraAttacks) {
      const numMatch = baseWeapon.A.match(/^\d+$/);
      if (numMatch) {
        modifiedA = (parseInt(baseWeapon.A, 10) + modifiers.A).toString();
      } else {
        modifiedA = `${baseWeapon.A}+${modifiers.A}`;
      }
    }

    const applyDamageModifier = (baseDamage: string, mod: number) => {
      if (!mod) return baseDamage;
      const flatMatch = baseDamage.match(/^\d+$/);
      if (flatMatch) {
        return (parseInt(baseDamage, 10) + mod).toString();
      }

      const dieMatch = baseDamage.match(/^D([36])(?:\+(\d+))?$/i);
      if (dieMatch) {
        const sides = dieMatch[1];
        const existing = dieMatch[2] ? parseInt(dieMatch[2], 10) : 0;
        const next = existing + mod;
        return next > 0 ? `D${sides}+${next}` : `D${sides}`;
      }

      return `${baseDamage}+${mod}`;
    };

    return {
      name: baseWeapon.name,
      range: baseWeapon.range,
      A: modifiedA,
      WS: baseWeapon.WS,
      S: baseWeapon.S + (modifiers.S || 0),
      AP: baseWeapon.AP + (modifiers.AP || 0),
      D: applyDamageModifier(baseWeapon.D, modifiers.D || 0),
      keywords: baseWeapon.keywords || []
    };
  };

  // Ref for target select to auto-focus
  const targetSelectRef = useRef<HTMLSelectElement>(null);

  // Auto-focus the target dropdown when component mounts
  // Helper to apply target stat modifiers (for display and combat calculation)
  const applyTargetModifiers = (baseTarget: TargetStats | null | undefined, modifiers: { T?: number; SV?: number; INV?: number; FNP?: number }): TargetStats | null => {
    if (!baseTarget) return null;

    return {
      ...baseTarget,
      T: baseTarget.T + (modifiers.T || 0),
      SV: baseTarget.SV + (modifiers.SV || 0),
      INV: modifiers.INV !== undefined ? modifiers.INV : baseTarget.INV,
      FNP: modifiers.FNP !== undefined ? modifiers.FNP : baseTarget.FNP
    };
  };

  useEffect(() => {
    if (targetSelectRef.current) {
      targetSelectRef.current.focus();
    }
  }, []);

  // Query the unit's weapons dynamically so they update when fired
  const { data: weaponsData } = db.useQuery(
    unit?.id ? {
      units: {
        models: {
          weapons: {}
        },
        $: {
          where: {
            id: unit.id
          }
        }
      }
    } : {}
  );


  // Get all weapons from the queried unit (this will update when weapons are fired)
  const queriedUnit = weaponsData?.units?.[0];

  // Build a map of weapons with their model information
  // Filter by weapon type: melee (range === 0) or ranged (range > 0)
  const allWeaponsWithModels = queriedUnit?.models?.flatMap((model: any) =>
    (model.weapons?.filter((weapon: any) =>
      weaponType === 'melee' ? weapon.range === 0 : weapon.range > 0
    ) || []).map((weapon: any) => ({
      ...weapon,
      modelId: model.id
    }))
  ) || [];

  const allWeapons = allWeaponsWithModels;

  // Group weapons by name
  const weaponGroups: Record<string, any> = allWeapons.reduce((groups: Record<string, any>, weapon: any) => {
    const key = weapon.name;
    if (!groups[key]) {
      groups[key] = weapon;
    }
    return groups;
  }, {});

  const availableWeapons: any[] = Object.values(weaponGroups);
  const selectedWeapon = availableWeapons.find((w: any) => w.id === selectedWeaponId);

  // Helper to check if a weapon is a pistol
  const isPistol = (weapon: any) => {
    return weapon.keywords && weapon.keywords.some((keyword: string) => keyword.toLowerCase() === 'pistol');
  };

  // Check if a weapon group has been fired this turn
  // A weapon group is considered "fired" if ALL weapons with that name are fired
  const isWeaponFired = (weapon: any) => {
    if (!game?.currentTurn || !currentPlayer) return false;

    // Create turn+player identifier
    const turnPlayerId = `${game.currentTurn}-${currentPlayer.id}`;

    // Get all weapons with this name
    const weaponsWithSameName = allWeapons.filter((w: any) => w.name === weapon.name);

    // Check if ALL of them have been fired this player's turn
    return weaponsWithSameName.every((w: any) =>
      w.turnsFired && w.turnsFired.includes(turnPlayerId)
    );
  };

  // Get models that have fired pistols this player's turn
  const turnPlayerId = game && currentPlayer ? `${game.currentTurn}-${currentPlayer.id}` : '';
  const modelsThatFiredPistols = new Set(
    allWeapons
      .filter((w: any) => isPistol(w) && w.turnsFired && w.turnsFired.includes(turnPlayerId))
      .map((w: any) => w.modelId)
  );

  // Get models that have fired non-pistols this player's turn
  const modelsThatFiredNonPistols = new Set(
    allWeapons
      .filter((w: any) => !isPistol(w) && w.turnsFired && w.turnsFired.includes(turnPlayerId))
      .map((w: any) => w.modelId)
  );

  // A weapon group is disabled if:
  // 1. It's already fired, OR
  // 2. For ranged weapons only: Any instance of it is on a model that has fired the opposite type (pistol/non-pistol rule)
  const isWeaponDisabled = (weapon: any) => {
    if (isWeaponFired(weapon)) return true;

    // Melee weapons don't have pistol/non-pistol restriction
    if (weaponType === 'melee') return false;

    // Get all weapons with this name
    const weaponsWithSameName = allWeapons.filter((w: any) => w.name === weapon.name);

    // Check if any of these weapons are on models that have fired the opposite type
    return weaponsWithSameName.some((w: any) => {
      if (isPistol(w)) {
        // Pistol is disabled if its model has fired a non-pistol
        return modelsThatFiredNonPistols.has(w.modelId);
      } else {
        // Non-pistol is disabled if its model has fired a pistol
        return modelsThatFiredPistols.has(w.modelId);
      }
    });
  };

  // Available (non-disabled) weapons
  const availableUnfiredWeapons = availableWeapons.filter((w: any) => !isWeaponDisabled(w));
  const unfiredWeapons = availableWeapons.filter((w: any) => !isWeaponFired(w));
  const firedWeapons = availableWeapons.filter((w: any) => isWeaponFired(w));

  // Auto-close modal when all available weapons are fired or disabled
  useEffect(() => {
    if (availableWeapons.length > 0 && availableUnfiredWeapons.length === 0) {
      handleBack();
    }
  }, [availableUnfiredWeapons.length, availableWeapons.length]);

  // Auto-select next available unfired weapon when current selection is cleared or becomes fired/disabled
  useEffect(() => {
    const firstAvailable = availableUnfiredWeapons[0] as any;
    const firstAvailableId = firstAvailable?.id;

    // If no weapon is selected and there are available weapons, select the first one
    // OR if the currently selected weapon has been fired/disabled, select the next available one
    if (availableUnfiredWeapons.length > 0 && (!selectedWeaponId || (selectedWeaponId && !availableUnfiredWeapons.find((w: any) => w.id === selectedWeaponId)))) {
      setSelectedWeaponId(firstAvailableId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeaponId, availableUnfiredWeapons.length]);

  // Auto-select weapon if preSelectedWeaponName is provided
  useEffect(() => {
    if (preSelectedWeaponName && availableWeapons.length > 0 && !selectedWeaponId) {
      const weapon = availableWeapons.find((w: any) => w.name === preSelectedWeaponName) as any;
      if (weapon) {
        setSelectedWeaponId(weapon.id);
      }
    }
  }, [preSelectedWeaponName, availableWeapons, selectedWeaponId]);

  // Get target's defensive stats, model count, and categories
  const targetStats = selectedTarget?.models?.[0] ? {
    T: selectedTarget.models[0].T,
    SV: selectedTarget.models[0].SV,
    INV: selectedTarget.models[0].INV,
    FNP: selectedTarget.models[0].FNP,
    modelCount: selectedTarget.models?.length || 0,
    categories: selectedTarget.categories || [],
    keywords: selectedTarget.keywords || []
  } : undefined;

  const currentTurnKey = game?.currentTurn && propCurrentPlayer?.id
    ? `${game.currentTurn}-${propCurrentPlayer.id}`
    : null;

  const statusHasCurrentTurn = (status: any) => {
    if (!status?.turns) return false;
    if (currentTurnKey && status.turns.includes(currentTurnKey)) return true;
    if (game?.currentTurn !== undefined && status.turns.includes(game.currentTurn)) return true;
    if (game?.currentTurn !== undefined && status.turns.includes(String(game.currentTurn))) return true;
    return false;
  };

  const unitHasStatus = (unitToCheck: any, name: string) =>
    unitToCheck?.statuses?.some((status: any) =>
      status.name === name && statusHasCurrentTurn(status)
    ) || false;

  // Check if the attacking unit charged this turn (for lance keyword)
  const unitHasCharged = unitHasStatus(unit, 'charged');

  // Check if unit has moved or advanced this turn (for heavy weapon bonus)
  const unitHasMovedOrAdvanced = unitHasStatus(unit, 'moved') || unitHasStatus(unit, 'advanced');

  // Check if the target unit charged this turn (for defender rules that care)
  const targetHasCharged = unitHasStatus(selectedTarget, 'charged');

  // Check if target unit has moved or advanced this turn
  const targetHasMovedOrAdvanced = unitHasStatus(selectedTarget, 'moved') || unitHasStatus(selectedTarget, 'advanced');

  // Count total weapons with the same name
  const totalWeaponCount = selectedWeapon
    ? allWeapons.filter((w: any) => w.name === (selectedWeapon as any).name).length
    : 0;

  // Calculate modifiers when weapon or target changes
  useEffect(() => {
    if (!selectedWeaponId || !unit || !game) {
      // Reset modifiers if no weapon/unit/game
      setActiveRules([]);
      setHitModifier(0);
      setWoundModifier(0);
      setModifierSources({ hit: [], wound: [], keywords: [], damageReroll: [] });
      return;
    }

    // selectedWeapon is computed from selectedWeaponId
    if (!selectedWeapon) return;

    // Use actual target stats if available, otherwise use placeholder
    const effectiveTargetStats: TargetStats = targetStats || {
      T: 4,
      SV: 3,
      INV: undefined,
      modelCount: 10,
      categories: []
    };

    // Convert weapon to WeaponStats format
    const weaponStats: WeaponStats = {
      name: (selectedWeapon as any).name,
      range: (selectedWeapon as any).range,
      A: (selectedWeapon as any).A,
      WS: (selectedWeapon as any).WS,
      S: (selectedWeapon as any).S,
      AP: (selectedWeapon as any).AP,
      D: (selectedWeapon as any).D,
      keywords: (selectedWeapon as any).keywords || []
    };

    // Load applicable rules from database (linked rules)
    const attackerRules: Rule[] = [];
    const defenderRules: Rule[] = [];
    const addedAttackerRuleIds = new Set<string>(); // Track which rules we've already added to avoid duplicates
    const addedDefenderRuleIds = new Set<string>(); // Track which rules we've already added to avoid duplicates

    // Helper to add attacker rules with deduplication
    const addAttackerRules = (rules: Rule | Rule[]) => {
      const ruleArray = Array.isArray(rules) ? rules : [rules];
      for (const rule of ruleArray) {
        if (!addedAttackerRuleIds.has(rule.id)) {
          addedAttackerRuleIds.add(rule.id);
          attackerRules.push(rule);
        }
      }
    };

    // Helper to add defender rules with deduplication
    const addDefenderRules = (rules: Rule | Rule[]) => {
      const ruleArray = Array.isArray(rules) ? rules : [rules];
      for (const rule of ruleArray) {
        if (!addedDefenderRuleIds.has(rule.id)) {
          addedDefenderRuleIds.add(rule.id);
          defenderRules.push(rule);
        }
      }
    };

    // Get army rules from the current army
    const currentArmy = game?.armies?.find((a: any) => a.id === currentArmyId);
    if (currentArmy?.armyRules) {
      for (const rule of currentArmy.armyRules) {
        if (rule?.ruleObject) {
          try {
            const parsedRule = JSON.parse(rule.ruleObject);
            addAttackerRules(parsedRule);
          } catch (e) {
            console.error('Failed to parse rule:', rule.name, e);
          }
        }
      }
    }

    // Get all unit rules (includes unit rules, leader rules, model rules, and weapon rules)
    const unitRules = getAllUnitRules(unit);
    console.log(`📋 getAllUnitRules returned ${unitRules.length} rules for unit:`, unit.name);

    // Filter to only include rules relevant to the current combat phase
    const currentCombatPhase = weaponType === 'melee' ? 'fight' : 'shooting';
    const combatRelevantRules = unitRules.filter((rule: Rule) => {
      // If rule has a phase constraint, check if it matches current combat phase
      if (rule.trigger?.phase) {
        // "any" phase matches all combat phases
        const matches = rule.trigger.phase === 'any' || rule.trigger.phase === currentCombatPhase;
        console.log(`   Rule "${rule.name}" has phase "${rule.trigger.phase}",current phase "${currentCombatPhase}": ${matches ? '✅ included' : '❌ filtered out'}`);
        return matches;
      }

      // Include rules without phase constraints (always-on abilities)
      console.log(`   Rule "${rule.name}" has no phase constraint: ✅ included`);
      return true;
    });

    console.log(`📋 After phase filter: ${combatRelevantRules.length} combat-relevant rules`);
    combatRelevantRules.forEach(r => console.log(`   - ${r.name} (${r.id})`));

    addAttackerRules(combatRelevantRules);

    // Get all unit rules for defender (target) - includes defensive abilities like FNP
    if (selectedTarget) {
      const defenderUnitRules = getAllUnitRules(selectedTarget);
      console.log(`📋 getAllUnitRules returned ${defenderUnitRules.length} rules for defender:`, selectedTarget.name);

      const defenderCombatRelevantRules = defenderUnitRules.filter((rule: Rule) => {
        // If rule has a phase constraint, check if it matches current combat phase
        if (rule.trigger?.phase) {
          const matches = rule.trigger.phase === 'any' || rule.trigger.phase === currentCombatPhase;
          console.log(`   Defender Rule "${rule.name}" has phase "${rule.trigger.phase}": ${matches ? '✅ included' : '❌ filtered out'}`);
          return matches;
        }
        console.log(`   Defender Rule "${rule.name}" has no phase constraint: ✅ included`);
        return true;
      });

      console.log(`📋 Defender: After phase filter: ${defenderCombatRelevantRules.length} combat-relevant rules`);
      defenderCombatRelevantRules.forEach(r => console.log(`   - ${r.name} (${r.id})`));

      addDefenderRules(defenderCombatRelevantRules);
    }

    console.log(`📋 Total attacker rules: ${attackerRules.length}, Total defender rules: ${defenderRules.length}`);

    // Get army states for attacker and defender separately
    console.log('🔍 game?.armies:', game?.armies);
    if (game?.armies) {
      game.armies.forEach((army: any, idx: number) => {
        console.log(`🔍 army[${idx}] id=${army.id}, states:`, army.states);
      });
    }

    // Get attacker's army states
    const attackerArmy = game?.armies?.find((army: any) => army.id === currentArmyId);
    const attackerArmyStates: ArmyState[] = (attackerArmy?.states || []).map((state: any) => ({
      ...state,
      armyId: currentArmyId
    }));

    // Get defender's army states (from selectedTarget)
    const defenderArmyId = selectedTarget?.armyId || (effectiveTargetStats as any)?.armyId;
    const defenderArmy = game?.armies?.find((army: any) => army.id === defenderArmyId);
    const defenderArmyStates: ArmyState[] = (defenderArmy?.states || []).map((state: any) => ({
      ...state,
      armyId: defenderArmyId
    }));

    // Get army rules from the defender's army
    if (defenderArmy?.armyRules) {
      console.log(`📋 Loading ${defenderArmy.armyRules.length} army rules for defender army`);
      for (const rule of defenderArmy.armyRules) {
        if (rule?.ruleObject) {
          try {
            const parsedRule = JSON.parse(rule.ruleObject);
            console.log(`   Adding defender army rule: ${parsedRule.name} (${parsedRule.id})`);
            addDefenderRules(parsedRule);
          } catch (e) {
            console.error('Failed to parse defender army rule:', rule.name, e);
          }
        }
      }
    }

    // Debug logging
    console.log('🔍 WAAAGH Debug:', {
      currentArmyId,
      unitArmyId: unit?.armyId,
      attackerArmyStates,
      defenderArmyId,
      defenderArmyStates,
      hasAttackerWaaagh: attackerArmyStates.some(s => s.state === 'waaagh-active'),
      hasDefenderWaaagh: defenderArmyStates.some(s => s.state === 'waaagh-active'),
      loadedAttackerRules: attackerRules.length,
      loadedDefenderRules: defenderRules.length,
      weaponType
    });

    // Build separate contexts for attacker and defender rules with their respective army states
    console.log('🔍 Building attacker context with armyStates:', attackerArmyStates, 'length:', attackerArmyStates.length);
    const isLeaderValue = !!(unit?.bodyguardUnits && unit.bodyguardUnits.length > 0);
    console.log('🔍 Setting isLeader for unit:', unit?.name, 'bodyguardUnits.length:', unit?.bodyguardUnits?.length, 'isLeader:', isLeaderValue);
    const attackerContext = buildCombatContext({
      attacker: { ...unit, armyId: currentArmyId, isLeader: isLeaderValue },
      defender: selectedTarget || effectiveTargetStats,
      weapon: weaponStats,
      game: game,
      combatPhase: weaponType === 'melee' ? 'melee' : 'shooting',
      combatRole: 'attacker',
      options: {
        modelsFiring: 1,
        withinHalfRange: false,
        unitRemainedStationary: !unitHasMovedOrAdvanced,
        unitHasCharged,
        blastBonusAttacks: 0
      },
      rules: attackerRules,
      armyStates: attackerArmyStates // Use attacker's army states
    });
    console.log('🔍 Attacker context created with armyStates:', attackerContext.armyStates, 'length:', attackerContext.armyStates.length);
    console.log('🔍 Attacker context details:', {
      unitHasCharged: attackerContext.unitHasCharged,
      unitRemainedStationary: attackerContext.unitRemainedStationary,
      weaponName: attackerContext.weapon?.name,
      combatPhase: attackerContext.combatPhase,
      attackerCategories: attackerContext.attacker?.categories,
      defenderCategories: attackerContext.defender?.categories
    });

    console.log('🔍 Building defender context with armyStates:', defenderArmyStates, 'length:', defenderArmyStates.length);
    const defenderContext = buildCombatContext({
      attacker: { ...unit, armyId: currentArmyId, isLeader: !!(unit?.bodyguardUnits && unit.bodyguardUnits.length > 0) },
      defender: selectedTarget ? { ...selectedTarget, isLeader: !!(selectedTarget?.bodyguardUnits && selectedTarget.bodyguardUnits.length > 0) } : effectiveTargetStats,
      weapon: weaponStats,
      game: game,
      combatPhase: weaponType === 'melee' ? 'melee' : 'shooting',
      combatRole: 'defender',
      options: {
        modelsFiring: 1,
        withinHalfRange: false,
        unitRemainedStationary: !targetHasMovedOrAdvanced,
        unitHasCharged: targetHasCharged,
        blastBonusAttacks: 0
      },
      rules: defenderRules,
      armyStates: defenderArmyStates // Use defender's army states
    });
    console.log('🔍 Defender context created with armyStates:', defenderContext.armyStates, 'length:', defenderContext.armyStates.length);

    // Evaluate rules separately for attacker and defender
    const appliedAttackerRules = evaluateAllRules(attackerRules, attackerContext);
    const appliedDefenderRules = evaluateAllRules(defenderRules, defenderContext);

    // Merge applied rules from both contexts for effect calculation
    const appliedRules = [...appliedAttackerRules, ...appliedDefenderRules];

    // For display, only show ATTACKER rules (not opponent's rules)
    // Include choice rules that are waiting for user input
    const conditionalAttackerRules = attackerRules.filter(rule => {
      // Skip if already applied
      if (appliedAttackerRules.some(r => r.id === rule.id)) return false;

      // Include choice rules if their when condition is met
      if (rule.kind === 'choice') {
        return evaluateWhen(rule.when, attackerContext);
      }

      return false;
    });

    // Combine applied attacker rules with conditional attacker rules for display
    // NOTE: We only show the attacker's rules in the UI, not the defender's rules
    const displayRules = [...appliedAttackerRules, ...conditionalAttackerRules];

    // Debug: log applied rules
    console.log('✅ Applied Attacker Rules:', appliedAttackerRules.map(r => r.id));
    console.log('✅ Applied Defender Rules:', appliedDefenderRules.map(r => r.id));
    console.log('🔀 Conditional Attacker Rules (with user input):', conditionalAttackerRules.map(r => r.id));
    console.log('📺 Display Rules (shown in UI):', displayRules.map(r => r.id));
    console.log('📊 Attacker context modifiers:', attackerContext.modifiers.getAllModifiers());
    console.log('📊 Defender context modifiers:', defenderContext.modifiers.getAllModifiers());

    // Extract keywords (weapon abilities) from attacker context
    const keywords = getAddedKeywords(attackerContext);
    console.log('🎯 Extracted keywords:', keywords);

    // Extract modifiers from attacker context (offensive abilities)
    const attackerHitMod = attackerContext.modifiers.get('hit') || 0;
    const attackerWoundMod = attackerContext.modifiers.get('wound') || 0;
    const attackerAMod = attackerContext.modifiers.get('A') || 0;
    const attackerSMod = attackerContext.modifiers.get('S') || 0;
    const attackerApMod = attackerContext.modifiers.get('AP') || 0;
    const attackerDMod = attackerContext.modifiers.get('D') || 0;

    // Extract defensive modifiers from defender context (defensive abilities)
    // (e.g., Super Runts: "subtract 1 from wound roll" when defending)
    const defenderHitMod = defenderContext.modifiers.get('hit') || 0;
    const defenderWoundMod = defenderContext.modifiers.get('wound') || 0;
    const defenderAMod = defenderContext.modifiers.get('A') || 0;
    const defenderSMod = defenderContext.modifiers.get('S') || 0;
    const defenderApMod = defenderContext.modifiers.get('AP') || 0;
    const defenderDMod = defenderContext.modifiers.get('D') || 0;

    // Combine modifiers from both contexts
    // Defensive abilities can penalize the attacker's rolls/stats
    const hitMod = attackerHitMod + defenderHitMod;
    const woundMod = attackerWoundMod + defenderWoundMod;
    const aMod = attackerAMod + defenderAMod;
    const sMod = attackerSMod + defenderSMod;
    const apMod = attackerApMod + defenderApMod;
    const dMod = attackerDMod + defenderDMod;

    // Extract save modifiers from defender context
    // Get defensive stat modifiers from defender context
    // INV and FNP use 'set' operation, so we need to check if they were set
    const invModifiers = defenderContext.modifiers.getModifiers('INV');
    const invMod = invModifiers.length > 0
      ? invModifiers.find(m => m.operation === 'set')?.value
      : undefined;

    const fnpModifiers = defenderContext.modifiers.getModifiers('FNP');
    const fnpMod = fnpModifiers.length > 0
      ? fnpModifiers.find(m => m.operation === 'set')?.value
      : undefined;

    const svMod = defenderContext.modifiers.get('SV') || 0;
    const tMod = defenderContext.modifiers.get('T') || 0;

    // Save target stat modifiers to state for display
    setTargetStatModifiers({
      T: tMod,
      SV: svMod,
      INV: invMod,
      FNP: fnpMod
    });

    // Extract modifier sources from both attacker and defender contexts
    const hitSources = [
      ...attackerContext.modifiers.getModifiers('hit').map(m => m.source),
      ...defenderContext.modifiers.getModifiers('hit').map(m => m.source)
    ];
    const woundSources = [
      ...attackerContext.modifiers.getModifiers('wound').map(m => m.source),
      ...defenderContext.modifiers.getModifiers('wound').map(m => m.source)
    ];
    const aSources = [
      ...attackerContext.modifiers.getModifiers('A').map(m => m.source),
      ...defenderContext.modifiers.getModifiers('A').map(m => m.source)
    ];
    const sSources = [
      ...attackerContext.modifiers.getModifiers('S').map(m => m.source),
      ...defenderContext.modifiers.getModifiers('S').map(m => m.source)
    ];
    const apSources = [
      ...attackerContext.modifiers.getModifiers('AP').map(m => m.source),
      ...defenderContext.modifiers.getModifiers('AP').map(m => m.source)
    ];
    const dSources = [
      ...attackerContext.modifiers.getModifiers('D').map(m => m.source),
      ...defenderContext.modifiers.getModifiers('D').map(m => m.source)
    ];

    // Extract keyword sources from attacker context
    const keywordSources: Array<{ keyword: string; source: string }> = [];
    const attackerMods = attackerContext.modifiers.getAllModifiers();
    for (const [stat, mods] of attackerMods.entries()) {
      if (stat.startsWith('keyword:')) {
        for (const mod of mods) {
          const keyword = stat.replace('keyword:', '');
          const keywordString = mod.value > 0 ? `${keyword} ${mod.value}` : keyword;
          keywordSources.push({ keyword: keywordString, source: mod.source });
        }
      }
    }

    // Extract reroll sources from both attacker and defender contexts
    const damageRerollSources: string[] = [];
    for (const [stat, mods] of attackerMods.entries()) {
      if (stat.startsWith('reroll:damage')) {
        for (const mod of mods) {
          damageRerollSources.push(mod.source);
        }
      }
    }
    const defenderMods = defenderContext.modifiers.getAllModifiers();
    for (const [stat, mods] of defenderMods.entries()) {
      if (stat.startsWith('reroll:damage')) {
        for (const mod of mods) {
          damageRerollSources.push(mod.source);
        }
      }
    }

    // Update keyword sources to include weapon abilities
    const updatedKeywordSources = keywords.map(kw => ({
      keyword: kw,
      source: 'rule' // Simplified for now
    }));

    // Save for display
    setActiveRules(displayRules);
    setHitModifier(hitMod);
    setWoundModifier(woundMod);
    setAddedKeywords(keywords); // Set the keywords for display
    setWeaponStatModifiers({ A: aMod, S: sMod, AP: apMod, D: dMod });
    setCurrentArmyStates(attackerArmyStates); // Store army states for digital dice menu
    setModifierSources({
      hit: hitSources,
      wound: woundSources,
      keywords: updatedKeywordSources,
      A: aSources,
      S: sSources,
      AP: apSources,
      D: dSources,
      damageReroll: damageRerollSources
    });
  }, [selectedWeaponId, selectedTarget?.id, unit?.id, game?.id, weaponType]); // Use IDs to avoid object reference changes

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  const handleDigitalDiceClick = () => {
    setShowDigitalDiceMenu(true);
  };

  const handleRollAttacks = (options: CombatOptions) => {
    if (!selectedWeapon || !targetStats) return;

    // Convert weapon to WeaponStats format
    const weaponStats: WeaponStats = {
      name: (selectedWeapon as any).name,
      range: (selectedWeapon as any).range,
      A: (selectedWeapon as any).A,
      WS: (selectedWeapon as any).WS,
      S: (selectedWeapon as any).S,
      AP: (selectedWeapon as any).AP,
      D: (selectedWeapon as any).D,
      keywords: (selectedWeapon as any).keywords || []
    };

    // Load applicable rules from database (linked rules)
    const attackerRules: Rule[] = [];
    const defenderRules: Rule[] = [];
    const addedAttackerRuleIds = new Set<string>(); // Track which rules we've already added to avoid duplicates
    const addedDefenderRuleIds = new Set<string>(); // Track which rules we've already added to avoid duplicates

    // Helper to add attacker rules with deduplication
    const addAttackerRules = (rules: Rule | Rule[]) => {
      const ruleArray = Array.isArray(rules) ? rules : [rules];
      for (const rule of ruleArray) {
        if (!addedAttackerRuleIds.has(rule.id)) {
          addedAttackerRuleIds.add(rule.id);
          attackerRules.push(rule);
        }
      }
    };

    // Helper to add defender rules with deduplication
    const addDefenderRules = (rules: Rule | Rule[]) => {
      const ruleArray = Array.isArray(rules) ? rules : [rules];
      for (const rule of ruleArray) {
        if (!addedDefenderRuleIds.has(rule.id)) {
          addedDefenderRuleIds.add(rule.id);
          defenderRules.push(rule);
        }
      }
    };

    // Get army rules from the current army
    const currentArmy = game?.armies?.find((a: any) => a.id === currentArmyId);
    if (currentArmy?.armyRules) {
      for (const rule of currentArmy.armyRules) {
        if (rule?.ruleObject) {
          try {
            const parsedRule = JSON.parse(rule.ruleObject);
            addAttackerRules(parsedRule);
          } catch (e) {
            console.error('Failed to parse rule:', rule.name, e);
          }
        }
      }
    }

    // Get all unit rules (includes unit rules, leader rules, model rules, and weapon rules)
    const unitRules = getAllUnitRules(unit);
    console.log(`📋 getAllUnitRules returned ${unitRules.length} rules for unit:`, unit.name);

    // Filter to only include rules relevant to the current combat phase
    const currentCombatPhase = weaponType === 'melee' ? 'fight' : 'shooting';
    const combatRelevantRules = unitRules.filter((rule: Rule) => {
      // If rule has a phase constraint, check if it matches current combat phase
      if (rule.trigger?.phase) {
        // "any" phase matches all combat phases
        const matches = rule.trigger.phase === 'any' || rule.trigger.phase === currentCombatPhase;
        console.log(`   Rule "${rule.name}" has phase "${rule.trigger.phase}",current phase "${currentCombatPhase}": ${matches ? '✅ included' : '❌ filtered out'}`);
        return matches;
      }

      // Include rules without phase constraints (always-on abilities)
      console.log(`   Rule "${rule.name}" has no phase constraint: ✅ included`);
      return true;
    });

    console.log(`📋 After phase filter: ${combatRelevantRules.length} combat-relevant rules`);
    combatRelevantRules.forEach(r => console.log(`   - ${r.name} (${r.id})`));

    addAttackerRules(combatRelevantRules);

    // Get all unit rules for defender (target) - includes defensive abilities like FNP
    if (selectedTarget) {
      const defenderUnitRules = getAllUnitRules(selectedTarget);
      console.log(`📋 getAllUnitRules returned ${defenderUnitRules.length} rules for defender:`, selectedTarget.name);

      const defenderCombatRelevantRules = defenderUnitRules.filter((rule: Rule) => {
        // If rule has a phase constraint, check if it matches current combat phase
        if (rule.trigger?.phase) {
          const matches = rule.trigger.phase === 'any' || rule.trigger.phase === currentCombatPhase;
          console.log(`   Defender Rule "${rule.name}" has phase "${rule.trigger.phase}": ${matches ? '✅ included' : '❌ filtered out'}`);
          return matches;
        }
        console.log(`   Defender Rule "${rule.name}" has no phase constraint: ✅ included`);
        return true;
      });

      console.log(`📋 Defender: After phase filter: ${defenderCombatRelevantRules.length} combat-relevant rules`);
      defenderCombatRelevantRules.forEach(r => console.log(`   - ${r.name} (${r.id})`));

      addDefenderRules(defenderCombatRelevantRules);
    }

    console.log(`📋 Total attacker rules: ${attackerRules.length}, Total defender rules: ${defenderRules.length}`);

    // Get army states for attacker and defender separately
    console.log('🔍 game?.armies:', game?.armies);
    if (game?.armies) {
      game.armies.forEach((army: any, idx: number) => {
        console.log(`🔍 army[${idx}] id=${army.id}, states:`, army.states);
      });
    }

    // Get attacker's army states
    const attackerArmy = game?.armies?.find((army: any) => army.id === currentArmyId);
    const attackerArmyStates: ArmyState[] = (attackerArmy?.states || []).map((state: any) => ({
      ...state,
      armyId: currentArmyId
    }));

    // Get defender's army states (from selectedTarget or targetStats)
    const defenderArmyId = selectedTarget?.armyId || (targetStats as any)?.armyId;
    const defenderArmy = game?.armies?.find((army: any) => army.id === defenderArmyId);
    const defenderArmyStates: ArmyState[] = (defenderArmy?.states || []).map((state: any) => ({
      ...state,
      armyId: defenderArmyId
    }));

    // Get army rules from the defender's army
    if (defenderArmy?.armyRules) {
      console.log(`📋 Loading ${defenderArmy.armyRules.length} army rules for defender army`);
      for (const rule of defenderArmy.armyRules) {
        if (rule?.ruleObject) {
          try {
            const parsedRule = JSON.parse(rule.ruleObject);
            console.log(`   Adding defender army rule: ${parsedRule.name} (${parsedRule.id})`);
            addDefenderRules(parsedRule);
          } catch (e) {
            console.error('Failed to parse defender army rule:', rule.name, e);
          }
        }
      }
    }

    // Debug logging
    console.log('🔍 WAAAGH Debug:', {
      currentArmyId,
      unitArmyId: unit?.armyId,
      attackerArmyStates,
      defenderArmyId,
      defenderArmyStates,
      hasAttackerWaaagh: attackerArmyStates.some(s => s.state === 'waaagh-active'),
      hasDefenderWaaagh: defenderArmyStates.some(s => s.state === 'waaagh-active'),
      loadedAttackerRules: attackerRules.length,
      loadedDefenderRules: defenderRules.length,
      weaponType
    });

    // Use centralized modifier calculation function
    const modifiers = calculateCombatModifiers({
      attacker: { ...unit, armyId: currentArmyId },
      defender: selectedTarget || targetStats,
      weapon: weaponStats,
      game: game,
      combatPhase: weaponType === 'melee' ? 'melee' : 'shooting',
      options,
      attackerRules,
      defenderRules,
      attackerArmyStates,
      defenderArmyStates
    });

    // Extract modifiers from result
    const hitMod = modifiers.hitModifier;
    const woundMod = modifiers.woundModifier; // Already includes defender penalties
    const keywords = modifiers.addedKeywords;
    const appliedRules = modifiers.appliedRules;
    const rerollHitKind = modifiers.rerollHitKind;
    const rerollWoundKind = modifiers.rerollWoundKind;

    // Extract weapon and target modifiers
    const aMod = modifiers.weaponModifiers.A;
    const sMod = modifiers.weaponModifiers.S;
    const apMod = modifiers.weaponModifiers.AP;
    const dMod = modifiers.weaponModifiers.D;

    const tMod = modifiers.targetModifiers.T;
    const svMod = modifiers.targetModifiers.SV;
    const invMod = modifiers.targetModifiers.INV;
    const fnpMod = modifiers.targetModifiers.FNP;

    // TODO: Extract modifier sources from appliedRules if needed for UI display
    // For now, just use rule IDs as sources (detailed source tracking would require walking the new schema's then/fx blocks)
    const hitSources = appliedRules.map(r => r.id);
    const woundSources = appliedRules.map(r => r.id);
    const keywordSources: Array<{ keyword: string; source: string }> = keywords.map(kw => ({
      keyword: kw,
      source: 'rule' // Simplified for now
    }));

    // Don't apply modifiers here - executeCombatSequence will handle them
    // Just merge in the added keywords so they're available for keyword-based logic
    const modifiedWeaponStats: WeaponStats = {
      ...weaponStats,
      keywords: [...weaponStats.keywords, ...keywords]
    };

    // Save for display
    setActiveRules(appliedRules);
    setHitModifier(hitMod);
    setWoundModifier(woundMod);
    setAddedKeywords(keywords);
    setWeaponStatModifiers({ A: aMod, S: sMod, AP: apMod, D: dMod });
    setModifierSources({
      hit: hitSources,
      wound: woundSources,
      keywords: keywordSources
    });

    // Apply save modifiers to target stats using the same helper as display
    const modifiedTargetStats = applyTargetModifiers(targetStats, {
      T: tMod,
      SV: svMod,
      INV: invMod,
      FNP: fnpMod
    })!;

    console.log('📊 Modified target stats:', {
      original: { T: targetStats.T, SV: targetStats.SV, INV: targetStats.INV, FNP: targetStats.FNP },
      modified: { T: modifiedTargetStats.T, SV: modifiedTargetStats.SV, INV: modifiedTargetStats.INV, FNP: modifiedTargetStats.FNP },
      modifiers: { tMod, svMod, invMod, fnpMod }
    });

    // Execute combat sequence with pre-calculated modifiers from calculateCombatModifiers
    const result = executeCombatSequence(modifiedWeaponStats, modifiedTargetStats, options, {
      preCalculatedModifiers: {
        hitModifier: hitMod,
        woundModifier: woundMod,
        weaponModifiers: { A: aMod, S: sMod, AP: apMod, D: dMod },
        addedKeywords: keywords,
        appliedRules: appliedRules,
        rerollHitKind,
        rerollWoundKind
      }
    });

    setCombatResult(result);
    setShowSavePhase(false);
    setShowDigitalDiceMenu(false);
    setRollInitiatorId(currentPlayer?.id || '');
    setRollInitiatorName(currentPlayer?.name || '');

    // Publish dice roll result to other players in the room
    if (gameId && publishDiceRoll && currentPlayer && selectedTarget && unit && targetStats) {
      const diceRollEvent: DiceRollEvent = {
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        timestamp: Date.now(),
        attackerUnitId: unit.id,
        attackerUnitName: unit.name,
        defenderUnitId: selectedTarget.id,
        defenderUnitName: selectedTarget.name,
        weaponId: selectedWeapon.id,
        weaponName: weaponStats.name,
        targetStats: {
          T: targetStats.T,
          SV: targetStats.SV,
          INV: targetStats.INV,
          FNP: targetStats.FNP,
          modelCount: targetStats.modelCount,
        },
        combatResult: result,
        phase: 'attacks',
      };
      console.log('📡 Publishing dice roll event:', diceRollEvent);
      publishDiceRoll(diceRollEvent);
    }
  };

  const handleRollSaves = () => {
    if (!combatResult || !selectedWeapon || !targetStats) return;

    // Execute save phase
    const weaponStats: WeaponStats = {
      name: (selectedWeapon as any).name,
      range: (selectedWeapon as any).range,
      A: (selectedWeapon as any).A,
      WS: (selectedWeapon as any).WS,
      S: (selectedWeapon as any).S,
      AP: (selectedWeapon as any).AP,
      D: (selectedWeapon as any).D,
      keywords: (selectedWeapon as any).keywords || []
    };

    // Apply modifiers to target stats (INV, FNP, etc.)
    const modifiedTargetStats = applyTargetModifiers(targetStats, targetStatModifiers)!;

    let updatedResult = executeSavePhase(combatResult, weaponStats, modifiedTargetStats);

    // Execute FNP phase after saves (also use modified target stats for FNP)
    updatedResult = executeFNPPhase(updatedResult, modifiedTargetStats);

    setCombatResult(updatedResult);
    setShowSavePhase(true);

    // Publish updated combat result with saves to other players
    if (gameId && publishDiceRoll && currentPlayer && selectedTarget && unit && targetStats) {
      const diceRollEvent: DiceRollEvent = {
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        timestamp: Date.now(),
        attackerUnitId: unit.id,
        attackerUnitName: unit.name,
        defenderUnitId: selectedTarget.id,
        defenderUnitName: selectedTarget.name,
        weaponId: selectedWeapon.id,
        weaponName: weaponStats.name,
        targetStats: {
          T: targetStats.T,
          SV: targetStats.SV,
          INV: targetStats.INV,
          FNP: targetStats.FNP,
          modelCount: targetStats.modelCount,
        },
        combatResult: updatedResult,
        phase: 'saves',
      };
      console.log('📡 [CombatCalc] Publishing save results:', diceRollEvent);
      publishDiceRoll(diceRollEvent);
    }
  };

  const handleCloseDiceResults = () => {
    setCombatResult(null);
    setShowSavePhase(false);

    // Don't publish completion event - each player can close their own view independently
  };

  const handleDone = async () => {
    // Mark weapons as fired, same as handleShoot
    await handleShoot();
    // Close the modal
    handleCloseDiceResults();
  };

  const handleShoot = async () => {
    if (!selectedWeapon || !game?.currentTurn || !currentPlayer) {
      return;
    }

    try {
      // Get all weapons with the same NAME in this unit (not just the same ID)
      const weaponsWithSameName = allWeapons.filter((w: any) => w.name === (selectedWeapon as any).name);

      const selectedIsPistol = isPistol(selectedWeapon);

      // Create turn+player identifier
      const turnPlayerId = `${game.currentTurn}-${currentPlayer.id}`;

      // Filter to only weapons on models that can still fire this weapon type
      const weaponsToUpdate = weaponsWithSameName.filter((weapon: any) => {
        // Skip if already fired this player's turn
        const currentTurnsFired = weapon.turnsFired || [];
        if (currentTurnsFired.includes(turnPlayerId)) {
          return false;
        }

        // Check if this weapon's model has fired the opposite type
        if (selectedIsPistol) {
          // Can't fire pistol if model has fired non-pistol
          return !modelsThatFiredNonPistols.has(weapon.modelId);
        } else {
          // Can't fire non-pistol if model has fired pistol
          return !modelsThatFiredPistols.has(weapon.modelId);
        }
      });

      console.log(`🎯 Firing ${weaponsToUpdate.length}/${weaponsWithSameName.length}x ${(selectedWeapon as any).name}`);

      // Batch all weapon updates into a single transaction for performance
      const updates = weaponsToUpdate.map((weapon: any) => {
        const currentTurnsFired = weapon.turnsFired || [];
        return db.tx.weapons[weapon.id].update({
          turnsFired: [...currentTurnsFired, turnPlayerId]
        });
      });

      if (updates.length > 0) {
        const tBefore = performance.now();
        await db.transact(updates);
        const tAfter = performance.now();
        console.log(`⏱️  Fired ${updates.length} weapons in ${(tAfter - tBefore).toFixed(2)}ms`);
      }

      // Clear selected weapon - let useEffect handle closing modal if all weapons fired
      setSelectedWeaponId('');
    } catch (error) {
      console.error('Failed to mark weapon as fired:', error);
    }
  };

  if (!unit) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Combat Calculator</h1>
        <p className="text-gray-400 mb-6">Unit not found</p>
        <button
          onClick={handleBack}
          className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  // Add safety check for unit data
  if (!unit.id || !unit.name) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Combat Calculator</h1>
        <p className="text-gray-400 mb-6">Invalid unit data</p>
        <button
          onClick={handleBack}
          className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  const unitDataForCard = formatUnitForCard(unit);

  // Get active peer count (players viewing within last minute)
  const activePeers = Object.values(peers).filter(
    (peer: any) => Date.now() - (peer.lastAction || 0) < 60000
  );

  return (
    <div className="text-white">
      <div className="max-w-2xl mx-auto">
        {/* Presence Indicator */}
        {activePeers.length > 0 && (
          <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-purple-200">
                {activePeers.map((p: any) => p.playerName).join(', ')} {activePeers.length === 1 ? 'is' : 'are'} viewing
              </span>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-gray-800 rounded-lg p-6">
          {/* Weapon Selection - only show if more than one weapon */}
          {availableWeapons.length > 1 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Select Weapon</h3>
                <div className="text-sm text-gray-400">
                  {availableUnfiredWeapons.length} / {availableWeapons.length} remaining
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {availableWeapons.map((weapon: any) => {
                  const isFired = isWeaponFired(weapon);
                  const isDisabled = isWeaponDisabled(weapon);
                  const disabledReason = !isFired && isDisabled
                    ? (isPistol(weapon) ? '(Non-pistols fired)' : '(Pistols fired)')
                    : '';
                  return (
                    <button
                      key={weapon.id}
                      onClick={() => !isDisabled && setSelectedWeaponId(weapon.id)}
                      disabled={isDisabled}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isDisabled
                          ? 'border-gray-700 bg-gray-900 opacity-50 cursor-not-allowed'
                          : selectedWeaponId === weapon.id
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-gray-600 hover:border-gray-500 bg-gray-700'
                      }`}
                    >
                      <div className="text-left">
                        <div className={`font-medium ${isDisabled ? 'text-gray-500 line-through' : 'text-white'}`}>
                          {weapon.name}
                          {isFired && <span className="ml-2 text-xs">(Fired)</span>}
                          {disabledReason && <span className="ml-2 text-xs">{disabledReason}</span>}
                        </div>
                        <div className={`text-xs mt-1 ${isDisabled ? 'text-gray-600' : 'text-gray-400'}`}>
                          {weaponType !== 'melee' && `Range ${weapon.range}" • `}{weapon.A} attacks
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Target Selection */}
          <div className="mb-6">
            <label htmlFor="target-select" className="block text-sm font-medium text-gray-300 mb-2">
              Select Target Unit
            </label>
            <select
              id="target-select"
              ref={targetSelectRef}
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">Choose a target...</option>
              {enemyUnits.map((enemyUnit: any) => (
                <option key={enemyUnit.id} value={enemyUnit.id}>
                  {enemyUnit.id === oathTargetId
                    ? `⌖ ${getUnitDisplayName(enemyUnit)}`
                    : getUnitDisplayName(enemyUnit)}
                </option>
              ))}
            </select>
          </div>

          {/* Weapon Profile Display / Results Table */}
          {selectedWeapon && (
            <div className="mb-6">
              <WeaponProfileDisplay
                weapon={selectedWeapon as any}
                modifiedWeapon={applyWeaponModifiers(selectedWeapon, weaponStatModifiers)}
                target={applyTargetModifiers(targetStats, targetStatModifiers) || undefined}
                unitName={unit?.name}
                hideRange={weaponType === 'melee'}
                unitHasCharged={unitHasCharged}
                hitModifier={hitModifier}
                woundModifier={woundModifier}
                weaponStatModifiers={weaponStatModifiers}
                activeRules={activeRules as any}
                modifierSources={modifierSources}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <button
              onClick={handleBack}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Back
            </button>
            <div className="flex gap-3">
              {selectedWeapon && selectedTarget && game && !isWeaponDisabled(selectedWeapon) && (
                <button
                  onClick={handleDigitalDiceClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Digital Dice
                </button>
              )}
              {selectedWeapon && game && !isWeaponDisabled(selectedWeapon) && (
                <button
                  onClick={handleShoot}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  {weaponType === 'melee' ? 'Fight' : 'Fire'}
                </button>
              )}
            </div>
          </div>

          {/* Active Rules Display */}
          {activeRules.length > 0 && (
            <div className="mt-6">
              <ActiveRulesDisplay rules={activeRules as any} />
            </div>
          )}
        </div>

        {/* Collapsed Unit Card at bottom */}
        <div className="mt-6">
          <UnitCard
            unit={unitDataForCard.unit}
            expandable={true}
            defaultExpanded={false}
            className="border-0"
          />
        </div>
      </div>

      {/* Digital Dice Menu Modal */}
      {showDigitalDiceMenu && selectedWeapon && targetStats && (
        <DigitalDiceMenu
          weapon={applyWeaponModifiers(selectedWeapon, weaponStatModifiers)}
          target={applyTargetModifiers(targetStats, targetStatModifiers)!}
          totalWeaponCount={totalWeaponCount}
          unitHasCharged={unitHasCharged}
          unitHasMovedOrAdvanced={unitHasMovedOrAdvanced}
          activeRules={activeRules as any}
          armyStates={currentArmyStates}
          onRollAttacks={handleRollAttacks}
          onClose={() => setShowDigitalDiceMenu(false)}
        />
      )}

      {/* Dice Roll Results Modal */}
      {combatResult && selectedWeapon && targetStats && (
        <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Combat Results</h2>
            <button
              onClick={handleCloseDiceResults}
              className="text-gray-400 hover:text-white text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-hidden">
              <DiceRollResults
                combatResult={combatResult}
                weapon={applyWeaponModifiers(selectedWeapon, weaponStatModifiers)}
                target={applyTargetModifiers(targetStats, targetStatModifiers)!}
                onRollSaves={handleRollSaves}
                showSavePhase={showSavePhase}
                activeRules={activeRules as any}
                hitModifier={hitModifier}
                woundModifier={woundModifier}
                addedKeywords={addedKeywords}
                modifierSources={modifierSources}
                initiatorPlayerId={rollInitiatorId}
                initiatorPlayerName={rollInitiatorName}
                currentPlayerId={currentPlayer?.id}
              />
            </div>

            {/* Done Button */}
            <div className="p-4 border-t border-gray-700">
              <button
                onClick={handleDone}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
