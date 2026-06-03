import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/sections/HeroSection";
import TrustStrip from "@/components/sections/TrustStrip";
import HowItWorks from "@/components/sections/HowItWorks";
import FeaturesSection from "@/components/sections/FeaturesSection";
import TransparencySection from "@/components/sections/TransparencySection";
import CTASection from "@/components/sections/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <TrustStrip />
        <HowItWorks />
        <FeaturesSection />
        <TransparencySection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
