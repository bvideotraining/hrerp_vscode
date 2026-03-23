import Header from "@/components/landing/header";
import Hero from "@/components/landing/hero";
import FeaturesSection from "@/components/landing/features";
import ModulesShowcase from "@/components/landing/modules-showcase";
import Footer from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <main>
      <Header />
      <Hero />
      <FeaturesSection />
      <ModulesShowcase />
      <Footer />
    </main>
  );
}
