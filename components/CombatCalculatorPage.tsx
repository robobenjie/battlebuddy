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
import {
  executeCombatSequence,
  executeSavePhase,
  executeFNPPhase,
  CombatResult,
  CombatOptions,
  WeaponStats,
  TargetStats,
  buildCombatState,
  applyTargetModifiers,
  CombatState
} from '../lib/combat-calculator-engine';
import { buildRollDisplayPayload } from '../lib/combat-roll-display';
import { getCombatModifierSources } from '../lib/combat-modifier-sources';
import {
  shouldMarkWeaponsOnDone,
  shouldExitCalculatorOnDigitalDiceClose,
  shouldExitCalculatorOnDone,
  calculateRemainingRangedWeaponGroupsAfterFiring
} from '../lib/combat-session-utils';
import { resolveCurrentTurnKey } from '../lib/combat-turn-key';
import { buildCombatSessionResultsPayload } from '../lib/combat-session-payload';
import { prepareCombatRuleSetup } from '../lib/combat-rule-setup';
import { buildCombatActiveRules } from '../lib/combat-active-rules';
import { getCombatCalculatorStratagems, CombatCalculatorStratagem } from '../lib/combat-calculator-stratagems';
import {
  isExtraAttacksWeapon,
  isMeleeWeaponGroupDisabled,
  isMeleeWeaponInstanceEligible
} from '../lib/melee-weapon-sequencing';
import { Rule, ArmyState } from '../lib/rules-engine';
import { UNIT_FULL_QUERY, UNIT_BASIC_QUERY } from '../lib/query-fragments';
import { DiceRollEvent, CombatPhaseEvent, CombatSessionRecord } from '../lib/rooms-types';

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
  viewerPlayerId?: string;
  combatSession?: CombatSessionRecord;
}

