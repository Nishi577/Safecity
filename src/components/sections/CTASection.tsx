import { ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const CTASection = () => {
  const { user } = useAuth();

  return (
    <section className="py-24 lg:py-32">
      <div className="section-container">
        <div
          className="relative overflow-hidden rounded-3xl px-8 py-20 text-center sm:px-12 lg:px-16 lg:py-24"
          style={{ background: 'var(--hero-gradient)' }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 hero-pattern opacity-40" />

          {/* Grid Overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />

          {/* Floating orbs */}
          <div className="absolute top-1/3 left-1/4 w-48 h-48 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full bg-accent/5 blur-3xl" />

          <div className="relative z-10">
            {/* Icon */}
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/20 backdrop-blur-sm shadow-lg shadow-accent/10">
              <Shield className="h-10 w-10 text-accent" />
            </div>

            {/* Headline */}
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl lg:text-5xl">
              Report Safely. Be Heard.
            </h2>

            {/* Subheading */}
            <p className="mx-auto mb-10 max-w-xl text-lg text-primary-foreground/75">
              A trusted platform for responsible civic participation. Your voice matters in building a safer community.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to={user ? "/report" : "/auth"}>
                <Button variant="hero" size="xl" className="group shadow-2xl shadow-accent/20">
                  Start Your Report
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  variant="outline"
                  size="xl"
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground/50"
                >
                  Learn More
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
