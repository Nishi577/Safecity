import {
  Bell,
  MessageSquare,
  MapPin,
  Eye,
  Upload,
  Clock,
  Shield,
  Users
} from "lucide-react";

const features = [
  {
    icon: Bell,
    title: "Silent / Panic Reporting",
    description: "Report emergencies discreetly without alerting those around you. No UI or sound changes.",
    highlight: true,
  },
  {
    icon: Shield,
    title: "Advanced AI Insights",
    description: "ML-driven severity assessment ensures the most critical cases get immediate attention.",
  },
  {
    icon: Clock,
    title: "Case Progress Tracking",
    description: "Follow your report's journey with a transparent timeline from submission to resolution.",
  },
  {
    icon: MapPin,
    title: "Location-Based Alerts",
    description: "Receive geo-fenced notifications about safety incidents and advisories in your area.",
  },
  {
    icon: Upload,
    title: "Secure Evidence Uploads",
    description: "Attach images, videos, audio, and documents securely to strengthen your report.",
  },
  {
    icon: Eye,
    title: "Transparent Updates",
    description: "Stay informed with automated status updates and delay explanations.",
  },
  {
    icon: Shield,
    title: "Authority Announcements",
    description: "Official alerts and safety advisories from verified government sources.",
  },
  {
    icon: Users,
    title: "Multi-Department Routing",
    description: "Cases automatically routed to relevant departments—police, traffic, utilities.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 lg:py-32 bg-[#fdfaf6] grain-bg">
      <div className="section-container">
        {/* Section Header */}
        <div className="mx-auto mb-20 max-w-3xl text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-[#a67c52] shadow-sm">
            Citizen Features
          </span>
          <h2 className="mb-6 text-4xl font-extrabold tracking-tight text-[#2c2c2c] lg:text-6xl">
            Platform Capabilities
          </h2>
          <p className="text-xl font-medium text-[#2c2c2c]/60">
            Advanced tools designed to empower citizens while ensuring safety,
            transparency, and institutional accountability.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`premium-card group transition-all duration-500 hover:border-[#a67c52]/20 ${feature.highlight
                  ? 'border-[#a67c52]/10 bg-white/50 shadow-[0_20px_50px_rgba(166,124,82,0.05)]'
                  : 'bg-white/40'
                }`}
            >
              {/* Icon */}
              <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-[18px] transition-all duration-500 ${feature.highlight
                  ? 'bg-[#a67c52] text-white shadow-xl shadow-[#a67c52]/20'
                  : 'bg-white text-[#2c2c2c] shadow-md group-hover:bg-[#a67c52] group-hover:text-white group-hover:shadow-xl group-hover:shadow-[#a67c52]/20 border border-black/5'
                }`}>
                <feature.icon className="h-6 w-6" />
              </div>

              {/* Content */}
              <h3 className="mb-3 text-xl font-bold text-[#2c2c2c]">{feature.title}</h3>
              <p className="text-[15px] font-medium leading-relaxed text-[#2c2c2c]/60 group-hover:text-[#2c2c2c]/80 transition-colors">
                {feature.description}
              </p>

              {/* Highlight Badge */}
              {feature.highlight && (
                <div className="mt-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#a67c52]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#a67c52]">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#a67c52] animate-pulse" />
                    Essential
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
