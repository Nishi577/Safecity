import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Clock, ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { ROLE_LABELS } from "@/lib/roleValidation";

const PendingApproval = () => {
  const { user, signOut } = useAuth();
  const { role, isApproved, loading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    if (!loading && isApproved) {
      switch (role) {
        case 'admin': navigate("/admin"); break;
        case 'higher_officer': navigate("/higher-officer"); break;
        case 'field_police': navigate("/field-officer"); break;
        default: navigate("/dashboard");
      }
    }
  }, [user, isApproved, loading, role, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
          <Clock className="h-8 w-8" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Verification Pending</h1>
          <p className="text-muted-foreground">
            Your {role ? <span className="font-semibold text-foreground">{ROLE_LABELS[role]}</span> : 'official'} account is awaiting administrative approval.
          </p>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm text-sm text-muted-foreground leading-relaxed">
          Standard security protocols require manual verification of all official credentials. 
          You will be notified once your access is authorized.
        </div>

        <div className="flex flex-col gap-3">
          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
          <Link to="/" className="text-sm text-muted-foreground hover:underline inline-flex items-center justify-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Back to Home
          </Link>
        </div>

        <p className="text-xs text-muted-foreground/60">
          Logged in as: {user?.email}
        </p>
      </div>
    </div>
  );
};

export default PendingApproval;
