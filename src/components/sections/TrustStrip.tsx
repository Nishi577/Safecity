import { Lock, Eye, Shield, FileCheck } from "lucide-react";

const trustItems = [
  { icon: Lock, label: "Secure Reporting" },
  { icon: Eye, label: "Official Monitoring" },
  { icon: Shield, label: "Identity Protection" },
  { icon: FileCheck, label: "Verified Audits" },
];

const TrustStrip = () => {
  return (
    <section className="border-y py-8 bg-muted/50">
      <div className="container px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {trustItems.map((item, i) => (
            <div key={i} className="flex items-center justify-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustStrip;
