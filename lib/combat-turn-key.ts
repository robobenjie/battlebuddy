export function resolveCurrentTurnKey(
  gameCurrentTurn: number | undefined,
  propCurrentPlayerId: string | undefined,
  currentPlayerId: string | undefined
): string | null {
  if (!gameCurrentTurn) return null;
  const playerId = propCurrentPlayerId || currentPlayerId;
  if (!playerId) return null;
  return `${gameCurrentTurn}-${playerId}`;
}
