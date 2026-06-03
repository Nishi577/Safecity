import { Shield } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-16" style={{ background: 'var(--hero-gradient)' }}>
      <div className="section-container">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <a href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20">
                <Shield className="h-5 w-5 text-accent" />
              </div>
              <span className="text-xl font-bold tracking-tight text-primary-foreground">
                Safe<span className="text-accent">City</span>
              </span>
            </a>
            <p className="mt-4 text-sm text-primary-foreground/60">
              Intelligent public safety platform connecting citizens and authorities.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">Platform</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/60">
              <li><a href="#" className="hover:text-accent transition-colors">Report Incident</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">View Alerts</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Track Case</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Emergency Contacts</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">Resources</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/60">
              <li><a href="#" className="hover:text-accent transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Safety Tips</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Contact Support</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">Legal</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/60">
              <li><a href="#" className="hover:text-accent transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Data Protection</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Accessibility</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/10 pt-8 sm:flex-row">
          <p className="text-sm text-primary-foreground/50">
            © {new Date().getFullYear()} SafeCity. All rights reserved.
          </p>
          <p className="text-xs text-primary-foreground/40">
            An official public safety initiative
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
