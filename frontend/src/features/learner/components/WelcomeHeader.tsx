import React from 'react';
import { useAuth } from '../../../features/auth/useAuth';

export const WelcomeHeader: React.FC = () => {
  const { user } = useAuth();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Hello'; // 21:00 - 04:59
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Learner';

  return (
    <div className="mb-10">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-text-primary tracking-tight">
        {getGreeting()}, <span className="text-signal">{firstName}</span>.
      </h1>
      <p className="mt-2 text-lg text-text-secondary">
        Here's what your learning needs today.
      </p>
    </div>
  );
};
