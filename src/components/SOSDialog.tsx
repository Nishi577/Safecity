import { useState, useEffect } from "react";
import { AlertTriangle, Phone, MapPin, X, Loader2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LocationSelector from "@/components/LocationSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const emergencyTypes = [
  "Medical Emergency",
  "Fire",
  "Accident",
  "Crime in Progress",
  "Natural Disaster",
  "Personal Safety Threat",
  "Other Emergency",
];

interface SOSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOSDialog = ({ open, onOpenChange }: SOSDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    location: "",
    emergencyType: "",
    message: "",
    city: "",
    area: "",
  });

  const fetchLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setGpsCoords({ lat: latitude, lng: longitude });
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`);
          const data = await res.json();
          
          if (data && data.address) {
            const addr = data.address;
            const detectedArea = addr.suburb || addr.neighbourhood || addr.city_district || addr.residential || "";
            const detectedCity = addr.city || addr.town || addr.county || addr.state_district || "";
            
            setFormData(prev => ({
              ...prev,
              city: detectedCity,
              area: detectedArea,
              location: prev.location || data.display_name || "Auto-captured Live GPS"
            }));
            
            toast.success(`Location detected: ${detectedArea}, ${detectedCity}`);
          }
        } catch (error) {
          console.error("Reverse Geocoding Error:", error);
          setFormData(prev => ({ ...prev, location: "Auto-captured Live GPS" }));
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation Error:", error);
        toast.error("Failed to get your location. Please enter it manually.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (open) {
      fetchLocation();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.emergencyType) {
      toast.error("Phone number and emergency type are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // We submit to 'incidents' table with is_emergency=true
      // This ensures it appears in Higher Officer dashboards and triggers routing
      const { data, error } = await supabase.from("incidents").insert({
        category: formData.emergencyType,
        description: `[EMERGENCY SOS]\n${formData.message || 'No message provided.'}\n\nCaller: ${formData.name || 'Anonymous'}\nPhone: ${formData.phone}`,
        location_description: formData.location || "Live Location",
        city: formData.city || null,
        area: formData.area || null,
        is_emergency: true,
        urgency: 'critical',
        status: 'pending',
        latitude: gpsCoords?.lat || null,
        longitude: gpsCoords?.lng || null,
        citizen_id: user?.id || null,
      }).select().single();

      if (error) throw error;

      toast.success("SOS sent! Emergency services have been notified.", {
        description: "Stay safe. Help is on the way.",
        duration: 8000,
      });
      onOpenChange(false);
      setFormData({ name: "", phone: "", location: "", emergencyType: "", message: "", city: "", area: "" });
    } catch (error) {
      console.error("SOS Error:", error);
      toast.error("Failed to send SOS. Please call emergency services directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-destructive/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Emergency SOS
          </DialogTitle>
          <DialogDescription>
            Send an emergency alert. No account needed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sos-phone">
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="sos-phone"
                type="tel"
                placeholder="Your phone number"
                value={formData.phone}
                onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Emergency Type <span className="text-destructive">*</span>
            </Label>
            <Select value={formData.emergencyType} onValueChange={(v) => setFormData(p => ({ ...p, emergencyType: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select emergency type" />
              </SelectTrigger>
              <SelectContent>
                {emergencyTypes.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sos-name">Name (optional)</Label>
            <Input
              id="sos-name"
              placeholder="Your name"
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          <LocationSelector
            city={formData.city}
            area={formData.area}
            onCityChange={(c) => setFormData(p => ({ ...p, city: c, area: "" }))}
            onAreaChange={(a) => setFormData(p => ({ ...p, area: a }))}
          />

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="sos-location">Specific Location</Label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="h-7 text-[10px] text-primary" 
                onClick={fetchLocation}
                disabled={isLocating}
              >
                {isLocating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Navigation className="h-3 w-3 mr-1" />}
                Refresh GPS
              </Button>
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="sos-location"
                placeholder="Address or landmark"
                value={formData.location}
                onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sos-message">Message (optional)</Label>
            <Textarea
              id="sos-message"
              placeholder="Brief description of the emergency..."
              value={formData.message}
              onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))}
              rows={2}
            />
          </div>

          <Button
            type="submit"
            variant="destructive"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending SOS..." : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Send Emergency SOS
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SOSDialog;
