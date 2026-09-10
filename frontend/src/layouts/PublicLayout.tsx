import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { BookOpen, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PublicLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when screen resizes to md or larger
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between relative z-50">
        <Link 
          to="/" 
          className="flex items-center gap-2 font-display font-semibold text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded-md"
        >
          <BookOpen className="w-6 h-6 text-signal" />
          <span>Learnova</span>
        </Link>

        {/* Desktop & Tablet Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {/* Main Links (Hidden on Tablet, visible on Desktop) */}
          <div className="hidden lg:flex items-center gap-6">
            <a href="#how-it-works" className="text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded-sm">How it works</a>
            <a href="#for-learners" className="text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded-sm">For Learners</a>
            <div className="h-4 w-px bg-muted/30 mx-2"></div>
          </div>
          
          {/* Auth Links (Visible on both Tablet and Desktop) */}
          <Link 
            to="/login" 
            className="text-ink hover:text-signal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded-sm"
          >
            Sign in
          </Link>
          <Link 
            to="/signup" 
            className="bg-ink text-paper px-5 py-2.5 rounded-full hover:bg-ink/90 active:bg-ink/80 transition-all shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            Get started
          </Link>
        </nav>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2 -mr-2 text-ink hover:bg-surface/50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-paper pt-24 px-6 md:hidden overflow-y-auto"
          >
            <nav className="flex flex-col gap-6 text-lg font-medium">
              <a 
                href="#how-it-works" 
                className="py-3 border-b border-muted/10 text-ink hover:text-signal transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                How it works
              </a>
              <a 
                href="#for-learners" 
                className="py-3 border-b border-muted/10 text-ink hover:text-signal transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                For Learners
              </a>
              <div className="pt-4 flex flex-col gap-4">
                <Link 
                  to="/login"
                  className="py-3 text-center border border-muted/20 rounded-full hover:bg-surface/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link 
                  to="/signup"
                  className="py-3 text-center bg-ink text-paper rounded-full hover:bg-ink/90 active:bg-ink/80 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get started
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
      
      <main className="flex-grow relative z-10">
        <Outlet />
      </main>

      <footer className="border-t border-muted/20 py-16 mt-24 bg-surface/10 relative z-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="col-span-1 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 font-display font-semibold text-xl mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded-md w-max">
              <BookOpen className="w-6 h-6 text-signal" />
              <span>Learnova</span>
            </Link>
            <p className="text-muted text-sm max-w-sm">
              A personalized learning platform that adapts to your performance, providing a unique path for every learner.
            </p>
          </div>
          
          <div>
            <div className="font-semibold mb-4 text-ink">Platform</div>
            <nav className="flex flex-col gap-3 text-sm text-muted">
              <a href="#how-it-works" className="hover:text-signal hover:translate-x-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded-sm w-max">How it works</a>
              <a href="#for-learners" className="hover:text-signal hover:translate-x-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded-sm w-max">For Learners</a>
            </nav>
          </div>
          
          <div>
            <div className="font-semibold mb-4 text-ink">Account</div>
            <nav className="flex flex-col gap-3 text-sm text-muted">
              <Link to="/login" className="hover:text-signal hover:translate-x-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded-sm w-max">Sign in</Link>
              <Link to="/signup" className="hover:text-signal hover:translate-x-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded-sm w-max">Create account</Link>
            </nav>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 mt-16 pt-8 border-t border-muted/10 text-sm text-muted/60">
          &copy; {new Date().getFullYear()} Learnova. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
