import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Phone, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import type { AppRole } from "@/lib/roleValidation";
import LocationSelector from "@/components/LocationSelector";
import LegalTermsModal from "@/components/LegalTermsModal";
import { DESIGNATIONS, getRoleFromDesignation } from "@/lib/designationRoles";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SignupPath = "citizen" | "officer";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [signupPath, setSignupPath] = useState<SignupPath | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [badgeId, setBadgeId] = useState("");
  const [designation, setDesignation] = useState("");
  const [policeStation, setPoliceStation] = useState("");
  const [showTerms, setShowTerms] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const { role, isApproved, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !roleLoading) {
      if (!isApproved && role !== 'citizen') {
        navigate("/pending-approval");
      } else {
        switch (role) {
          case 'admin': navigate("/admin"); break;
          case 'higher_officer': navigate("/higher-officer"); break;
          case 'field_police': navigate("/field-officer"); break;
          default: navigate("/dashboard");
        }
      }
    }
  }, [user, role, isApproved, roleLoading, navigate]);

  const resetForm = () => {
    setEmail(""); setPassword(""); setConfirmPassword(""); setFullName(""); setPhone("");
    setCity(""); setArea(""); setBadgeId(""); setDesignation(""); setPoliceStation("");
  };

  const handleCitizenSignup = async () => {
    setIsSubmitting(true);
    try {
      if (!fullName.trim() || !city) { toast.error("Please fill required fields"); return; }
      await signUp(email, password, fullName, "citizen");
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) await supabase.from('profiles').update({ city, area, phone }).eq('user_id', newUser.id);
      toast.success("Account created successfully!");
    } catch (error: any) {
      toast.error(error.message || "Signup failed");
    } finally { setIsSubmitting(false); }
  };

  const handleOfficerSignup = async () => {
    setIsSubmitting(true);
    try {
      if (!fullName.trim() || !badgeId.trim() || !designation || !city || !area) { toast.error("Please fill all officer fields"); return; }
      const determinedRole: AppRole = getRoleFromDesignation(designation);
      await signUp(email, password, fullName, determinedRole, badgeId);
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) await supabase.from('profiles').update({ city, area }).eq('user_id', newUser.id);
      toast.success("Officer registration submitted!");
      navigate("/pending-approval");
    } catch (error: any) {
      toast.error(error.message || "Signup failed");
    } finally { setIsSubmitting(false); }
  };

  const handleTermsAccepted = async () => {
    setShowTerms(false);
    await handleCitizenSignup();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      setIsSubmitting(true);
      try { await signIn(email, password); } 
      catch (error: any) { toast.error(error.message || "Login failed"); } 
      finally { setIsSubmitting(false); }
      return;
    }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (signupPath === "citizen") setShowTerms(true);
    else if (signupPath === "officer") await handleOfficerSignup();
  };

  // Determine page title and subtitle
  const getPageTitle = () => {
    if (isLogin) return "Sign In";
    if (!signupPath) return "Create your account";
    if (signupPath === "citizen") return "Citizen Signup";
    return "Officer Signup";
  };

  const getPageSubtitle = () => {
    if (isLogin) return "Access your dashboard to manage reports";
    if (!signupPath) return "Choose how you'd like to join SafeCity";
    if (signupPath === "citizen") return "Report incidents and stay informed about safety in your area";
    return "Register with your official credentials for verification";
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left Panel - Form */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-12 bg-[#f8f9fa] overflow-y-auto relative w-full h-full min-h-screen">
        <div className="w-full max-w-md flex flex-col">
          {/* Back to Home */}
          <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12 w-fit">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          {/* SafeCity Logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-10 w-fit">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2d6a6a]/10">
              <Shield className="h-6 w-6 text-[#2d6a6a]" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#111827]">
              Safe<span className="text-[#2d6a6a]">City</span>
            </span>
          </Link>

          <div className="w-full">
            {/* Page Header */}
            <div className="mb-10">
              <h1 className="text-3xl font-extrabold text-[#111827] mb-2">{getPageTitle()}</h1>
              <p className="text-base text-[#4b5563] font-medium">{getPageSubtitle()}</p>
            </div>

          {/* Role Selection (Signup with no path chosen) */}
          {!isLogin && !signupPath ? (
            <div>
              <p className="text-sm font-medium mb-4">I am a:</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSignupPath("citizen")}
                  className="flex flex-col items-center gap-2 p-6 bg-white rounded-xl border-2 border-[#2d6a6a]/20 hover:border-[#2d6a6a]/50 transition-all shadow-sm hover:shadow-md"
                >
                  <User className="h-8 w-8 text-muted-foreground" />
                  <span className="font-semibold text-foreground">Citizen</span>
                  <span className="text-xs text-muted-foreground text-center">Report incidents & stay informed</span>
                </button>
                <button
                  onClick={() => setSignupPath("officer")}
                  className="flex flex-col items-center gap-2 p-6 bg-white rounded-xl border-2 border-[#2d6a6a]/20 hover:border-[#2d6a6a]/50 transition-all shadow-sm hover:shadow-md"
                >
                  <Shield className="h-8 w-8 text-[#2d6a6a]" />
                  <span className="font-semibold text-foreground">Officer</span>
                  <span className="text-xs text-muted-foreground text-center">Official law enforcement signup</span>
                </button>
              </div>

              <div className="mt-8 text-center text-sm">
                Already have an account?{" "}
                <button onClick={() => { setIsLogin(true); resetForm(); }} className="font-semibold text-[#2d6a6a] hover:underline">
                  Sign in
                </button>
              </div>
            </div>
          ) : (
            /* Login / Signup Forms */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Back to role selector */}
              {!isLogin && signupPath && (
                <button
                  type="button"
                  onClick={() => setSignupPath(null)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Choose a different path
                </button>
              )}

              {/* Full Name (signup only) */}
              {!isLogin && signupPath && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10 bg-white"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Officer-specific fields */}
              {!isLogin && signupPath === "officer" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Badge ID</Label>
                    <div className="relative">
                      <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-10 bg-white"
                        placeholder="e.g., OFF-2024-001"
                        value={badgeId}
                        onChange={e => setBadgeId(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Designation</Label>
                    <Select value={designation} onValueChange={setDesignation}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select your designation" />
                      </SelectTrigger>
                      <SelectContent>
                        {DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Police Station</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-10 bg-white"
                        placeholder="Enter your police station"
                        value={policeStation}
                        onChange={e => setPoliceStation(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              {isLogin ? (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10 bg-white"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : signupPath === "officer" ? (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Official Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10 bg-white"
                      type="email"
                      placeholder="Enter your official email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10 bg-white"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Citizen: Phone */}
              {!isLogin && signupPath === "citizen" && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10 bg-white"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Location (signup only) */}
              {!isLogin && signupPath && (
                <LocationSelector city={city} area={area} onCityChange={setCity} onAreaChange={setArea} required />
              )}

              {/* Password */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10 pr-10 bg-white"
                    type={showPassword ? "text" : "password"}
                    placeholder={isLogin ? "Enter your password" : "Create a password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (signup only) */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10 bg-white"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-[#2d6a6a] hover:bg-[#245858] text-white font-semibold rounded-full h-12"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Processing..."
                  : isLogin
                    ? "Sign In"
                    : signupPath === "officer"
                      ? "Register as Officer"
                      : "Register as Citizen"
                }
              </Button>

              {/* Switch between signup path */}
              {!isLogin && signupPath && (
                <div className="text-center text-sm">
                  <button
                    type="button"
                    onClick={() => setSignupPath(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Choose a different path
                  </button>
                </div>
              )}

              {/* Switch between login/signup */}
              <div className="text-center text-sm">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setSignupPath(null); resetForm(); }}
                  className="font-semibold text-[#2d6a6a] hover:underline"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </div>
            </form>
          )}
          </div>
        </div>
      </div>

      {/* Right Panel - Dark Teal Gradient */}
      <div className="hidden md:flex flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a3a4a 0%, #0f2830 40%, #0a1f28 100%)"
        }}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: "24px 24px"
          }}
        />

        {/* Floating orbs */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-[#2d6a6a]/10 blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-48 h-48 rounded-full bg-[#2d6a6a]/5 blur-3xl" />

        <div className="relative z-10 text-center max-w-md">
          {/* Shield Icon */}
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#2d6a6a]/20 backdrop-blur-sm">
            <Shield className="h-10 w-10 text-[#4db8b8]" />
          </div>

          <h2 className="text-3xl font-bold text-white mb-4">
            A Safer City Starts With You
          </h2>
          <p className="text-base text-white/60 leading-relaxed">
            Report incidents securely, track case progress, and receive real-time safety alerts in your area.
          </p>
        </div>
      </div>

      <LegalTermsModal open={showTerms} onAccept={handleTermsAccepted} onCancel={() => setShowTerms(false)} />
    </div>
  );
};

export default Auth;
