import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { LearnerSidebar } from '../components/navigation/LearnerSidebar';
import { LearnerTopbar } from '../components/navigation/LearnerTopbar';
import { MobileSidebar } from '../components/navigation/MobileSidebar';

const LearnerLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background font-sans text-text-primary selection:bg-signal/20 flex">
      <LearnerSidebar />
      <MobileSidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <LearnerTopbar onMenuClick={() => setIsMobileMenuOpen(true)} />
        
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default LearnerLayout;
