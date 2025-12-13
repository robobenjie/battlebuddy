/**
 * ReminderBadge component
 * Displays a tappable reminder for phase-based abilities
 */

import { Rule } from '../../lib/rules-engine/types';

interface ReminderBadgeProps {
  rule: Rule;
  onClick: () => void;
}

export default function ReminderBadge({ rule, onClick }: ReminderBadgeProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-yellow-100 text-sm font-medium transition-colors cursor-pointer"
    >
      <span className="text-xs">⚡</span>
      <span>{rule.name}</span>
    </button>
  );
}
