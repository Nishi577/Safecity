import { XCircle, Check } from "lucide-react";

const guarantees = [
  {
    negative: "No lost cases",
    positive: "Every report is logged and tracked",
  },
  {
    negative: "No unchecked delays",
    positive: "Automatic escalation for missed deadlines",
  },
  {
    negative: "No invisible processes",
    positive: "Full audit trails and status visibility",
  },
];

const TransparencySection = () => {
  return (
    <section id="transparency" className="py-24 lg:py-32 section-gradient-alt mesh-bg">
      <div className="section-container">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Content */}
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
              Accountability
            </span>
            <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Transparency & Accountability
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
              SafeCity transforms how public safety operates—from opaque, reactive systems to transparent, accountable processes that citizens can trust.
            </p>

            {/* Guarantees */}
            <div className="space-y-6">
              {guarantees.map((item, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                    <XCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground line-through decoration-destructive/50">
                      {item.negative}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      <p className="text-sm text-muted-foreground">{item.positive}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
              {/* Timeline Preview */}
              <h4 className="mb-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Case Timeline Preview
              </h4>
              <div className="space-y-6">
                <TimelineItem
                  status="complete"
                  title="Report Submitted"
                  time="Jan 15, 9:42 AM"
                />
                <TimelineItem
                  status="complete"
                  title="Reviewed & Prioritized"
                  time="Jan 15, 10:15 AM"
                  detail="Assigned to Traffic Dept."
                />
                <TimelineItem
                  status="complete"
                  title="Investigation Started"
                  time="Jan 15, 11:30 AM"
                />
                <TimelineItem
                  status="active"
                  title="In Progress"
                  time="Updated 2 hours ago"
                  detail="Officer assigned, on-site inspection scheduled"
                />
                <TimelineItem
                  status="pending"
                  title="Resolution"
                  time="Expected: Jan 17"
                />
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -bottom-4 -right-4 h-40 w-40 rounded-3xl bg-accent/5 -z-10" />
            <div className="absolute -top-4 -left-4 h-28 w-28 rounded-3xl bg-primary/5 -z-10" />
            <div className="absolute top-1/2 -right-8 h-20 w-20 rounded-full bg-accent/8 blur-xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
};

const TimelineItem = ({
  status,
  title,
  time,
  detail
}: {
  status: 'complete' | 'active' | 'pending';
  title: string;
  time: string;
  detail?: string;
}) => {
  const statusStyles = {
    complete: 'bg-success text-success-foreground',
    active: 'bg-accent text-accent-foreground ring-4 ring-accent/20',
    pending: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${statusStyles[status]}`}>
          {status === 'complete' && <Check className="h-4 w-4" />}
          {status === 'active' && <div className="h-2 w-2 rounded-full bg-current animate-pulse" />}
          {status === 'pending' && <div className="h-2 w-2 rounded-full bg-current" />}
        </div>
        <div className="mt-2 h-full w-px bg-border" />
      </div>
      <div className="pb-6">
        <p className={`font-medium ${status === 'pending' ? 'text-muted-foreground' : 'text-foreground'}`}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{time}</p>
        {detail && (
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        )}
      </div>
    </div>
  );
};

export default TransparencySection;
