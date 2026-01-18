'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
  className?: string;
}

export default function Dropdown({ children, trigger, className = '' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
      >
        {trigger}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
            {children}
          </div>
        </>
      )}
    </div>
  );
}