'use client';

interface HamburgerMenuProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function HamburgerMenu({ isOpen, onToggle }: HamburgerMenuProps) {
  return (
    <button
      onClick={onToggle}
      className="fixed top-4 left-4 z-50 bg-gray-800 hover:bg-gray-700 p-3 rounded-lg border border-gray-600 transition-colors"
      aria-label="Toggle menu"
    >
      <div className="w-6 h-6 flex flex-col justify-center items-center">
        <span
          className={`bg-white block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm ${
            isOpen ? 'rotate-45 translate-y-1' : '-translate-y-0.5'
          }`}
        ></span>
        <span
          className={`bg-white block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm my-0.5 ${
            isOpen ? 'opacity-0' : 'opacity-100'
          }`}
        ></span>
        <span
          className={`bg-white block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm ${
            isOpen ? '-rotate-45 -translate-y-1' : 'translate-y-0.5'
          }`}
        ></span>
      </div>
    </button>
  );
} 