import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, FileText, Bell, Clock, Plus, LogOut, User, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import CaseTracker from "@/components/CaseTracker";
import IncidentHeatmap from "@/components/IncidentHeatmap";
import SafetyAlerts from "@/components/SafetyAlerts";
import LiveIncidentsModule from "@/components/LiveIncidentsModule";
import EmergencyBanner from "@/components/EmergencyBanner";

interface Incident {
  id: string;
  category: string;
  description: string;
  status: string;
  urgency: string;
  created_at: string;
  is_emergency: boolean;
  city: string | null;
  area: string | null;
  location_description: string | null;
  assigned_officer_id: string | null;
  deadline: string | null;
}

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchIncidents();
    }
  }, [user]);

  const fetchIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('citizen_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoadingIncidents(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  const stats = {
    total: incidents.length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    inProgress: incidents.filter(i => ['pending', 'assigned', 'in_progress'].includes(i.status)).length,
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SafeCity</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium">{user.email}</span>
              <span className="text-xs text-muted-foreground">Citizen Dashboard</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Emergency Banner */}
      <EmergencyBanner />

      <main className="container px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back. Here's an overview of your reports and active alerts.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Link to="/report">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Report</CardTitle>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">Submit a new incident report</div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/report?emergency=true">
            <Card className="hover:bg-destructive/10 transition-colors border-destructive/20 cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-destructive">Emergency SOS</CardTitle>
                <Shield className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">Report a critical emergency</div>
              </CardContent>
            </Card>
          </Link>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">3 new alerts in your area</div>
            </CardContent>
          </Card>
          <Link to="/report-missing-item">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Asset Recovery</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">Report lost or stolen property</div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resolved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Cases and Safety Map */}
        <Tabs defaultValue="cases" className="space-y-4">
          <TabsList className="bg-muted/60 p-1 rounded-xl flex overflow-x-auto max-w-full sm:max-w-[500px] h-auto text-sm">
            <TabsTrigger value="cases" className="rounded-lg">My Reports</TabsTrigger>
            <TabsTrigger value="live-incidents" className="rounded-lg text-primary data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md font-bold transition-all"><Activity className="w-3.5 h-3.5 mr-1.5 hidden sm:inline"/> Live Incidents</TabsTrigger>
            <TabsTrigger value="alerts" className="rounded-lg">Alerts</TabsTrigger>
            <TabsTrigger value="safety-map" className="rounded-lg">Safety Map</TabsTrigger>
          </TabsList>

          <TabsContent value="live-incidents" className="pt-2">
            <LiveIncidentsModule userRole="citizen" />
          </TabsContent>

          <TabsContent value="cases" className="space-y-4 pt-2">
            <Card>
              <CardHeader>
                <CardTitle>Case History</CardTitle>
                <CardDescription>Track the status of your submitted reports.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingIncidents ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : incidents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No reports found. Submit a new report to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {incidents.map((incident) => (
                      <CaseTracker key={incident.id} incident={incident} onRefresh={fetchIncidents} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Safety Alerts</CardTitle>
                <CardDescription>Real-time notifications about incidents in your area.</CardDescription>
              </CardHeader>
              <CardContent>
                <SafetyAlerts />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="safety-map" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Safety Map</CardTitle>
                <CardDescription>Explore incident patterns in your community.</CardDescription>
              </CardHeader>
              <CardContent>
                <IncidentHeatmap isPublicView={true} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;