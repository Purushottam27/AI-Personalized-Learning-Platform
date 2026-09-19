import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { BookOpen, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ui/ThemeToggle';

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
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      <header className="sticky top-0 z-50 w-full border-b border-border-muted bg-background/95 backdrop-blur-4xl rounded-2xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          {/* Logo */}
          <Link
            to="/"
            className={[
              'flex items-center gap-2 font-display font-semibold text-xl',
              'text-text-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/25',
              'rounded-md',
            ].join(' ')}
          >
            <BookOpen
              className="w-6 h-6 text-signal"
              aria-hidden="true"
            />
            <span>Learnova</span>
          </Link>

          {/* Desktop & Tablet Navigation */}
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <div className="hidden items-center gap-6 lg:flex">
              <a
                href="#how-it-works"
                className="rounded-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                How it works
              </a>

              <a
                href="#for-learners"
                className="rounded-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                For Learners
              </a>

              <div className="mx-2 h-4 w-px bg-border-muted" />
            </div>

            <ThemeToggle />

            <Link
              to="/login"
              className="rounded-sm text-text-primary transition-colors hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Sign in
            </Link>

            <Link
              to="/signup"
              className="rounded-full bg-signal px-5 py-2.5 text-paper shadow-sm transition-all hover:bg-signal-hover hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background active:bg-signal-active"
            >
              Get started
            </Link>
          </nav>

          {/* Mobile Hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />

            <button
              type="button"
              className={[
                'rounded-lg p-2',
                'text-text-primary',
                'transition-colors duration-150',
                'hover:bg-surface hover:text-text-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/25',
              ].join(' ')}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>


      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 overflow-y-auto bg-background px-6 pt-24 md:hidden"
          >
            <nav className="flex flex-col gap-6 text-lg font-medium">
              <a
                href="#how-it-works"
                className={[
                  'border-b border-border-muted py-3',
                  'text-text-primary',
                  'transition-colors duration-150',
                  'hover:text-signal',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/25',
                ].join(' ')}
                onClick={() => setMobileMenuOpen(false)}
              >
                How it works
              </a>

              <a
                href="#for-learners"
                className={[
                  'border-b border-border-muted py-3',
                  'text-text-primary',
                  'transition-colors duration-150',
                  'hover:text-signal',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/25',
                ].join(' ')}
                onClick={() => setMobileMenuOpen(false)}
              >
                For Learners
              </a>

              {/* Mobile Theme Toggle */}

              <div className="pt-4 flex flex-col gap-4">
                <Link
                  to="/login"
                  className={[
                    'rounded-full border border-border py-3 text-center',
                    'text-text-primary',
                    'transition-colors duration-150',
                    'hover:bg-surface-elevated',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/25',
                  ].join(' ')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign in
                </Link>

                <Link
                  to="/signup"
                  className={[
                    'rounded-full bg-signal py-3 text-center text-paper',
                    'transition-colors duration-150',
                    'hover:bg-signal-hover',
                    'active:bg-signal-active',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                  ].join(' ')}
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

      <footer className="relative z-10 mt-24 border-t border-border py-16 bg-surface">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="col-span-1 lg:col-span-2">
            <Link
              to="/"
              className={[
                'flex w-max items-center gap-2 mb-4',
                'font-display font-semibold text-xl text-text-primary',
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-focus/25 rounded-md',
              ].join(' ')}
            >
              <BookOpen
                className="w-6 h-6 text-signal"
                aria-hidden="true"
              />
              <span>Learnova</span>
            </Link>

            <p className="text-text-secondary text-sm max-w-sm">
              A personalized learning platform that adapts to your performance,
              providing a unique path for every learner.
            </p>
          </div>

          <div>
            <div className="font-semibold mb-4 text-text-primary">
              Platform
            </div>

            <nav className="flex flex-col gap-3 text-sm">
              <a
                href="#how-it-works"
                className={[
                  'w-max rounded-sm text-text-secondary',
                  'transition-all duration-150',
                  'hover:text-signal hover:translate-x-1',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-focus/25',
                ].join(' ')}
              >
                How it works
              </a>

              <a
                href="#for-learners"
                className={[
                  'w-max rounded-sm text-text-secondary',
                  'transition-all duration-150',
                  'hover:text-signal hover:translate-x-1',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-focus/25',
                ].join(' ')}
              >
                For Learners
              </a>
            </nav>
          </div>

          <div>
            <div className="font-semibold mb-4 text-text-primary">
              Account
            </div>

            <nav className="flex flex-col gap-3 text-sm">
              <Link
                to="/login"
                className={[
                  'w-max rounded-sm text-text-secondary',
                  'transition-all duration-150',
                  'hover:text-signal hover:translate-x-1',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-focus/25',
                ].join(' ')}
              >
                Sign in
              </Link>

              <Link
                to="/signup"
                className={[
                  'w-max rounded-sm text-text-secondary',
                  'transition-all duration-150',
                  'hover:text-signal hover:translate-x-1',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-focus/25',
                ].join(' ')}
              >
                Create account
              </Link>
            </nav>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 mt-16 pt-8 border-t border-border-muted text-sm text-text-tertiary">
          &copy; {new Date().getFullYear()} Learnova. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;