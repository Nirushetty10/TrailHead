import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProblemSection from './components/ProblemSection';
import WhatIsTrailhead from './components/WhatIsTrailhead';
import AIEmployees from './components/AIEmployees';
import ChatbotToBusiness from './components/ChatbotToBusiness';
import BusinessIntelligence from './components/BusinessIntelligence';
import OpportunityEngine from './components/OpportunityEngine';
import DigitalTwin from './components/DigitalTwin';
import PredictiveIntelligence from './components/PredictiveIntelligence';
import WhatIfSimulation from './components/WhatIfSimulation';
import AutonomousGrowth from './components/AutonomousGrowth';
import AIBusinessManager from './components/AIBusinessManager';
import HumanControl from './components/HumanControl';
import HowItWorks from './components/HowItWorks';
import UseCases from './components/UseCases';
import ForSmallBusinesses from './components/ForSmallBusinesses';
import RealImpact from './components/RealImpact';
import FutureVision from './components/FutureVision';
import WhyTrailhead from './components/WhyTrailhead';
import CTASection from './components/CTASection';
import Footer from './components/Footer';

export default function App() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main">
        <Hero />
        <ProblemSection />
        <WhatIsTrailhead />
        <AIEmployees />
        <ChatbotToBusiness />
        <BusinessIntelligence />
        <OpportunityEngine />
        <DigitalTwin />
        <PredictiveIntelligence />
        <WhatIfSimulation />
        <AutonomousGrowth />
        <AIBusinessManager />
        <HumanControl />
        <HowItWorks />
        <UseCases />
        <ForSmallBusinesses />
        <RealImpact />
        <FutureVision />
        <WhyTrailhead />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
