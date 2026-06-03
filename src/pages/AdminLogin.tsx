import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Lock, Mail, Eye, EyeOff, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminLogin = () => {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      checkAndRedirect(user.id);
    }
  }, [user, loading]);

  const checkAndRedirect = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role, is_approved")
      .eq("user_id", userId)
      .single();

    if (data?.role === "admin" && data?.is_approved) {
      navigate("/admin");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.toLowerCase().endsWith("@admincity.com")) {
      setError("Only @admincity.com email addresses are allowed.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email, password);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Login failed");

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, is_approved")
        .eq("user_id", currentUser.id)
        .single();

      if (roleData?.role !== "admin" || !roleData?.is_approved) {
        await supabase.auth.signOut();
        setError("This account does not have admin privileges.");
        return;
      }

      toast.success("Welcome, Admin!");
      navigate("/admin");
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left Panel - Form */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-12 bg-[#f8f9fa] overflow-y-auto relative w-full h-full min-h-screen">
        <div className="w-full max-w-md flex flex-col">
          {/* Back to Standard Auth */}
          <Link to="/auth" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12 w-fit">
            <ArrowLeft className="h-4 w-4" />
            Standard Authentication
          </Link>

          {/* SafeCity Logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-10 w-fit">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2d6a6a]/10">
              <Shield className="h-6 w-6 text-[#2d6a6a]" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#111827]">
              SafeCity <span className="text-[#2d6a6a]">Admin</span>
            </span>
          </Link>

          <div className="w-full">
            <div className="mb-10">
              <h1 className="text-3xl font-extrabold text-[#111827] mb-2">Control Panel</h1>
              <p className="text-base text-[#4b5563] font-medium">Authorized Personnel Only</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Admin Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@admincity.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">Security Key</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white"
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

              {error && (
                <div className="p-3 text-sm bg-destructive/10 text-destructive border-destructive/20 border rounded flex gap-2 items-center">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-[#2d6a6a] hover:bg-[#245858] text-white font-semibold rounded-full h-12 mt-4" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Verifying..." : "Sign In"}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Panel - Dark Teal Gradient */}
      <div className="hidden md:flex flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a3a4a 0%, #0f2830 40%, #0a1f28 100%)"
        }}
      >
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: "24px 24px"
          }}
        />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-[#2d6a6a]/10 blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-48 h-48 rounded-full bg-[#2d6a6a]/5 blur-3xl" />

        <div className="relative z-10 text-center max-w-md">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#2d6a6a]/20 backdrop-blur-sm">
            <Shield className="h-10 w-10 text-[#4db8b8]" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Command Center
          </h2>
          <p className="text-base text-white/60 leading-relaxed">
            Manage infrastructure, monitor platform activity, and oversee SafeCity operations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;