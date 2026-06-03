import { FileText, Search, UserCheck, CheckCircle2 } from "lucide-react";

const steps = [
  { icon: FileText, title: "Report", description: "Submit details through our secure portal." },
  { icon: Search, title: "Review", description: "Authorities verify and triage the report." },
  { icon: UserCheck, title: "Action", description: "Officers are dispatched to investigate." },
  { icon: CheckCircle2, title: "Resolve", description: "Incident is closed with full reports." },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-background">
      <div className="container px-4 text-center">
        <h2 className="text-3xl font-bold mb-12 sm:text-4xl">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <step.icon className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
