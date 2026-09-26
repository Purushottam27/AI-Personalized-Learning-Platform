import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { SidebarNav } from './LearnerSidebar';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed inset-y-0 left-0 w-3/4 max-w-sm bg-surface z-50 flex flex-col shadow-2xl transform transition-transform duration-300 lg:hidden border-r border-border-muted">
        <div className="h-16 flex items-center justify-between px-6 border-b border-border-muted">
          <span className="font-display text-xl font-semibold tracking-tight text-text-primary">
            LEARNOVA
          </span>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-md"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarNav onItemClick={onClose} />
      </aside>
    </>
  );
};
