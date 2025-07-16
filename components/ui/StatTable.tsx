'use client';

interface StatTableProps {
  characteristics: Array<{
    name: string;
    value: string;
  }>;
  type?: 'model' | 'weapon';
  className?: string;
}

export default function StatTable({ characteristics, type = 'model', className = '' }: StatTableProps) {
  if (!characteristics || characteristics.length === 0) {
    return null;
  }

  // Define standard order for different stat types
  const modelStatOrder = ['M', 'T', 'SV', 'W', 'LD', 'OC'];
  const weaponStatOrder = ['Range', 'A', 'BS', 'WS', 'S', 'AP', 'D', 'Keywords'];
  
  const getStatOrder = (type: string) => {
    return type === 'weapon' ? weaponStatOrder : modelStatOrder;
  };

  // Sort characteristics based on standard order
  const orderedCharacteristics = characteristics.sort((a, b) => {
    const order = getStatOrder(type);
    const aIndex = order.indexOf(a.name);
    const bIndex = order.indexOf(b.name);
    
    // Put known stats first in order, unknown stats last
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Group into rows for mobile layout
  const groupSize = type === 'weapon' ? 4 : 6; // 4 stats per row for weapons, 6 for models
  const rows = [];
  for (let i = 0; i < orderedCharacteristics.length; i += groupSize) {
    rows.push(orderedCharacteristics.slice(i, i + groupSize));
  }

  return (
    <div className={`bg-gray-700 rounded-lg overflow-hidden ${className}`}>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="grid gap-0" style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}>
          {/* Headers */}
          {row.map((char) => (
            <div
              key={`header-${char.name}`}
              className="bg-gray-600 px-2 py-1 text-center border-r border-gray-500 last:border-r-0"
            >
              <div className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
                {char.name}
              </div>
            </div>
          ))}
          
          {/* Values */}
          {row.map((char) => (
            <div
              key={`value-${char.name}`}
              className="bg-gray-700 px-2 py-2 text-center border-r border-gray-600 last:border-r-0"
            >
              <div className="text-sm font-mono text-white">
                {char.value || '-'}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
} 