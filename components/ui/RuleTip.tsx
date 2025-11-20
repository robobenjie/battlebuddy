'use client';

import React, { useState } from 'react';

interface RuleTipProps {
  title: string;
  description?: string;
  className?: string;
}

export default function RuleTip({ title, description, className = '' }: RuleTipProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // Check if content is 2 lines or less by measuring the text height
  const [needsGradient, setNeedsGradient] = useState(false);
  const textRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (textRef.current && description) {
      const element = textRef.current;
      const lineHeight = parseInt(window.getComputedStyle(element).lineHeight);
      
      // Temporarily remove line-clamp to measure actual content height
      const originalClasses = element.className;
      element.className = element.className.replace('line-clamp-2', '');
      const actualHeight = element.scrollHeight;
      element.className = originalClasses;
      
      setNeedsGradient(actualHeight > lineHeight * 2);
    }
  }, [description]);

  return (
    <div 
      className={`bg-gray-700 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ease-in-out ${className}`}
      onClick={handleToggle}
    >
      <div className="p-2">
                  <div className="text-xs font-medium text-white mb-1">{title}</div>
          {description && (
            <div className={`text-xs text-gray-300 transition-all duration-300 ease-in-out ${
              isExpanded ? 'max-h-96' : 'max-h-8'
            } opacity-100`}>
              <div className={`relative ${!isExpanded ? 'overflow-hidden' : ''}`}>
                <div ref={textRef} className={!isExpanded ? 'line-clamp-2' : ''}>
                  {description}
                </div>
                {!isExpanded && needsGradient && (
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gray-700 to-transparent" />
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
} 