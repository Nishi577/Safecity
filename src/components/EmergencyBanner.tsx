import { useEffect, useState } from "react";
import { AlertTriangle, X, ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: string;
  type: string;
}

const EmergencyBanner = () => {
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchLatestCriticalAlert();
    
    // Subscribe to new critical alerts
    const channel = supabase.channel('critical-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, payload => {
        const newAlert = payload.new as Alert;
        if (['high', 'critical'].includes(newAlert.severity?.toLowerCase())) {
          setActiveAlert(newAlert);
          setDismissed(false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLatestCriticalAlert = async () => {
    try {
      const { data, error } = await supabase
        .from('alerts' as any)
        .select('*')
        .in('severity', ['high', 'high', 'critical', 'CRITICAL', 'HIGH']) // Case variants
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setActiveAlert((data[0] as any) as Alert);
      }
    } catch (err) {
      console.error('Error fetching emergency banner data:', err);
    }
  };

  if (!activeAlert || dismissed) return null;

  const isCritical = activeAlert.severity?.toLowerCase() === 'critical';

  return (
    <div className={`p-4 ${isCritical ? 'bg-red-600' : 'bg-orange-500'} text-white shadow-xl animate-in slide-in-from-top duration-500`}>
      <div className="container px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full hidden sm:block">
            {isCritical ? <ShieldAlert className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Badge className="bg-white/30 text-white border-0 text-[10px] uppercase font-black tracking-tighter h-5">
                URGENT: {activeAlert.type}
              </Badge>
              <span className="font-bold text-sm tracking-tight">{activeAlert.title}</span>
            </div>
            <p className="text-xs text-white/90 line-clamp-1">{activeAlert.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white text-xs h-9 flex-1 md:flex-none gap-2">
            Details <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <button 
            onClick={() => setDismissed(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyBanner;
