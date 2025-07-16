'use client';

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
  const handleClick = () => {
    if (onClick) {
      onClick(keyword, description);
    }
  };

  // Style variants for different types of keywords
  const getVariantStyles = () => {
    switch (variant) {
      case 'faction':
        return 'bg-red-700 hover:bg-red-600 text-red-100 border-red-600';
      case 'rule':
        return 'bg-blue-700 hover:bg-blue-600 text-blue-100 border-blue-600';
      case 'weapon':
        return 'bg-purple-700 hover:bg-purple-600 text-purple-100 border-purple-600';
      case 'keyword':
      default:
        return 'bg-gray-700 hover:bg-gray-600 text-gray-100 border-gray-600';
    }
  };

  const baseStyles = onClick 
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
      title={onClick ? 'Click for details' : undefined}
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