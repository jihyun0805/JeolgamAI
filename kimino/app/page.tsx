import { GradientBackground } from "@/components/gradient-background";
import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { CategoryCard } from "@/components/category-card";
import { HowItWorks } from "@/components/how-it-works";
import { WhySection } from "@/components/why-section";
import { Footer } from "@/components/footer";
import { CATEGORIES } from "@/lib/types";

export default function HomePage() {
  return (
    <GradientBackground>
      <Header />

      <main>
        {/* Hero Section */}
        <HeroSection />

        {/* Category Cards */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {CATEGORIES.map((category, index) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <HowItWorks />

        {/* Why This Service */}
        <WhySection />
      </main>

      <Footer />
    </GradientBackground>
  );
}
