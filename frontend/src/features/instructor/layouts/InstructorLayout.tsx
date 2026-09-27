import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { InstructorSidebar } from '../components/InstructorSidebar';
import { InstructorTopbar } from '../components/InstructorTopbar';
import { MobileInstructorSidebar } from '../components/MobileInstructorSidebar';

const InstructorLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background font-sans text-text-primary selection:bg-signal/20 flex relative">
      {/* Ambient background effect for dark mode */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500 overflow-hidden"
        style={{ opacity: 'var(--ambient-opacity, 0)' }}
        aria-hidden="true"
      >
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-signal/5 rounded-full blur-[160px]"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] bg-sage/5 rounded-full blur-[160px]"></div>
      </div>
      
      <InstructorSidebar />
      <MobileInstructorSidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <InstructorTopbar onMenuClick={() => setIsMobileMenuOpen(true)} />
        
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default InstructorLayout;
