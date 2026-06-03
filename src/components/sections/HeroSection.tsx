import { useState } from "react";
import { ArrowRight, Shield, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SOSDialog from "@/components/SOSDialog";

const HeroSection = () => {
  const { user } = useAuth();
  const [sosOpen, setSosOpen] = useState(false);

  return (
    <section className="bg-background pt-24 pb-16 lg:pt-32 lg:pb-24">
      <div className="container px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 flex justify-center">
             <div className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary inline-flex items-center gap-2">
               <Shield className="h-4 w-4" />
               <span>Official Public Safety Platform</span>
             </div>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl mb-6">
            Building a Safer City <br className="hidden sm:block" />
            Through <span className="text-primary">Direct Connection</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            A unified platform for reporting incidents, coordinating responses, and 
            tracking safety outcomes. Empowering citizens and supporting officials 
            with real-time tools.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to={user ? "/report" : "/auth"} className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                Report Incident
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Button 
               size="lg" 
               variant="destructive" 
               className="w-full sm:w-auto sm:px-8 font-bold"
               onClick={() => setSosOpen(true)}
            >
               <Siren className="h-5 w-5 mr-2" />
               Emergency SOS
            </Button>
          </div>
        </div>
      </div>
      <SOSDialog open={sosOpen} onOpenChange={setSosOpen} />
    </section>
  );
};

export default HeroSection;