export default function CombatCalculatorPage({
  gameId: propGameId,
  unitId: propUnitId,
  unit: propUnit,
  currentArmyId: propCurrentArmyId,
  weaponType,
  preSelectedWeaponName,
  onClose,
  currentPlayer: propCurrentPlayer,
  viewerPlayerId,
  combatSession
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

  const currentArmy = game?.armies?.find((army: any) => army.id === currentArmyId);
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
  const [rollTargetStats, setRollTargetStats] = useState<TargetStats | null>(null);
  const [rollInitiatorId, setRollInitiatorId] = useState<string>('');
  const [rollInitiatorName, setRollInitiatorName] = useState<string>('');
  const [lastDismissedDiceUpdatedAt, setLastDismissedDiceUpdatedAt] = useState<number | null>(null);
  const [rollDisplayContext, setRollDisplayContext] = useState<{
    hitModifier?: number;
    woundModifier?: number;
    addedKeywords?: string[];
    modifierSources?: {
      hit?: string[];
      wound?: string[];
      keywords?: Array<{ keyword: string; source: string }>;
      damageReroll?: string[];
      rerollHit?: string[];
      rerollWound?: string[];
    };
    activeRules?: Array<{ id: string; name: string }>;
    hitThresholdOverride?: number;
    woundThresholdOverride?: number;
  } | null>(null);

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
    rerollHit?: string[];
    rerollWound?: string[];
  }>({});
  const [currentArmyStates, setCurrentArmyStates] = useState<ArmyState[]>([]);
  const [combatState, setCombatState] = useState<CombatState | null>(null);
  const [rollCombatState, setRollCombatState] = useState<CombatState | null>(null);
  const [activeStratagemIds, setActiveStratagemIds] = useState<string[]>([]);
  const [selectedStratagemInfo, setSelectedStratagemInfo] = useState<CombatCalculatorStratagem | null>(null);

  const availableCombatStratagems = getCombatCalculatorStratagems({
    faction: currentArmy?.faction,
    detachment: currentArmy?.detachment,
    weaponType: weaponType === 'melee' ? 'melee' : 'ranged',
    unitKeywords: unit?.keywords || [],
    unitCategories: unit?.categories || []
  });

  const activeCombatStratagemRules = availableCombatStratagems
    .filter((s) => activeStratagemIds.includes(s.id))
    .map((s) => s.rule);

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
    if (combatSession?.id && event.sessionId && event.sessionId !== combatSession.id) return;
    if (combatSession?.version !== undefined && event.sessionVersion !== undefined && event.sessionVersion < combatSession.version) return;

    // Set the combat result to show in the UI
    setCombatResult(event.combatResult as CombatResult);
    // When receiving 'attacks' phase, saves haven't been rolled yet (showSavePhase = false)
    // When receiving 'saves' or 'fnp' phase, saves have been rolled (showSavePhase = true)
    setShowSavePhase(event.phase === 'saves' || event.phase === 'fnp');
    setShowDigitalDiceMenu(false);
    setRollInitiatorId(event.playerId);
    setRollInitiatorName(event.playerName);
    setRollTargetStats((event as any).effectiveTargetStats || event.targetStats || null);
    setRollDisplayContext((event as any).rollDisplay || null);
  });

  // Subscribe to combat phase advancement from other players (hook must be called unconditionally)
  db.rooms.useTopicEffect(room, 'combatPhaseAdvance', (event, peer) => {
    // Only process if we have a valid gameId and event is from another player
    if (!gameId || event.playerId === currentPlayer?.id) return;
    if (combatSession?.id && event.sessionId && event.sessionId !== combatSession.id) return;
    if (combatSession?.version !== undefined && event.sessionVersion !== undefined && event.sessionVersion < combatSession.version) return;

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

  // Ref for target select to auto-focus
  const targetSelectRef = useRef<HTMLSelectElement>(null);

  // Auto-focus the target dropdown when component mounts
  useEffect(() => {
    if (targetSelectRef.current) {
      targetSelectRef.current.focus();
    }
  }, []);

  useEffect(() => {
    setActiveStratagemIds([]);
  }, [unit?.id]);

  const updateCombatSession = async (updates: Partial<CombatSessionRecord>) => {
    if (!combatSession?.id) return;
    const now = Date.now();
    const nextVersion = (combatSession.version ?? 0) + 1;
    try {
      await db.transact([
        db.tx.combatSessions[combatSession.id].update({
          ...updates,
          updatedAt: now,
          version: nextVersion
        })
      ]);
    } catch (error) {
      console.error('Failed to update combat session:', error);
    }
  };

  useEffect(() => {
    if (!combatSession) return;
    if (lastDismissedDiceUpdatedAt !== null && combatSession.updatedAt <= lastDismissedDiceUpdatedAt) {
      return;
    }

    if (combatSession.screen === 'combat-calculator') {
      setCombatResult(null);
      setShowSavePhase(false);
      setShowDigitalDiceMenu(false);
      return;
    }

    if (combatSession.screen === 'digital-dice') {
      if (combatSession.defenderUnitId) {
        setSelectedTargetId(combatSession.defenderUnitId);
      }
      if (combatSession.weaponId) {
        setSelectedWeaponId(combatSession.weaponId);
      }

      const payload = combatSession.payload || {};
      if (payload.stage === 'menu') {
        setShowDigitalDiceMenu(true);
        setCombatResult(null);
        setShowSavePhase(false);
        setRollTargetStats(null);
      }

      if (payload.combatResult) {
        setCombatResult(payload.combatResult);
        setShowSavePhase(combatSession.phase === 'saves' || combatSession.phase === 'fnp');
        setShowDigitalDiceMenu(false);
        setRollInitiatorId(combatSession.initiatorPlayerId || '');
        setRollInitiatorName(combatSession.initiatorPlayerName || '');
        setRollTargetStats(payload.effectiveTargetStats || payload.targetStats || null);
        setRollDisplayContext(payload.rollDisplay || null);
      }
    }
  }, [combatSession?.id, combatSession?.updatedAt, combatSession?.screen, combatSession?.phase, lastDismissedDiceUpdatedAt]);

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
    if (weaponType === 'melee') {
      return isMeleeWeaponGroupDisabled(weapon.name, allWeapons as any, turnPlayerId);
    }

    if (isWeaponFired(weapon)) return true;

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

  const currentTurnKey = resolveCurrentTurnKey(
    game?.currentTurn,
    propCurrentPlayer?.id,
    currentPlayer?.id
  );

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
      setCombatState(null);
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

    const {
      attackerRules,
      defenderRules,
      attackerArmyStates,
      defenderArmyStates
    } = prepareCombatRuleSetup({
      game,
      currentArmyId,
      unit,
      selectedTarget,
      weaponType
    });
    const attackerRulesWithStratagems = [...attackerRules, ...activeCombatStratagemRules];

    const combatStateResult = buildCombatState({
      attacker: { ...unit, armyId: currentArmyId, isLeader: !!(unit?.bodyguardUnits && unit.bodyguardUnits.length > 0) },
      defender: selectedTarget || effectiveTargetStats,
      weapon: weaponStats,
      game: game,
      combatPhase: weaponType === 'melee' ? 'melee' : 'shooting',
      options: {
        modelsFiring: 1,
        withinHalfRange: false,
        unitRemainedStationary: !unitHasMovedOrAdvanced,
        unitHasCharged,
        blastBonusAttacks: 0
      },
      attackerRules: attackerRulesWithStratagems,
      defenderRules,
      attackerArmyStates,
      defenderArmyStates,
      target: effectiveTargetStats
    });

    const attackerContext = combatStateResult.modifiers.attackerContext;
    const defenderContext = combatStateResult.modifiers.defenderContext;
    const appliedAttackerRules = combatStateResult.modifiers.appliedAttackerRules;
    const appliedDefenderRules = combatStateResult.modifiers.appliedDefenderRules;
    const displayRules = buildCombatActiveRules({
      attackerRules: attackerRulesWithStratagems,
      defenderRules,
      appliedAttackerRules,
      appliedDefenderRules,
      attackerContext,
      defenderContext
    });


    // Extract keywords (weapon abilities) from attacker context
    const keywords = combatStateResult.modifiers.addedKeywords;

    const hitMod = combatStateResult.modifiers.hitModifier;
    const woundMod = combatStateResult.modifiers.woundModifier;
    const aMod = combatStateResult.modifiers.weaponModifiers.A;
    const sMod = combatStateResult.modifiers.weaponModifiers.S;
    const apMod = combatStateResult.modifiers.weaponModifiers.AP;
    const dMod = combatStateResult.modifiers.weaponModifiers.D;

    setTargetStatModifiers(combatStateResult.modifiers.targetModifiers);

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

    const rerollHitSources = [
      ...attackerContext.modifiers.getModifiers('reroll:hit:all').map(m => m.source),
      ...attackerContext.modifiers.getModifiers('reroll:hit:failed').map(m => m.source),
      ...attackerContext.modifiers.getModifiers('reroll:hit:ones').map(m => m.source)
    ];

    const rerollWoundSources = [
      ...attackerContext.modifiers.getModifiers('reroll:wound:all').map(m => m.source),
      ...attackerContext.modifiers.getModifiers('reroll:wound:failed').map(m => m.source),
      ...attackerContext.modifiers.getModifiers('reroll:wound:ones').map(m => m.source)
    ];

    // Update keyword sources to include weapon abilities
    const updatedKeywordSources = keywords.map(kw => ({
      keyword: kw,
      source: 'rule' // Simplified for now
    }));

    // Save for display
    setActiveRules(displayRules);
    setHitModifier(hitMod);
    setWoundModifier(woundMod);
    setAddedKeywords(keywords);
    setWeaponStatModifiers({ A: aMod, S: sMod, AP: apMod, D: dMod });
    setCurrentArmyStates([...attackerArmyStates, ...defenderArmyStates]);
    setModifierSources({
      hit: hitSources,
      wound: woundSources,
      keywords: updatedKeywordSources,
      A: aSources,
      S: sSources,
      AP: apSources,
      D: dSources,
      damageReroll: damageRerollSources,
      rerollHit: rerollHitSources,
      rerollWound: rerollWoundSources
    });
    setCombatState(combatStateResult);
  }, [selectedWeaponId, selectedTarget?.id, unit?.id, game?.id, weaponType, activeStratagemIds.join('|')]); // Use IDs to avoid object reference changes

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  const handleDigitalDiceClick = () => {
    setShowDigitalDiceMenu(true);
    if (selectedWeapon && selectedTarget && targetStats) {
      const effectiveTargetStats = combatState?.effectiveTarget || applyTargetModifiers(targetStats, targetStatModifiers);
      updateCombatSession({
        screen: 'digital-dice',
        attackerUnitId: unit?.id,
        attackerArmyId: currentArmyId,
        defenderUnitId: selectedTarget.id,
        weaponId: (selectedWeapon as any).id,
        weaponName: (selectedWeapon as any).name,
        weaponType,
        phase: 'attacks',
      payload: {
        stage: 'menu',
        targetStats,
        effectiveTargetStats,
        selectedTargetId: selectedTarget.id,
        selectedWeaponId: (selectedWeapon as any).id,
        rollDisplay: rollDisplayContext || undefined
      }
    });
    }
  };

  const handleRollAttacks = async (options: CombatOptions) => {
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

    const {
      attackerRules,
      defenderRules,
      attackerArmyStates,
      defenderArmyStates
    } = prepareCombatRuleSetup({
      game,
      currentArmyId,
      unit,
      selectedTarget,
      weaponType
    });
    const attackerRulesWithStratagems = [...attackerRules, ...activeCombatStratagemRules];

    const combatStateResult = buildCombatState({
      attacker: { ...unit, armyId: currentArmyId },
      defender: selectedTarget || targetStats,
      weapon: weaponStats,
      game: game,
      combatPhase: weaponType === 'melee' ? 'melee' : 'shooting',
      options,
      attackerRules: attackerRulesWithStratagems,
      defenderRules,
      attackerArmyStates,
      defenderArmyStates,
      target: targetStats
    });

    const hitMod = combatStateResult.modifiers.hitModifier;
    const woundMod = combatStateResult.modifiers.woundModifier;
    const keywords = combatStateResult.modifiers.addedKeywords;
    const appliedRules = combatStateResult.modifiers.appliedRules;
    const rerollHitKind = combatStateResult.modifiers.rerollHitKind;
    const rerollWoundKind = combatStateResult.modifiers.rerollWoundKind;
    const criticalHitThreshold = combatStateResult.modifiers.criticalHitThreshold;

    const aMod = combatStateResult.modifiers.weaponModifiers.A;
    const sMod = combatStateResult.modifiers.weaponModifiers.S;
    const apMod = combatStateResult.modifiers.weaponModifiers.AP;
    const dMod = combatStateResult.modifiers.weaponModifiers.D;

    const tMod = combatStateResult.modifiers.targetModifiers.T;
    const svMod = combatStateResult.modifiers.targetModifiers.SV;
    const invMod = combatStateResult.modifiers.targetModifiers.INV;
    const fnpMod = combatStateResult.modifiers.targetModifiers.FNP;

    const computedModifierSources = getCombatModifierSources({
      attackerContext: combatStateResult.modifiers.attackerContext,
      defenderContext: combatStateResult.modifiers.defenderContext,
      keywords
    });

    const rollDisplay = buildRollDisplayPayload({
      hitModifier: hitMod,
      woundModifier: woundMod,
      addedKeywords: keywords,
      computedModifierSources,
      appliedRules,
      hitThresholdOverride: combatStateResult.hitThreshold,
      woundThresholdOverride: combatStateResult.woundThreshold
    });

    // Don't apply modifiers here - executeCombatSequence will handle them
    // Just merge in the added keywords so they're available for keyword-based logic
    const modifiedWeaponStats: WeaponStats = combatStateResult.effectiveWeapon;

    // Save for display
    setActiveRules(appliedRules);
    setHitModifier(hitMod);
    setWoundModifier(woundMod);
    setAddedKeywords(keywords);
    setWeaponStatModifiers({ A: aMod, S: sMod, AP: apMod, D: dMod });
    setModifierSources(computedModifierSources);

    // Apply save modifiers to target stats using the same helper as display
    const modifiedTargetStats = applyTargetModifiers(targetStats, {
      T: tMod,
      SV: svMod,
      INV: invMod,
      FNP: fnpMod
    })!;


    // Execute combat sequence with pre-calculated modifiers from calculateCombatModifiers
    const result = executeCombatSequence(modifiedWeaponStats, modifiedTargetStats, options, {
      preCalculatedModifiers: {
        hitModifier: hitMod,
        woundModifier: woundMod,
        criticalHitThreshold,
        weaponModifiers: { A: aMod, S: sMod, AP: apMod, D: dMod },
        addedKeywords: keywords,
        appliedRules: appliedRules,
        rerollHitKind,
        rerollWoundKind
      }
    });

    setCombatResult(result);
    setRollCombatState(combatStateResult);
    setRollTargetStats(modifiedTargetStats);
    setShowSavePhase(false);
    setShowDigitalDiceMenu(false);
    setRollInitiatorId(currentPlayer?.id || '');
    setRollInitiatorName(currentPlayer?.name || '');
    setRollDisplayContext(rollDisplay);
    await updateCombatSession({
      screen: 'digital-dice',
      attackerUnitId: unit?.id,
      attackerArmyId: currentArmyId,
      defenderUnitId: selectedTarget?.id,
      weaponId: (selectedWeapon as any).id,
      weaponName: weaponStats.name,
      weaponType,
      phase: 'attacks',
      payload: buildCombatSessionResultsPayload({
        combatResult: result,
        targetStats,
        effectiveTargetStats: modifiedTargetStats,
        selectedTargetId: selectedTarget?.id,
        selectedWeaponId: (selectedWeapon as any).id,
        rollDisplay
      })
    });

    // Publish dice roll result to other players in the room
    if (gameId && publishDiceRoll && currentPlayer && selectedTarget && unit && targetStats) {
      const diceRollEvent: DiceRollEvent = {
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        timestamp: Date.now(),
        sessionId: combatSession?.id,
        sessionVersion: (combatSession?.version ?? 0) + 1,
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
        effectiveTargetStats: modifiedTargetStats,
        combatResult: result,
        phase: 'attacks',
        rollDisplay,
      };
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

    const rollDisplay = rollDisplayContext || {
      hitModifier,
      woundModifier,
      addedKeywords,
      modifierSources,
      activeRules: activeRules.map(rule => ({ id: rule.id, name: rule.name })),
      hitThresholdOverride: rollCombatState?.hitThreshold ?? combatState?.hitThreshold,
      woundThresholdOverride: rollCombatState?.woundThreshold ?? combatState?.woundThreshold
    };

    setCombatResult(updatedResult);
    setShowSavePhase(true);
    setRollTargetStats(modifiedTargetStats);
    setRollDisplayContext(rollDisplay);
    updateCombatSession({
      screen: 'digital-dice',
      attackerUnitId: unit?.id,
      attackerArmyId: currentArmyId,
      defenderUnitId: selectedTarget?.id,
      weaponId: (selectedWeapon as any).id,
      weaponName: weaponStats.name,
      weaponType,
      phase: 'saves',
      payload: buildCombatSessionResultsPayload({
        combatResult: updatedResult,
        targetStats,
        effectiveTargetStats: modifiedTargetStats,
        selectedTargetId: selectedTarget?.id,
        selectedWeaponId: (selectedWeapon as any).id,
        rollDisplay
      })
    });

    // Publish updated combat result with saves to other players
    if (gameId && publishDiceRoll && currentPlayer && selectedTarget && unit && targetStats) {
      const diceRollEvent: DiceRollEvent = {
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        timestamp: Date.now(),
        sessionId: combatSession?.id,
        sessionVersion: (combatSession?.version ?? 0) + 1,
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
        effectiveTargetStats: modifiedTargetStats,
        combatResult: updatedResult,
        phase: 'saves',
        rollDisplay,
      };
      publishDiceRoll(diceRollEvent);
    }
  };

  const handleCloseDiceResults = () => {
    setCombatResult(null);
    setShowSavePhase(false);
    setShowDigitalDiceMenu(false);
    setRollDisplayContext(null);
    if (combatSession?.updatedAt) {
      setLastDismissedDiceUpdatedAt(combatSession.updatedAt);
    }

    // Don't publish completion event - each player can close their own view independently
  };

  const handleDone = async () => {
    const shouldMarkWeapons = shouldMarkWeaponsOnDone({
      currentPlayerId: viewerPlayerId || currentPlayer?.id,
      initiatorPlayerId: combatSession?.initiatorPlayerId
    });
    const remainingAvailableWeaponCountAfterDone = shouldMarkWeapons && selectedWeapon && turnPlayerId && weaponType !== 'melee'
      ? calculateRemainingRangedWeaponGroupsAfterFiring({
          allWeapons: allWeapons.map((weapon: any) => ({
            id: weapon.id,
            name: weapon.name,
            modelId: weapon.modelId,
            turnsFired: weapon.turnsFired || [],
            isPistol: isPistol(weapon)
          })),
          currentlyAvailableWeaponNames: availableUnfiredWeapons.map((weapon: any) => weapon.name),
          selectedWeaponName: (selectedWeapon as any).name,
          turnPlayerId
        })
      : shouldMarkWeapons
      ? Math.max(availableUnfiredWeapons.length - 1, 0)
      : availableUnfiredWeapons.length;
    const shouldExitOnDone = shouldExitCalculatorOnDone({
      shouldMarkWeapons,
      remainingAvailableWeaponCountAfterDone
    });

    // Only the initiator should mark weapons as fired for this attack session.
    if (shouldMarkWeapons) {
      await handleShoot();
    }

    // Close the modal
    handleCloseDiceResults();
    if (shouldExitOnDone) {
      handleBack();
    }
  };

  const toggleCombatStratagem = (stratagemId: string) => {
    setActiveStratagemIds((prev) =>
      prev.includes(stratagemId)
        ? prev.filter((id) => id !== stratagemId)
        : [...prev, stratagemId]
    );
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

        if (weaponType === 'melee') {
          if (isExtraAttacksWeapon(weapon)) {
            return isMeleeWeaponInstanceEligible(weapon, allWeapons as any, turnPlayerId);
          }

          return isMeleeWeaponInstanceEligible(weapon, allWeapons as any, turnPlayerId);
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


      // Batch all weapon updates into a single transaction for performance
      const updates = weaponsToUpdate.map((weapon: any) => {
        const currentTurnsFired = weapon.turnsFired || [];
        return db.tx.weapons[weapon.id].update({
          turnsFired: [...currentTurnsFired, turnPlayerId]
        });
      });

      if (updates.length > 0) {
        await db.transact(updates);
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

  const displayActiveRules = rollDisplayContext?.activeRules || activeRules;
  const displayHitModifier = rollDisplayContext?.hitModifier ?? hitModifier;
  const displayWoundModifier = rollDisplayContext?.woundModifier ?? woundModifier;
  const displayAddedKeywords = rollDisplayContext?.addedKeywords || addedKeywords;
  const displayModifierSources = rollDisplayContext?.modifierSources || modifierSources;
  const displayHitThresholdOverride =
    rollDisplayContext?.hitThresholdOverride ?? rollCombatState?.hitThreshold ?? combatState?.hitThreshold;
  const displayWoundThresholdOverride =
    rollDisplayContext?.woundThresholdOverride ?? rollCombatState?.woundThreshold ?? combatState?.woundThreshold;

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
                modifiedWeapon={combatState?.effectiveWeapon}
                target={combatState?.effectiveTarget || (targetStats ? applyTargetModifiers(targetStats, targetStatModifiers) : undefined)}
                unitName={unit?.name}
                hideRange={weaponType === 'melee'}
                unitHasCharged={unitHasCharged}
                hitModifier={hitModifier}
                woundModifier={woundModifier}
                weaponStatModifiers={weaponStatModifiers}
                activeRules={activeRules as any}
                modifierSources={modifierSources}
                hitThresholdOverride={combatState?.hitThreshold}
                woundThresholdOverride={combatState?.woundThreshold}
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

          {availableCombatStratagems.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-yellow-900/20 border border-yellow-700/50">
              <p className="text-sm font-semibold text-yellow-300 mb-2">Combat Stratagems</p>
              <div className="flex flex-wrap gap-2">
                {availableCombatStratagems.map((stratagem) => {
                  const active = activeStratagemIds.includes(stratagem.id);
                  return (
                    <div key={stratagem.id} className="flex items-center gap-1">
                      <button
                        onClick={() => toggleCombatStratagem(stratagem.id)}
                        className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
                          active
                            ? 'bg-yellow-500 text-black'
                            : 'bg-yellow-700/70 hover:bg-yellow-600 text-yellow-100'
                        }`}
                      >
                        {stratagem.name} ({stratagem.cost}CP)
                      </button>
                      <button
                        onClick={() => setSelectedStratagemInfo(stratagem)}
                        className="px-2 py-1 rounded-md text-xs bg-gray-700 hover:bg-gray-600 text-gray-200"
                        title="View full stratagem text"
                      >
                        i
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
          weapon={combatState?.effectiveWeapon || (selectedWeapon as any)}
          target={combatState?.effectiveTarget || applyTargetModifiers(targetStats, targetStatModifiers)!}
          totalWeaponCount={totalWeaponCount}
          unitHasCharged={unitHasCharged}
          unitHasMovedOrAdvanced={unitHasMovedOrAdvanced}
          activeRules={activeRules as any}
          armyStates={currentArmyStates}
          onRollAttacks={handleRollAttacks}
          onClose={() => {
            setShowDigitalDiceMenu(false);
            if (combatSession?.updatedAt) {
              setLastDismissedDiceUpdatedAt(combatSession.updatedAt);
            }
            if (
              shouldExitCalculatorOnDigitalDiceClose({
                remainingAvailableWeaponCount: availableUnfiredWeapons.length
              })
            ) {
              handleBack();
            }
          }}
        />
      )}

      {selectedStratagemInfo && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-xl w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-yellow-300">
                {selectedStratagemInfo.name} ({selectedStratagemInfo.cost}CP)
              </h3>
              <button
                onClick={() => setSelectedStratagemInfo(null)}
                className="text-gray-400 hover:text-white text-xl font-bold"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-300 mb-2">{selectedStratagemInfo.when}</p>
            <p className="text-sm text-gray-200">{selectedStratagemInfo.effect}</p>
          </div>
        </div>
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
                  weapon={combatResult.modifiedWeapon || rollCombatState?.effectiveWeapon || (selectedWeapon as any)}
                  target={rollTargetStats || rollCombatState?.effectiveTarget || applyTargetModifiers(targetStats, targetStatModifiers)!}
                  onRollSaves={handleRollSaves}
                  showSavePhase={showSavePhase}
                  activeRules={displayActiveRules as any}
                  hitModifier={displayHitModifier}
                  woundModifier={displayWoundModifier}
                  addedKeywords={displayAddedKeywords}
                  modifierSources={displayModifierSources}
                  hitThresholdOverride={displayHitThresholdOverride}
                  woundThresholdOverride={displayWoundThresholdOverride}
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
