import React from 'react';
import HeroSection from '../features/landing/HeroSection';
import ComparisonSection from '../features/landing/ComparisonSection';
import EvidenceSection from '../features/landing/EvidenceSection';
import ProfileSection from '../features/landing/ProfileSection';
import AdaptationSection from '../features/landing/AdaptationSection';
import PhilosophySection from '../features/landing/PhilosophySection';
import EcosystemSection from '../features/landing/EcosystemSection';
import CTASection from '../features/landing/CTASection';

const LandingPage: React.FC = () => {
  return (
    <div className="w-full">
      <HeroSection />
      <ComparisonSection />
      <EvidenceSection />
      <ProfileSection />
      <AdaptationSection />
      <PhilosophySection />
      <EcosystemSection />
      <CTASection />
    </div>
  );
};

export default LandingPage;

