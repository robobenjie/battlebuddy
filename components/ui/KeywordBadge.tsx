'use client';

import { COMMON_RULES } from './RulePopup';

interface KeywordBadgeProps {
  keyword: string;
  description?: string;
  onClick?: (name: string, description?: string) => void;
  variant?: 'faction' | 'keyword' | 'rule' | 'weapon';
  className?: string;
}

export default function KeywordBadge({ 
  keyword, 
  description, 
  onClick, 
  variant = 'keyword',
  className = '' 
}: KeywordBadgeProps) {
  // Check if this keyword has an associated rule (either provided description or in common rules)
  const hasRule = description || COMMON_RULES[keyword];
  const isClickable = onClick && hasRule;

  const handleClick = () => {
    if (isClickable) {
      onClick(keyword, description);
    }
  };

  // Style variants for different types of keywords
  const getVariantStyles = () => {
    switch (variant) {
      case 'faction':
        return isClickable 
          ? 'bg-red-700 hover:bg-red-600 text-red-100 border-red-600'
          : 'bg-red-800 text-red-200 border-red-700';
      case 'rule':
        return isClickable 
          ? 'bg-blue-700 hover:bg-blue-600 text-blue-100 border-blue-600'
          : 'bg-blue-800 text-blue-200 border-blue-700';
      case 'weapon':
        return isClickable 
          ? 'bg-purple-700 hover:bg-purple-600 text-purple-100 border-purple-600'
          : 'bg-purple-800 text-purple-200 border-purple-700';
      case 'keyword':
      default:
        return isClickable 
          ? 'bg-gray-700 hover:bg-gray-600 text-gray-100 border-gray-600'
          : 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  const baseStyles = isClickable 
    ? 'cursor-pointer transition-colors hover:shadow-sm'
    : 'cursor-default';

  return (
    <span
      onClick={handleClick}
      className={`
        inline-block px-2 py-1 text-xs font-medium rounded-md border
        ${getVariantStyles()}
        ${baseStyles}
        ${className}
      `}
      title={isClickable ? 'Click for details' : undefined}
    >
      {keyword}
    </span>
  );
}

// Component for rendering multiple keywords with consistent spacing
interface KeywordListProps {
  keywords: string[];
  descriptions?: Record<string, string>;
  onKeywordClick?: (name: string, description?: string) => void;
  variant?: 'faction' | 'keyword' | 'rule' | 'weapon';
  className?: string;
}

export function KeywordList({ 
  keywords, 
  descriptions = {}, 
  onKeywordClick, 
  variant = 'keyword',
  className = ''
}: KeywordListProps) {
  if (!keywords || keywords.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {keywords.map((keyword, index) => (
        <KeywordBadge
          key={`${keyword}-${index}`}
          keyword={keyword}
          description={descriptions[keyword]}
          onClick={onKeywordClick}
          variant={variant}
        />
      ))}
    </div>
  );
}

// Parse weapon keywords from a comma-separated string
export function parseWeaponKeywords(keywordString: string): string[] {
  if (!keywordString || keywordString === '-') {
    return [];
  }
  
  return keywordString
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);
}

// Extract faction keywords from categories array
export function extractFactionKeywords(categories: string[]): string[] {
  return categories.filter(cat => cat.startsWith('Faction:'));
}

// Extract non-faction keywords from categories array
export function extractGeneralKeywords(categories: string[]): string[] {
  return categories.filter(cat => !cat.startsWith('Faction:') && cat !== 'Configuration');
} 