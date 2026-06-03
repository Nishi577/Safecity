import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { 
  Shield, ArrowLeft, MapPin, Calendar, FileText, Upload, AlertTriangle, Send,
  User, Eye, Car, Users, CheckCircle2, Clock, Map, Camera, Info, ShieldAlert,
  PhoneCall, HeartPulse, Flame, Navigation, Loader2, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LocationSelector from "@/components/LocationSelector";
import { predictSeverity, detectFakeReport, findSimilarIncidents } from "@/lib/mlService";
import DescriptionAnalyzer from "@/components/DescriptionAnalyzer";
import type { SeverityLevel } from "@/lib/descriptionAnalyzer";

const incidentCategories = [
  { id: "theft", label: "Theft", icon: FileText },
  { id: "harassment", label: "Harassment", icon: AlertTriangle },
  { id: "suspicious_activity", label: "Suspicious Activity", icon: Eye },
  { id: "violence", label: "Violence", icon: ShieldAlert },
  { id: "missing_person", label: "Missing Person", icon: User },
  { id: "missing_item", label: "Missing Item", icon: PackageIcon },
  { id: "vandalism", label: "Vandalism", icon: Eye },
  { id: "unsafe_area", label: "Unsafe Area", icon: MapPin },
  { id: "traffic_incident", label: "Traffic Incident", icon: Car },
  { id: "emergency", label: "Emergency", icon: AlertTriangle },
  { id: "other", label: "Other", icon: FileText },
];

function PackageIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.5 4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

const Report = () => {
  const [searchParams] = useSearchParams();
  const isEmergency = searchParams.get("emergency") === "true";
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const totalSteps = 4;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mlPrediction, setMlPrediction] = useState<{ severity: string; confidence: number; fallback: boolean } | null>(null);
  const [isSuspiciousReport, setIsSuspiciousReport] = useState(false);
  const [suspiciousReason, setSuspiciousReason] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  // Local (frontend) analysis state – updated in real-time by DescriptionAnalyzer
  const [localSeverity, setLocalSeverity] = useState<SeverityLevel | null>(null);

  // Core Schema State
  const [formData, setFormData] = useState({
    category: "",
    title: "",
    description: "",
    city: "",
    area: "",
    location: "",
    landmark: "",
    dateTime: "",
    urgency: isEmergency ? "high" : "medium",
    suspectDescription: "",
    vehicleInfo: "",
  });

  // UX & Supplemental State
  const [happeningNow, setHappeningNow] = useState(false);
  const [indoorOutdoor, setIndoorOutdoor] = useState<"indoor" | "outdoor">("outdoor");
  const [peopleInvolved, setPeopleInvolved] = useState("");
  const [currentlySafe, setCurrentlySafe] = useState<boolean | null>(null);
  
  // Danger & Urgency Flags
  const [weaponPresent, setWeaponPresent] = useState(false);
  const [anyoneInjured, setAnyoneInjured] = useState(false);
  const [inDanger, setInDanger] = useState(false);
  const [suspectNearby, setSuspectNearby] = useState(false);
  const [needsUrgentAttention, setNeedsUrgentAttention] = useState(isEmergency);

  // ================= EMERGENCY SOS UNIQUE STATE ================= //
  const [sosStatus, setSosStatus] = useState<'IDLE' | 'COUNTDOWN' | 'SENDING' | 'SENT'>('IDLE');
  const [countdown, setCountdown] = useState(5);
  const [gpsLocation, setGpsLocation] = useState<{lat: number, lng: number} | null>(null);
  const [sosMessage, setSosMessage] = useState("");
  const sosIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [safetyTipIndex, setSafetyTipIndex] = useState(0);

  const SOS_CATEGORIES = [
    { id: "assault", label: "Assault", icon: ShieldAlert, color: "bg-red-500 hover:bg-red-600" },
    { id: "medical", label: "Medical", icon: HeartPulse, color: "bg-rose-500 hover:bg-rose-600" },
    { id: "theft", label: "Theft", icon: User, color: "bg-orange-500 hover:bg-orange-600" },
    { id: "fire", label: "Fire", icon: Flame, color: "bg-orange-600 hover:bg-orange-700" },
    { id: "accident", label: "Accident", icon: Car, color: "bg-amber-600 hover:bg-amber-700" },
    { id: "women_safety", label: "Women Safety", icon: Shield, color: "bg-fuchsia-600 hover:bg-fuchsia-700" },
    { id: "child_safety", label: "Child Safety", icon: Users, color: "bg-purple-600 hover:bg-purple-700" },
    { id: "suspicious", label: "Suspicious", icon: Eye, color: "bg-gray-600 hover:bg-gray-700" },
  ];

  const SAFETY_TIPS = [
    "Move to a crowded, well-lit area if possible.",
    "Stay near a safe building or open business.",
    "Do not confront attackers; keep your distance.",
    "Stay on the phone with trusted contacts if possible.",
    "If indoors, keep doors and windows securely locked.",
    "Breathe. Help is being notified."
  ];

  const EMERGENCY_NUMBERS = [
    { label: "Police", number: "100" },
    { label: "Ambulance", number: "108" },
    { label: "Fire Brigade", number: "101" },
    { label: "Women Helpline", number: "1091" },
    { label: "Child Helpline", number: "1098" }
  ];
  
  // Witnesses
  const [witnessesPresent, setWitnessesPresent] = useState(false);
  const [witnessDetails, setWitnessDetails] = useState("");

  // Recurring
  const [isRecurring, setIsRecurring] = useState(false);

  // Conditionals
  const [missingItemDetails, setMissingItemDetails] = useState("");
  const [missingPersonAge, setMissingPersonAge] = useState("");
  const [stolenItemDetails, setStolenItemDetails] = useState("");
  const [unsafeReason, setUnsafeReason] = useState("");
  const [harassmentKnown, setHarassmentKnown] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (happeningNow) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setFormData(prev => ({ ...prev, dateTime: now.toISOString().slice(0, 16) }));
    }
  }, [happeningNow]);

  // ML Analysis logic preserved
  const mlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const desc = formData.description.trim();
    if (desc.length < 8) {
      setMlPrediction(null);
      setIsSuspiciousReport(false);
      return;
    }
    if (mlDebounceRef.current) clearTimeout(mlDebounceRef.current);
    mlDebounceRef.current = setTimeout(async () => {
      try {
        const [prediction, fakeResult] = await Promise.allSettled([
          predictSeverity(desc),
          detectFakeReport(desc),
        ]);
        if (prediction.status === "fulfilled") setMlPrediction(prediction.value);
        if (fakeResult.status === "fulfilled") {
          setIsSuspiciousReport(fakeResult.value.is_suspicious);
          setSuspiciousReason(fakeResult.value.reason);
        }
      } catch { /* silent */ }
    }, 800);
    return () => { if (mlDebounceRef.current) clearTimeout(mlDebounceRef.current); };
  }, [formData.description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let incidentDate = null;
      let incidentTime = null;
      if (formData.dateTime) {
        const dateTimeObj = new Date(formData.dateTime);
        incidentDate = dateTimeObj.toISOString().split('T')[0];
        incidentTime = dateTimeObj.toTimeString().split(' ')[0];
      }

      let evidenceUrls: string[] = [];
      if (evidenceFiles.length > 0) {
        for (const file of evidenceFiles) {
          const ext = file.name.split('.').pop();
          const path = `evidence/${user?.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError } = await supabase.storage.from('evidence').upload(path, file);
          if (uploadError) continue;
          const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(path);
          if (urlData?.publicUrl) evidenceUrls.push(urlData.publicUrl);
        }
      }

      let compiledDescription = formData.description;
      
      const extras = [];
      if (indoorOutdoor) extras.push(`Environment: ${indoorOutdoor}`);
      if (formData.category === 'missing_item' && missingItemDetails) extras.push(`Missing Item Details: ${missingItemDetails}`);
      if (formData.category === 'missing_person' && missingPersonAge) extras.push(`Missing Person Age Range: ${missingPersonAge}`);
      if (formData.category === 'theft' && stolenItemDetails) extras.push(`Stolen Goods: ${stolenItemDetails}`);
      if (formData.category === 'unsafe_area' && unsafeReason) extras.push(`Unsafe Reason: ${unsafeReason}`);
      if (formData.category === 'harassment' && harassmentKnown) extras.push(`Harasser is known to victim.`);
      if (peopleInvolved) extras.push(`People Involved: ${peopleInvolved}`);
      if (weaponPresent) extras.push(`! WEAPON REPORTED !`);
      if (anyoneInjured) extras.push(`! INJURY REPORTED !`);
      if (suspectNearby) extras.push(`! SUSPECT NEARBY !`);
      if (witnessesPresent && witnessDetails) extras.push(`Witnesses: ${witnessDetails}`);
      if (isRecurring) extras.push(`Recurring Incident.`);

      if (extras.length > 0) {
        compiledDescription += `\n\n--- Additional Context ---\n` + extras.join('\n');
      }

      // Inject Emergency Location
      if (isEmergency && gpsLocation) {
        compiledDescription = `[URGENT GPS ACQUIRED]\nLAT: ${gpsLocation.lat}, LNG: ${gpsLocation.lng}\nMap Link: https://www.google.com/maps?q=${gpsLocation.lat},${gpsLocation.lng}\n\n` + compiledDescription;
      }
      if (isEmergency && sosMessage) {
        compiledDescription += `\n\n[USER NOTE]: ${sosMessage}`;
      }

      // Use server ML severity if available, else use local analysis, else fallback to form urgency
      const finalUrgency = needsUrgentAttention
        ? 'critical'
        : (mlPrediction?.severity.toLowerCase() || localSeverity?.toLowerCase() || formData.urgency);

      const payload: any = {
        citizen_id: user?.id,
        category: formData.category,
        description: compiledDescription,
        city: formData.city,
        area: formData.area,
        location_description: formData.location,
        landmark: formData.landmark || null,
        incident_date: incidentDate,
        incident_time: incidentTime,
        urgency: finalUrgency,
        is_emergency: isEmergency || needsUrgentAttention,
        suspect_description: formData.suspectDescription || null,
        vehicle_info: formData.vehicleInfo || null,
        status: 'pending',
        ml_severity: mlPrediction?.severity || localSeverity || null,
        ml_confidence: mlPrediction?.confidence || null,
        is_suspicious_report: isSuspiciousReport || false,
        suspicious_reason: isSuspiciousReport ? suspiciousReason : null,
        evidence_urls: evidenceUrls.length > 0 ? evidenceUrls : null,
      };

      if (isEmergency || needsUrgentAttention) {
        payload.status = 'pending';
      }

      const { data: insertedData, error } = await supabase.from('incidents')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw error;
      
      // Async enrich the incident with area data and jurisdiction assignment
      if (gpsLocation && insertedData) {
         reverseGeocodeAndMap(insertedData.id, gpsLocation.lat, gpsLocation.lng);
      }

      if (isEmergency) {
         setSosStatus('SENT');
         toast.success("SOS Alert Sent! Responders are being notified.");
      } else {
         toast.success("Incident reported successfully.");
         navigate("/dashboard");
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reverseGeocodeAndMap = async (incidentId: string, lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`);
      const data = await res.json();
      if (!data || !data.address) return;
      
      const addr = data.address;
      const area = addr.suburb || addr.neighbourhood || addr.city_district || addr.residential || null;
      const city = addr.city || addr.town || addr.county || addr.state_district || null;
      
      // Update incident with location data
      let updates: any = {};
      if (area) updates.area = area;
      if (city) updates.city = city;
      
      // Attempt to resolve higher officer mapping based on area/city
      try {
        const { data: mapping } = await (supabase as any)
          .from('jurisdiction_mappings')
          .select('higher_officer_id')
          .ilike('area', area || '')
          .limit(1)
          .single();
          
        if (mapping && mapping.higher_officer_id) {
          updates.assigned_higher_officer_id = mapping.higher_officer_id;
        }
      } catch (err) {
         // Silently fail mapping lookup, keep updates
      }
      
      if (Object.keys(updates).length > 0) {
        await supabase.from('incidents').update(updates).eq('id', incidentId);
      }
    } catch (error) {
      console.error('Background Geocode Error:', error);
    }
  };

  // SOS Countdown logic
  useEffect(() => {
    if (sosStatus === 'COUNTDOWN') {
      sosIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(sosIntervalRef.current!);
            setSosStatus('SENDING');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Request Location silently
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition((pos) => {
          setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setFormData(p => ({ ...p, location: "Auto-captured Live GPS" }));
        }, () => console.log("GPS denied or failed"), { enableHighAccuracy: true });
      }
    }
    return () => { if (sosIntervalRef.current) clearInterval(sosIntervalRef.current); };
  }, [sosStatus]);

  // Execute Submission when COUNTDOWN -> SENDING
  useEffect(() => {
    if (sosStatus === 'SENDING') {
      const e = { preventDefault: () => {} } as any;
      setFormData(prev => ({ 
        ...prev, 
        description: prev.description || "I require immediate help. My live GPS location has been shared automatically.",
        title: prev.title || "EMERGENCY SOS REQUEST"
      }));
      setTimeout(() => handleSubmit(e), 200);
    }
  }, [sosStatus]);

  // Rotating Safety Tips
  useEffect(() => {
    if (sosStatus === 'SENT') {
      const tipInterval = setInterval(() => {
        setSafetyTipIndex(prev => (prev + 1) % SAFETY_TIPS.length);
      }, 4000);
      return () => clearInterval(tipInterval);
    }
  }, [sosStatus]);

  const triggerSOS = (catId?: string) => {
    if (catId) setFormData(p => ({ ...p, category: catId }));
    setSosStatus('COUNTDOWN');
  };

  const cancelSOS = () => {
    if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
    setSosStatus('IDLE');
    setCountdown(5);
  };

  if (loading) return <div className="min-h-screen animate-pulse bg-background" />;
  if (!user) return null;

  // ================= EMERGENCY SOS UI ================= //
  if (isEmergency) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col">
        <header className="p-4 flex items-center justify-between z-10 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="text-neutral-400 hover:text-white px-0" disabled={sosStatus === 'COUNTDOWN' || sosStatus === 'SENDING'}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${gpsLocation ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${gpsLocation ? 'bg-emerald-500' : 'bg-rose-600'}`}></span>
            </span>
            <span className="text-xs font-mono tracking-widest text-neutral-400 uppercase">
              {gpsLocation ? "GPS Locked" : "Acquiring GPS Signal"}
            </span>
          </div>
        </header>

        <main className="flex-1 flex flex-col px-4 py-6 max-w-md mx-auto w-full relative">
          {sosStatus === 'IDLE' && (
            <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-300">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase">Emergency Response</h1>
                <p className="text-neutral-400 mt-2 text-sm">Tap SOS immediately or select an incident type for specific tactical response.</p>
              </div>

              {/* Central Giant Button */}
              <div className="flex justify-center mb-10">
                <button 
                  onClick={() => triggerSOS('emergency')}
                  className="relative group h-48 w-48 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_80px_rgba(220,38,38,0.4)] active:scale-95 transition-all duration-200 border-4 border-red-500/50"
                  style={{ touchAction: 'manipulation' }}
                >
                  <div className="absolute inset-0 rounded-full bg-red-500 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative text-white text-5xl font-black tracking-widest drop-shadow-md z-10">SOS</span>
                </button>
              </div>

              <div className="space-y-4 flex-1">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Specific Incident</h3>
                <div className="grid grid-cols-2 gap-3">
                  {SOS_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => triggerSOS(cat.id)}
                      className={`h-16 flex items-center gap-3 px-4 rounded-xl text-white shadow-sm transition-transform active:scale-95 ${cat.color}`}
                    >
                      <cat.icon className="h-6 w-6 opacity-80" />
                      <span className="font-semibold text-sm leading-tight text-left">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {sosStatus === 'COUNTDOWN' && (
            <div className="flex-1 flex flex-col items-center justify-center animate-in slide-in-from-bottom-8 duration-500">
               <div className="text-center space-y-4 mb-16">
                 <AlertTriangle className="h-16 w-16 text-red-500 mx-auto animate-pulse" />
                 <h2 className="text-2xl font-bold uppercase tracking-wide">Transmitting Protocol</h2>
                 <p className="text-neutral-400 text-sm max-w-[280px]">Your live location, identity credentials, and SOS trigger are being securely routed to tactical responders.</p>
               </div>

               <div className="relative flex items-center justify-center mb-24">
                 <svg className="w-64 h-64 transform -rotate-90">
                    <circle className="text-neutral-800" strokeWidth="6" stroke="currentColor" fill="transparent" r="110" cx="128" cy="128" />
                    <circle 
                      className="text-red-500 transition-all duration-1000 ease-linear" 
                      strokeWidth="8" stroke="currentColor" fill="transparent" r="110" cx="128" cy="128"
                      strokeDasharray={110 * 2 * Math.PI}
                      strokeDashoffset={(110 * 2 * Math.PI) * (1 - (countdown / 5))}
                      strokeLinecap="round"
                    />
                 </svg>
                 <div className="absolute flex flex-col items-center justify-center font-mono">
                    <span className="text-8xl font-black text-white">{countdown}</span>
                    <span className="text-xs text-red-400 font-semibold tracking-widest uppercase mt-2">Seconds left</span>
                 </div>
               </div>

               <button 
                 onClick={cancelSOS}
                 className="w-full max-w-[280px] h-14 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold tracking-widest uppercase hover:bg-neutral-700 active:scale-95 transition-all outline-none flex items-center justify-center gap-2"
               >
                 <XCircle className="h-5 w-5" /> Cancel SOS
               </button>
            </div>
          )}

          {sosStatus === 'SENDING' && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Loader2 className="h-16 w-16 text-rose-500 animate-spin mb-6" />
              <h2 className="text-xl font-bold uppercase tracking-widest text-center animate-pulse">Establishing Secure Uplink...</h2>
              <p className="text-neutral-500 text-sm mt-3 text-center">Bypassing network latency. Connecting to local dispatch grid.</p>
            </div>
          )}

          {sosStatus === 'SENT' && (
            <div className="flex-1 flex flex-col animate-in fade-in duration-700">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 mb-6 shadow-[0_0_30px_rgba(16,185,129,0.15)] flex items-start gap-4">
                 <div className="bg-emerald-500 rounded-full p-2 mt-0.5">
                   <ShieldAlert className="h-6 w-6 text-white" />
                 </div>
                 <div>
                   <h2 className="text-lg font-bold text-emerald-400 uppercase tracking-wide">SOS Transmitted</h2>
                   <p className="text-sm text-emerald-100/70 leading-snug mt-1">Live location locked. Local responders have been alerted digitally.</p>
                   {gpsLocation && (
                     <p className="text-[10px] font-mono mt-3 text-emerald-500 bg-emerald-950/50 inline-block px-2 py-1 rounded">
                       N {gpsLocation.lat.toFixed(6)} / W {gpsLocation.lng.toFixed(6)}
                     </p>
                   )}
                 </div>
              </div>

              {/* Status Tracker */}
              <div className="mb-8 pl-2">
                <ol className="relative border-l border-neutral-700 space-y-6">
                  <li className="ml-6">
                    <span className="absolute flex items-center justify-center w-5 h-5 rounded-full -left-[11px] ring-4 ring-neutral-950 bg-emerald-500"><CheckCircle2 className="w-3 h-3 text-white"/></span>
                    <h3 className="font-semibold text-white/90 text-sm">SOS Broadcasted</h3>
                  </li>
                  <li className="ml-6">
                    <span className="absolute flex items-center justify-center w-5 h-5 rounded-full -left-[11px] ring-4 ring-neutral-950 bg-emerald-500"><CheckCircle2 className="w-3 h-3 text-white"/></span>
                    <h3 className="font-semibold text-white/90 text-sm">Regional Authorities Pinged</h3>
                  </li>
                  <li className="ml-6 opacity-60">
                    <span className="absolute flex items-center justify-center w-5 h-5 rounded-full -left-[11px] ring-4 ring-neutral-950 bg-neutral-800"></span>
                    <h3 className="font-semibold font-medium text-sm flex items-center gap-2">Awaiting Officer Assignment <Loader2 className="w-3 h-3 animate-spin"/></h3>
                  </li>
                </ol>
              </div>

              {/* Contextual Guidance */}
              <div className="bg-amber-500/10 rounded-xl p-4 mb-6 border border-amber-500/20 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50"></div>
                <h4 className="text-[10px] uppercase font-bold text-amber-500 tracking-widest mb-2">Tactical Guidance</h4>
                <p className="text-amber-100/90 font-medium text-sm min-h-[40px] flex items-center justify-center key={safetyTipIndex} animate-in fade-in zoom-in-95 duration-500">
                  {SAFETY_TIPS[safetyTipIndex]}
                </p>
              </div>

              {/* Quick Dial Pad */}
              <div className="space-y-3 mt-auto">
                <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest text-center">One-Tap Overrides (Cellular Voice)</h3>
                <div className="grid grid-cols-2 gap-3">
                   {EMERGENCY_NUMBERS.slice(0,4).map(em => (
                     <a key={em.label} href={`tel:${em.number}`} className="flex items-center justify-between px-4 py-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-neutral-800 transition-colors">
                       <div className="flex flex-col">
                         <span className="text-xs text-neutral-400 font-medium">{em.label}</span>
                         <span className="text-white font-bold">{em.number}</span>
                       </div>
                       <PhoneCall className="h-5 w-5 text-rose-500" />
                     </a>
                   ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <Button variant="outline" className="w-full bg-neutral-900 border-neutral-800 text-neutral-300 h-12" onClick={() => navigate("/dashboard")}>Minimize to Hub</Button>
                <div className="relative">
                  <Input type="file" onChange={e => setEvidenceFiles(Array.from(e.target.files || []))} className="hidden" id="sos-evidence" multiple />
                  <label htmlFor="sos-evidence" className="flex items-center justify-center w-full h-12 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm font-medium cursor-pointer hover:bg-neutral-800 transition-colors gap-2">
                    <Camera className="h-4 w-4" /> Upload intel
                  </label>
                </div>
              </div>

              {evidenceFiles.length > 0 && (
                <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full mt-3 bg-white text-black font-bold h-10">
                  {isSubmitting ? "Uploading Evidence..." : `Push ${evidenceFiles.length} Evidence File(s) Locally`}
                </Button>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ================= STANDARD REPORTING UI (NO CHANGES) ================= //
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight">Report an Incident</h1>
          </div>
          {isEmergency && <Badge variant="destructive" className="animate-pulse">Emergency Mode</Badge>}
        </div>
      </header>

      <main className="container max-w-2xl px-4 py-8 pb-32">
        {currentlySafe === null && (
          <Card className="border-destructive/50 shadow-md mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="bg-destructive/5 text-destructive rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Safety First
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-lg font-medium text-center">Are you currently in a safe location?</p>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  size="lg" 
                  onClick={() => setCurrentlySafe(true)} 
                  className="bg-success hover:bg-success/90 text-white font-semibold"
                >
                  Yes, I am safe
                </Button>
                <Button 
                  size="lg" 
                  variant="destructive" 
                  onClick={() => {
                     setCurrentlySafe(false);
                     setNeedsUrgentAttention(true);
                     setFormData(p => ({...p, category: "emergency"}));
                  }}
                  className="font-semibold"
                >
                  No, I need help
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentlySafe === true && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">Step {step} of {totalSteps}</span>
              <span className="text-sm font-medium text-primary">
                {step === 1 && "Incident Type"}
                {step === 2 && "Location Details"}
                {step === 3 && "The Narrative"}
                {step === 4 && "Critical Details & Submit"}
              </span>
            </div>
            <div className="flex gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                 <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step > i ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
          </div>
        )}

        {currentlySafe === false && !isSubmitting && (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded-r-lg shadow-sm">
               <h3 className="text-destructive font-bold flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Your safety is the priority right now.</h3>
               <p className="text-sm text-destructive/80 mt-1 font-medium">You can submit a quick emergency report first and provide more details later. If you are in immediate danger, use the quick actions below.</p>
             </div>

             <div className="space-y-3">
               <Label className="uppercase text-xs font-bold text-muted-foreground tracking-wider">Instant Overrides</Label>
               <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => navigate("/report?emergency=true")} className="bg-red-600 hover:bg-red-700 text-white font-bold h-12 flex shadow-md gap-2"><AlertTriangle className="h-4 w-4"/> Trigger SOS</Button>
                  <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 bg-white h-12 flex font-bold gap-2" onClick={() => window.location.href = "tel:100"}><PhoneCall className="h-4 w-4" /> Call Police</Button>
                  <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 bg-white h-12 flex font-bold gap-2" onClick={() => window.location.href = "tel:108"}><HeartPulse className="h-4 w-4" /> Ambulance</Button>
                  <Button variant="secondary" className="h-12 flex font-bold gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800" onClick={() => {
                    if ("geolocation" in navigator) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        setFormData(p => ({ ...p, location: "Live GPS Acquired" }));
                        toast.success("Live location captured successfully.");
                      });
                    }
                  }}><MapPin className={`h-4 w-4 ${gpsLocation ? "text-emerald-600" : ""}`} /> {gpsLocation ? "Location Locked" : "Share GPS"}</Button>
               </div>
             </div>

             <Card className="border-destructive/20 shadow-md">
               <CardHeader className="bg-destructive/5 pb-4 border-b border-destructive/10">
                 <CardTitle className="text-lg">Rapid Dispatch Form</CardTitle>
                 <CardDescription>We only need 3 things to dispatch help.</CardDescription>
               </CardHeader>
               <CardContent className="pt-6 space-y-5">
                 <div className="space-y-2">
                   <Label className="font-semibold text-foreground">1. What's happening?</Label>
                   <Select value={formData.category} onValueChange={v => setFormData(p => ({...p, category: v}))}>
                     <SelectTrigger className="mt-1 h-12 text-md shadow-sm border-muted-foreground/30"><SelectValue placeholder="Select emergency type" /></SelectTrigger>
                     <SelectContent>
                       {SOS_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-2">
                   <Label className="font-semibold text-foreground">2. Where are you?</Label>
                   <Input className="h-12 shadow-sm border-muted-foreground/30" placeholder="Address, landmark, or click 'Share GPS' above..." value={formData.location} onChange={e => setFormData(p => ({...p, location: e.target.value}))}/>
                 </div>
                 <div className="space-y-2">
                   <Label className="font-semibold text-foreground">3. Quick Context</Label>
                   <Textarea className="resize-y shadow-sm border-muted-foreground/30" rows={2} placeholder="Briefly describe the threat..." value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))}/>
                 </div>
               </CardContent>
             </Card>

             <Button 
               className="w-full bg-destructive hover:bg-destructive/90 text-white shadow-lg font-bold h-14 text-lg" 
               disabled={!formData.category || !formData.location || !formData.description}
               onClick={(e) => {
                 setNeedsUrgentAttention(true);
                 handleSubmit(e as any);
               }}
             >
               DISPATCH ASSISTANCE IMMEDIATELY
             </Button>

             <div className="text-center pt-2">
               <Button variant="link" className="text-muted-foreground text-xs" onClick={() => setCurrentlySafe(true)}>I am safe now, back to normal reporting</Button>
             </div>
           </div>
        )}

        {currentlySafe === true && (
          <form onSubmit={step === totalSteps ? handleSubmit : (e) => { e.preventDefault(); setStep(s => s + 1); }} className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            {/* STEP 1: CATEGORY & TIME */}
            {step === 1 && (
               <div className="space-y-6">
                 <Card>
                   <CardHeader>
                     <CardTitle className="text-lg">What kind of incident is this?</CardTitle>
                     <CardDescription>Select the category that best matches the event.</CardDescription>
                   </CardHeader>
                   <CardContent>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                       {incidentCategories.map(cat => (
                         <Button
                           key={cat.id}
                           type="button"
                           variant={formData.category === cat.id ? 'default' : 'outline'}
                           className={`h-24 flex flex-col items-center justify-center gap-2 ${formData.category === cat.id ? 'shadow-md border-primary ring-1 ring-primary' : 'hover:border-primary/50'}`}
                           onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                         >
                           <cat.icon className={`h-6 w-6 ${formData.category === cat.id ? 'text-primary-foreground' : 'text-primary'}`} />
                           <span className="text-xs text-center font-medium leading-tight whitespace-normal">{cat.label}</span>
                         </Button>
                       ))}
                     </div>
                   </CardContent>
                 </Card>

                 {formData.category && (
                   <Card className="animate-in fade-in slide-in-from-top-2 duration-300">
                     <CardHeader>
                       <CardTitle className="text-lg">When did this happen?</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-5">
                        <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary accent-primary" 
                            checked={happeningNow} 
                            onChange={e => setHappeningNow(e.target.checked)} 
                          />
                          <div>
                            <p className="font-medium text-sm">Happening Right Now</p>
                            <p className="text-xs text-muted-foreground">Check this if the incident is currently ongoing.</p>
                          </div>
                        </label>
                        
                        {!happeningNow && (
                          <div className="space-y-2">
                             <Label>Date & Time (Estimate if unsure)</Label>
                             <div className="relative">
                               <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                               <Input 
                                 type="datetime-local" 
                                 className="pl-10"
                                 value={formData.dateTime} 
                                 onChange={e => setFormData(p => ({ ...p, dateTime: e.target.value }))} 
                                 required={!happeningNow} 
                               />
                             </div>
                          </div>
                        )}
                     </CardContent>
                   </Card>
                 )}

                 <Button type="submit" className="w-full shadow-md" size="lg" disabled={!formData.category || (!happeningNow && !formData.dateTime)}>
                   Continue to Location
                 </Button>
               </div>
            )}

            {/* STEP 2: LOCATION */}
            {step === 2 && (
              <div className="space-y-6">
                 <Card>
                   <CardHeader>
                     <CardTitle className="text-lg">Where did this happen?</CardTitle>
                     <CardDescription>Provide as much location context as possible.</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-5">
                      <div className="flex bg-muted/50 p-1 rounded-lg">
                        <button type="button" onClick={() => setIndoorOutdoor("outdoor")} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${indoorOutdoor === 'outdoor' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Outdoor</button>
                        <button type="button" onClick={() => setIndoorOutdoor("indoor")} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${indoorOutdoor === 'indoor' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Indoor</button>
                      </div>

                      <LocationSelector 
                         city={formData.city} 
                         area={formData.area} 
                         onCityChange={c => setFormData(p => ({ ...p, city: c }))}
                         onAreaChange={a => setFormData(p => ({ ...p, area: a }))}
                         required
                      />

                      <div className="space-y-2">
                         <Label>Specific Address or Landmark</Label>
                         <Input 
                            placeholder="e.g. Near Central Park Gate 2, Next to Starbucks" 
                            value={formData.location} 
                            onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} 
                            required 
                         />
                         <p className="text-[11px] text-muted-foreground">Adding a landmark helps responders locate the area quickly.</p>
                      </div>
                   </CardContent>
                 </Card>

                 <div className="flex gap-4">
                   <Button type="button" variant="outline" className="w-1/3" onClick={() => setStep(1)}>Back</Button>
                   <Button type="submit" className="w-2/3 shadow-md" disabled={!formData.city || !formData.area || !formData.location}>
                     Continue to Details
                   </Button>
                 </div>
              </div>
            )}

            {/* STEP 3: NARRATIVE & DETAILS */}
            {step === 3 && (
              <div className="space-y-6">
                 <Card>
                   <CardHeader>
                     <CardTitle className="text-lg">Describe What Happened</CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-5">
                      <div className="space-y-3">
                         <Textarea 
                           rows={6}
                           className="resize-y"
                           placeholder="Example: I saw two men in dark hoodies running away from the convenience store towards Main St. One was carrying a black backpack..."
                           value={formData.description}
                           onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                           required
                         />
                         {/* Real-time description quality + severity analysis */}
                         <DescriptionAnalyzer
                           description={formData.description}
                           onSuspicionChange={(susp, reason) => {
                             setIsSuspiciousReport(susp);
                             setSuspiciousReason(reason);
                           }}
                           onSeverityChange={(sev) => setLocalSeverity(sev)}
                         />
                         {/* Server-side ML prediction badge (shown when available) */}
                         {mlPrediction && !mlPrediction.fallback && (
                           <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                             ML Model: {mlPrediction.severity} Severity
                           </Badge>
                         )}
                      </div>

                      {/* CONDITIONAL SECTIONS BASED ON CATEGORY */}
                      {formData.category === 'missing_item' && (
                        <div className="space-y-2 p-4 bg-muted/30 rounded-lg animate-in fade-in">
                          <Label>Missing Item Details</Label>
                          <Input placeholder="Type, color, brand, distinct features..." value={missingItemDetails} onChange={e => setMissingItemDetails(e.target.value)} />
                        </div>
                      )}

                      {formData.category === 'missing_person' && (
                        <div className="space-y-2 p-4 bg-muted/30 rounded-lg animate-in fade-in">
                          <Label>Missing Person Age & Description</Label>
                          <Input placeholder="Approximate age, clothing, height..." value={missingPersonAge} onChange={e => setMissingPersonAge(e.target.value)} />
                        </div>
                      )}

                      {formData.category === 'theft' && (
                        <div className="space-y-2 p-4 bg-muted/30 rounded-lg animate-in fade-in">
                          <Label>Stolen Goods Details</Label>
                          <Input placeholder="What was taken? Estimated value?" value={stolenItemDetails} onChange={e => setStolenItemDetails(e.target.value)} />
                        </div>
                      )}

                      {formData.category === 'unsafe_area' && (
                        <div className="space-y-2 p-4 bg-muted/30 rounded-lg animate-in fade-in">
                          <Label>Why does it feel unsafe?</Label>
                          <Input placeholder="Poor lighting, suspicious groups, lack of patrols..." value={unsafeReason} onChange={e => setUnsafeReason(e.target.value)} />
                        </div>
                      )}

                      {formData.category === 'harassment' && (
                        <div className="space-y-3 p-4 bg-muted/30 rounded-lg animate-in fade-in">
                           <label className="flex items-center gap-2 cursor-pointer">
                             <input type="checkbox" className="rounded accent-primary" checked={harassmentKnown} onChange={e => setHarassmentKnown(e.target.checked)} />
                             <span className="text-sm">Do you know the identity of the harasser?</span>
                           </label>
                        </div>
                      )}

                      {/* People Involved (Optional for all) */}
                      <div className="space-y-2 border-t pt-4">
                        <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Suspect / Vehicle Details (Optional)</Label>
                        <p className="text-xs text-muted-foreground">Number of people, gender, age, clothing, vehicle make/color, license plate.</p>
                        <Textarea 
                           rows={2}
                           placeholder="e.g. 1 male, approx 30s, red jacket, left in a white sedan."
                           value={formData.suspectDescription}
                           onChange={e => setFormData(p => ({ ...p, suspectDescription: e.target.value }))}
                        />
                      </div>
                   </CardContent>
                 </Card>

                 <div className="flex gap-4">
                   <Button type="button" variant="outline" className="w-1/3" onClick={() => setStep(2)}>Back</Button>
                   <Button type="submit" className="w-2/3 shadow-md" disabled={formData.description.length < 5}>
                     Continue to Final Step
                   </Button>
                 </div>
              </div>
            )}

            {/* STEP 4: URGENCY, EVIDENCE, SUBMISSION */}
            {step === 4 && (
              <div className="space-y-6">
                 <Card className="border-orange-500/30">
                   <CardHeader className="bg-orange-500/5">
                     <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" /> Danger Assessment</CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-4 pt-4">
                     <div className="grid sm:grid-cols-2 gap-3">
                        {[
                          { state: weaponPresent, setter: setWeaponPresent, label: "Was there a weapon?" },
                          { state: anyoneInjured, setter: setAnyoneInjured, label: "Was anyone injured?" },
                          { state: inDanger, setter: setInDanger, label: "Is anyone in danger?" },
                          { state: suspectNearby, setter: setSuspectNearby, label: "Is the suspect nearby?" },
                          { state: needsUrgentAttention, setter: setNeedsUrgentAttention, label: "Requires Urgent Response?" },
                          { state: isRecurring, setter: setIsRecurring, label: "Has this happened before?" },
                        ].map((item, idx) => (
                          <label key={idx} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${item.state ? 'bg-orange-500/10 border-orange-500/30' : 'hover:bg-muted/50'}`}>
                            <input 
                              type="checkbox" 
                              className="mt-0.5 h-4 w-4 rounded accent-orange-600" 
                              checked={item.state} 
                              onChange={e => item.setter(e.target.checked)} 
                            />
                            <span className="text-sm font-medium">{item.label}</span>
                          </label>
                        ))}
                     </div>
                   </CardContent>
                 </Card>

                 <Card>
                   <CardHeader>
                     <CardTitle className="text-lg">Evidence & Witnesses</CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-5">
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2"><Camera className="h-4 w-4" /> Upload Evidence (Optional)</Label>
                        <p className="text-xs text-muted-foreground">Photos, videos, or audio recordings help authorities respond faster and more accurately.</p>
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/30 transition-colors">
                           <Input 
                             type="file" 
                             multiple 
                             onChange={e => setEvidenceFiles(Array.from(e.target.files || []))} 
                             className="hidden" 
                             id="evidence-upload"
                           />
                           <label htmlFor="evidence-upload" className="cursor-pointer flex flex-col items-center gap-2">
                             <Upload className="h-8 w-8 text-muted-foreground" />
                             <span className="text-sm font-medium text-primary">Click to select files</span>
                             <span className="text-xs text-muted-foreground">{evidenceFiles.length} files selected</span>
                           </label>
                        </div>
                      </div>

                      <div className="space-y-3 border-t pt-4">
                         <label className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" className="rounded accent-primary" checked={witnessesPresent} onChange={e => setWitnessesPresent(e.target.checked)} />
                           <span className="text-sm font-medium">Were there witnesses?</span>
                         </label>
                         {witnessesPresent && (
                           <Input 
                             placeholder="Contact details of witnesses (if known)..." 
                             value={witnessDetails}
                             onChange={e => setWitnessDetails(e.target.value)}
                           />
                         )}
                      </div>
                   </CardContent>
                 </Card>

                 <div className="flex gap-4">
                   <Button type="button" variant="outline" className="w-1/3" onClick={() => setStep(3)}>Back</Button>
                   <Button 
                     type="submit" 
                     className={`w-2/3 shadow-lg font-bold ${needsUrgentAttention || weaponPresent ? 'bg-destructive hover:bg-destructive/90 text-white' : ''}`}
                     disabled={isSubmitting}
                   >
                     {isSubmitting ? "Submitting..." : (needsUrgentAttention ? "SEND EMERGENCY REPORT" : "Submit Official Report")}
                   </Button>
                 </div>
              </div>
            )}
          </form>
        )}
      </main>
    </div>
  );
};

export default Report;