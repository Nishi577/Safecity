import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Shield, User, LogOut, FileText, Users, AlertTriangle, 
  Clock, CheckCircle2, BarChart3, Search, Filter, 
  ChevronDown, Eye, UserPlus, Calendar, Bell,
  TrendingUp, AlertCircle, Briefcase, Map, Brain, Siren, Package, PieChart, MapPin, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import IncidentHeatmap from "@/components/IncidentHeatmap";
import MLInsightsPanel from "@/components/MLInsightsPanel";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import { IS_DEMO_MODE, DEMO_INCIDENTS } from "@/lib/demoData";
import LiveIncidentsModule from "@/components/LiveIncidentsModule";
import MissingItemManager from "@/components/MissingItemManager";
import AddAssetModal from "@/components/AddAssetModal";
import { SeverityBadge } from "@/components/DescriptionAnalyzer";

interface Incident {
  id: string;
  category: string;
  description: string;
  urgency: string;
  status: string;
  created_at: string;
  citizen_id: string;
  priority_score: number | null;
  ml_priority_suggestion: string | null;
  assigned_officer_id: string | null;
  deadline: string | null;
  is_emergency: boolean;
  city: string | null;
  area: string | null;
  evidence_urls: string[] | null;
  close_reason: string | null;
  ml_severity?: string | null;
}

interface FieldOfficer {
  id: string;
  full_name: string;
  email: string;
  city: string | null;
  area: string | null;
}

const HigherOfficerDashboard = () => {
  const { user, signOut } = useAuth();
  const { role, isApproved, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [sosReports, setSOSReports] = useState<any[]>([]);
  const [officers, setOfficers] = useState<FieldOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [jurisdictionCity, setJurisdictionCity] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("cases");
  
  // Assignment dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // View updates dialog
  const [viewUpdatesOpen, setViewUpdatesOpen] = useState(false);
  const [viewingIncident, setViewingIncident] = useState<Incident | null>(null);
  const [incidentUpdates, setIncidentUpdates] = useState<any[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  // Close/reject case dialog
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closingIncident, setClosingIncident] = useState<Incident | null>(null);
  const [closeAction, setCloseAction] = useState<"closed" | "rejected">("closed");
  const [closeReason, setCloseReason] = useState("");
  const [closing, setClosing] = useState(false);

  // Raise Alert State
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertForm, setAlertForm] = useState({
    title: "",
    type: "Suspicious Activity",
    area: "",
    severity: "medium",
    duration: "12h",
    scope: "both",
    description: "",
  });
  const [alertSubmitting, setAlertSubmitting] = useState(false);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [refreshAssets, setRefreshAssets] = useState(0);

  useEffect(() => {
    if (!roleLoading && (!user || !isApproved || role !== 'higher_officer')) {
      navigate("/auth");
    }
  }, [user, role, isApproved, roleLoading, navigate]);

  useEffect(() => {
    if (user && role === 'higher_officer' && isApproved) {
      fetchIncidents();
      fetchFieldOfficers();
      fetchSOSReports();
    }
  }, [user, role, isApproved]);

  const fetchIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      let records = data || [];
      if (IS_DEMO_MODE) {
        records = [...records, ...(DEMO_INCIDENTS as any)];
      }
      setIncidents(records);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const fetchSOSReports = async () => {
    try {
      if (!user?.id) return;
      const { data } = await supabase
        .from('incidents')
        .select('*')
        .eq('is_emergency', true)
        // If it's explicitly assigned to them OR it fell through jurisdiction mapping routing (is null)
        .or(`assigned_higher_officer_id.eq.${user.id},assigned_higher_officer_id.is.null`)
        .order('created_at', { ascending: false });
      setSOSReports(data || []);
    } catch (error) { console.error(error); }
  };


  const fetchFieldOfficers = async () => {
    try {
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('city, area')
        .eq('user_id', user?.id)
        .single();

      if (myProfile?.city) {
        setJurisdictionCity(myProfile.city);
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'field_police')
        .eq('is_approved', true);

      if (roleError) throw roleError;

      if (roleData && roleData.length > 0) {
        const userIds = roleData.map(r => r.user_id);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name, city, area')
          .in('user_id', userIds);

        if (profileError) throw profileError;

        const filteredOfficers = profileData?.filter(p => 
          (!myProfile?.city || !p.city || p.city === myProfile.city) &&
          (!myProfile?.area || !p.area || p.area === myProfile.area)
        ) || [];

        setOfficers(filteredOfficers.map(p => ({
          id: p.user_id,
          full_name: p.full_name || 'Unknown',
          email: '',
          city: p.city,
          area: p.area,
        })));
      }
    } catch (error) {
      console.error('Error fetching officers:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleAssign = (incident: Incident) => {
    setSelectedIncident(incident);
    setSelectedOfficer(incident.assigned_officer_id || "");
    setDeadline(incident.deadline ? incident.deadline.split('T')[0] : "");
    setAssignDialogOpen(true);
  };

  const handleViewUpdates = async (incident: Incident) => {
    setViewingIncident(incident);
    setViewUpdatesOpen(true);
    setLoadingUpdates(true);
    try {
      const { data, error } = await supabase
        .from('case_updates')
        .select('*')
        .eq('incident_id', incident.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setIncidentUpdates(data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load updates');
    } finally {
      setLoadingUpdates(false);
    }
  };

  const handleOpenClose = (incident: Incident, action: "closed" | "rejected") => {
    setClosingIncident(incident);
    setCloseAction(action);
    setCloseReason("");
    setCloseDialogOpen(true);
  };

  const submitClose = async () => {
    if (!closingIncident || !closeReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    setClosing(true);
    try {
      const { error } = await supabase
        .from('incidents')
        .update({
          status: closeAction,
          close_reason: closeReason,
          closed_by: user?.id,
          closed_at: new Date().toISOString(),
        })
        .eq('id', closingIncident.id);
      if (error) throw error;
      toast.success(`Case ${closeAction === "closed" ? "closed" : "rejected"} successfully`);
      setCloseDialogOpen(false);
      fetchIncidents();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update case");
    } finally {
      setClosing(false);
    }
  };

  const submitAssignment = async () => {
    if (!selectedIncident || !selectedOfficer) {
      toast.error('Please select an officer');
      return;
    }

    try {
      const { error } = await supabase
        .from('incidents')
        .update({
          assigned_officer_id: selectedOfficer,
          assigned_by: user?.id,
          assigned_at: new Date().toISOString(),
          deadline: deadline ? new Date(deadline).toISOString() : null,
          status: 'assigned',
        })
        .eq('id', selectedIncident.id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        incident_id: selectedIncident.id,
        actor_id: user?.id,
        action: 'case_assigned',
        details: { officer_id: selectedOfficer, deadline, notes },
      });

      toast.success('Case assigned successfully');
      setAssignDialogOpen(false);
      fetchIncidents();
    } catch (error) {
      console.error('Error assigning case:', error);
      toast.error('Failed to assign case');
    }
  };

  const updatePriority = async (incidentId: string, priority: number) => {
    try {
      const { error } = await supabase
        .from('incidents')
        .update({ priority_score: priority })
        .eq('id', incidentId);

      if (error) throw error;
      toast.success('Priority updated');
      fetchIncidents();
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const filteredIncidents = incidents
    .filter(incident => {
      const matchesSearch = incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           incident.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
      const matchesUrgency = urgencyFilter === 'all' || incident.urgency === urgencyFilter;
      const matchesSeverity = severityFilter === 'all' ||
        (incident.ml_severity?.toUpperCase() === severityFilter.toUpperCase());
      return matchesSearch && matchesStatus && matchesUrgency && matchesSeverity;
    })
    .sort((a, b) => {
      // Sort by severity priority when a severity filter is active
      const ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      const aS = ORDER[(a.ml_severity || a.urgency)?.toLowerCase()] ?? 4;
      const bS = ORDER[(b.ml_severity || b.urgency)?.toLowerCase()] ?? 4;
      return aS - bS;
    });

  const stats = {
    total: incidents.length,
    pending: incidents.filter(i => i.status === 'pending').length,
    assigned: incidents.filter(i => i.status === 'assigned').length,
    inProgress: incidents.filter(i => i.status === 'in_progress').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    emergency: incidents.filter(i => i.is_emergency).length,
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      assigned: "bg-blue-100 text-blue-800 border-blue-200",
      in_progress: "bg-indigo-100 text-indigo-800 border-indigo-200",
      resolved: "bg-green-100 text-green-800 border-green-200",
      closed: "bg-gray-100 text-gray-800 border-gray-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };
    return styles[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getUrgencyBadge = (urgency: string) => {
    const styles: Record<string, string> = {
      low: "bg-gray-100 text-gray-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };
    return styles[urgency] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SafeCity Control</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium">{user?.email}</span>
              <span className="text-xs text-muted-foreground">Higher Officer</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Executive Control</h1>
            <p className="text-muted-foreground">Jurisdiction: {jurisdictionCity || 'Regional Oversight'}</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => setAssetDialogOpen(true)} 
              className="border-primary/30 hover:border-primary/60 bg-muted/20 flex items-center gap-2 font-semibold"
            >
              <Package className="h-5 w-5 text-primary" />
              Add Asset
            </Button>
            <Button 
              onClick={() => setAlertOpen(true)} 
              className="bg-destructive hover:bg-destructive/90 text-white shadow-sm font-semibold flex items-center gap-2"
            >
              <Siren className="h-5 w-5" />
              Raise Alert
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-8">
          {[
            { label: "Total Cases", value: stats.total, icon: FileText, color: "text-gray-500" },
            { label: "Awaiting", value: stats.pending, icon: Clock, color: "text-yellow-500" },
            { label: "Assigned", value: stats.assigned, icon: UserPlus, color: "text-blue-500" },
            { label: "Active Ops", value: stats.inProgress, icon: Briefcase, color: "text-indigo-500" },
            { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "text-green-500" },
            { label: "SOS Alerts", value: stats.emergency, icon: AlertTriangle, color: "text-red-500" },
          ].map((stat, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/80 flex overflow-x-auto w-full max-w-full">
            <TabsTrigger value="cases">Jurisdiction Cases</TabsTrigger>
            <TabsTrigger value="live" className="text-primary font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Live Operations</TabsTrigger>
            <TabsTrigger value="sos">SOS Feed</TabsTrigger>
            <TabsTrigger value="missing">Asset Recovery</TabsTrigger>
            <TabsTrigger value="heatmap">Deployment Map</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="ml-insights">Intelligence</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <LiveIncidentsModule userRole="higher_officer" jurisdictionCity={jurisdictionCity} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Case Management</CardTitle>
                <CardDescription>Assign resources and oversee response efforts.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search descriptions, categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue placeholder="All Severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">🔴 Critical</SelectItem>
                      <SelectItem value="high">🟠 High</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="low">🟢 Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Urgency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIncidents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No matching incident records found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredIncidents.map((incident) => (
                          <TableRow key={incident.id}>
                            <TableCell className="font-mono text-xs">{incident.id.slice(0, 8)}</TableCell>
                            <TableCell className="font-medium">{incident.category}</TableCell>
                            <TableCell>
                              <SeverityBadge severity={incident.ml_severity || incident.urgency} size="sm" />
                            </TableCell>
                            <TableCell>
                              <Badge className={getUrgencyBadge(incident.urgency)} variant="secondary">
                                {incident.urgency}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusBadge(incident.status)} variant="outline">
                                {incident.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={incident.priority_score?.toString() || "0"}
                                onValueChange={(v) => updatePriority(incident.id, parseInt(v))}
                              >
                                <SelectTrigger className="w-20 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5].map(p => (
                                    <SelectItem key={p} value={p.toString()}>P{p}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleViewUpdates(incident)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleAssign(incident)}
                                >
                                  {incident.assigned_officer_id ? "Reassign" : "Assign"}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sos">
            <Card>
              <CardHeader>
                <CardTitle>Emergency Feed</CardTitle>
                <CardDescription>Live SOS reports requiring immediate coordination.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sosReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No active SOS alerts in your jurisdiction or the global queue.</TableCell>
                        </TableRow>
                      ) : sosReports.map((sos) => (
                        <TableRow key={sos.id} className="bg-red-50/50">
                          <TableCell><Badge variant="destructive" className="animate-pulse">{sos.category || 'SOS EMERGENCY'}</Badge></TableCell>
                          <TableCell>
                            <SeverityBadge severity={sos.ml_severity || "critical"} size="sm" />
                          </TableCell>
                          <TableCell className="text-sm">
                             <span className="font-semibold block">{sos.area || "Area Unknown"}</span>
                             <span className="text-xs text-muted-foreground">{sos.city || "City Unknown"}</span>
                          </TableCell>
                          <TableCell className="text-sm">
                             <span className="block">{new Date(sos.created_at).toLocaleTimeString()}</span>
                             <span className="text-xs font-mono text-muted-foreground mt-0.5">{new Date(sos.created_at).toLocaleDateString()}</span>
                          </TableCell>
                          <TableCell>
                             <div className="flex flex-col items-start gap-1">
                               <Badge variant={sos.status === 'pending' ? 'destructive' : 'outline'} className="shadow-sm">
                                 {sos.status === 'pending' ? 'Unassigned' : sos.status.replace('_', ' ')}
                               </Badge>
                               <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                 {(sos.assigned_higher_officer_id === user?.id) ? "Routed to You" : "Global Queue"}
                               </span>
                             </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="heatmap">
            <Card>
              <CardHeader>
                <CardTitle>Deployment Heatmap</CardTitle>
                <CardDescription>Jurisdictional overview of incident density.</CardDescription>
              </CardHeader>
              <CardContent>
                <IncidentHeatmap jurisdictionCity={jurisdictionCity} isPublicView={false} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="missing">
            <Card>
              <CardHeader>
                <CardTitle>Asset Recovery Registry</CardTitle>
                <CardDescription>Monitor lost and found property reports.</CardDescription>
              </CardHeader>
              <CardContent>
                <MissingItemManager 
                key={`assets-${refreshAssets}`} 
                userRole="higher_officer" 
                userCity={jurisdictionCity} 
              />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsCharts incidents={incidents} />
          </TabsContent>

          <TabsContent value="ml-insights">
            <MLInsightsPanel />
          </TabsContent>
        </Tabs>
      </main>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Case Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Designated Field Officer</Label>
              <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
                <SelectTrigger><SelectValue placeholder="Identify responder" /></SelectTrigger>
                <SelectContent>
                  {officers.map(off => (
                    <SelectItem key={off.id} value={off.id}>{off.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Deadline</Label>
              <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitAssignment}>Confirm Mission</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Updates / Incident Details Dialog */}
      <Dialog open={viewUpdatesOpen} onOpenChange={setViewUpdatesOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Case Details & Updates</DialogTitle>
            <DialogDescription>Reference: {viewingIncident?.id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Severity + Suspicious info block */}
            {(viewingIncident?.ml_severity || (viewingIncident as any)?.is_suspicious_report) && (
              <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/40 rounded-md border border-border/50">
                {viewingIncident?.ml_severity && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">AI Severity:</span>
                    <SeverityBadge severity={viewingIncident.ml_severity} />
                  </div>
                )}
                {(viewingIncident as any)?.is_suspicious_report && (
                  <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-2.5 py-1 text-xs font-semibold">
                    <AlertTriangle className="h-3 w-3" />
                    Flagged as Suspicious Report
                  </div>
                )}
              </div>
            )}
            {viewingIncident?.status === 'cancelled' && (
               <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-md space-y-2">
                 <h4 className="font-semibold text-sm flex items-center gap-2">
                   <AlertTriangle className="h-4 w-4" /> Case Withdrawn by Citizen
                 </h4>
                 <p className="text-sm">
                   <strong>Reason Given:</strong> {viewingIncident.close_reason || "No reason provided."}
                 </p>
               </div>
            )}
            
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Incident Narrative</h4>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{viewingIncident?.description}</p>
            </div>

            {viewingIncident?.evidence_urls && viewingIncident.evidence_urls.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Case Evidence ({viewingIncident.evidence_urls.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {viewingIncident.evidence_urls.map((url, i) => {
                    const isImg = url.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                    const isVideo = url.match(/\.(mp4|mov|webm)$/i);
                    return (
                      <div key={i} className="group relative aspect-square bg-muted rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-all cursor-pointer" onClick={() => window.open(url, '_blank')}>
                        {isImg ? (
                          <img src={url} alt="Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : isVideo ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white">
                             <Play className="h-8 w-8 mb-1" />
                             <span className="text-[10px] font-mono">VIDEO</span>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center">
                             <FileText className="h-8 w-8 text-muted-foreground mb-1" />
                             <span className="text-[10px] font-mono text-muted-foreground">DOCUMENT</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <Badge className="bg-white/20 backdrop-blur-sm text-white border-0 text-[10px]">View Full Intel</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Operational Logs</h4>
              {loadingUpdates ? (
                <div className="text-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" /></div>
              ) : incidentUpdates.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No tactical updates recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {incidentUpdates.map(update => (
                    <div key={update.id} className="text-sm border-l-2 border-primary pl-3 py-1 bg-muted/30 rounded-r-md">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>{new Date(update.created_at).toLocaleString()}</span>
                        <span>{update.visible_to_citizen ? "Public" : "Internal"}</span>
                      </div>
                      <p>{update.update_text}</p>
                      {update.status_change && <Badge variant="secondary" className="mt-1 text-[10px]">Status: {update.status_change}</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewUpdatesOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Raise Alert Dialog */}
      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4 mb-2">
            <DialogTitle className="text-xl flex items-center gap-2 text-destructive"><Siren className="h-6 w-6" /> Issue Public Safety Alert</DialogTitle>
            <DialogDescription>Broadcast an urgent notification prioritizing safety across specific municipal sectors.</DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-8 py-2">
            {/* LEFT: FORM */}
            <div className="space-y-5 border-r pr-6">
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Quick Templates</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted font-normal" onClick={() => setAlertForm({...alertForm, title: "Avoid Area Due to Activity", description: "Please avoid this area due to ongoing criminal activity. Law enforcement is currently active on scene."})}>Avoid Area</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted font-normal" onClick={() => setAlertForm({...alertForm, title: "Traffic Diversion", description: "Expect heavy delays. Please use alternate routes until further notice."})}>Traffic Diversion</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted font-normal" onClick={() => setAlertForm({...alertForm, title: "Emergency Situation", severity: "critical", description: "Immediate threat to public safety. Seek shelter and await further instructions from authorities."})}>Emergency Ops</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Alert Title</Label>
                <Input value={alertForm.title} onChange={e => setAlertForm({...alertForm, title: e.target.value})} placeholder="e.g. Active Suspect in Downtown" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Incident Type</Label>
                  <Select value={alertForm.type} onValueChange={(v) => setAlertForm({...alertForm, type: v})}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Theft", "Violence", "Harassment", "Missing Person", "Suspicious Activity", "Traffic Issue", "Unsafe Area", "Emergency", "Weather Hazard", "Other"].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity Level</Label>
                  <Select value={alertForm.severity} onValueChange={(v) => setAlertForm({...alertForm, severity: v})}>
                    <SelectTrigger className="bg-background capitalize"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Notice)</SelectItem>
                      <SelectItem value="medium">Medium (Warning)</SelectItem>
                      <SelectItem value="high">High (Danger)</SelectItem>
                      <SelectItem value="critical">Critical (Severe)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target Area</Label>
                <Input value={alertForm.area} onChange={e => setAlertForm({...alertForm, area: e.target.value})} placeholder="Search area name or type 'Entire City'..." />
                <p className="text-[10px] text-muted-foreground leading-tight">Separate multiple tracking zones with commas.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Active Duration</Label>
                  <Select value={alertForm.duration} onValueChange={(v) => setAlertForm({...alertForm, duration: v})}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 Hour (Immediate)</SelectItem>
                      <SelectItem value="6h">6 Hours</SelectItem>
                      <SelectItem value="12h">12 Hours</SelectItem>
                      <SelectItem value="24h">24 Hours</SelectItem>
                      <SelectItem value="manual">Until Manually Cleared</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Audience Scope</Label>
                  <Select value={alertForm.scope} onValueChange={(v) => setAlertForm({...alertForm, scope: v})}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Citizens & Field Assets</SelectItem>
                      <SelectItem value="citizens">Citizens Only</SelectItem>
                      <SelectItem value="officers">Field Officers Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notification Broadcast Format</Label>
                 <Textarea 
                   rows={3} 
                   value={alertForm.description} 
                   onChange={e => setAlertForm({...alertForm, description: e.target.value})}
                   placeholder="Clear, actionable instructions for the public..." 
                 />
                 <p className="text-[10px] text-muted-foreground leading-tight text-right">
                   {alertForm.description.length} / 250 characters max
                 </p>
              </div>
            </div>

            {/* RIGHT: PREVIEW */}
            <div className="flex flex-col justify-between">
              <div className="space-y-4">
                <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Device Broadcast Preview</Label>
                <Card className="shadow-lg border border-l-4 overflow-hidden" style={{
                  borderLeftColor: alertForm.severity === 'critical' ? '#dc2626' : alertForm.severity === 'high' ? '#ea580c' : alertForm.severity === 'medium' ? '#d97706' : '#10b981'
                }}>
                  <div className={`h-1.5 w-full ${alertForm.severity === 'critical' ? 'bg-red-600 animate-pulse' : alertForm.severity === 'high' ? 'bg-orange-500' : alertForm.severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <CardHeader className="pb-3 bg-muted/30">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${alertForm.severity === 'critical' ? 'text-red-600' : alertForm.severity === 'high' ? 'text-orange-500' : alertForm.severity === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`} />
                        <CardTitle className="text-sm font-bold uppercase tracking-wide leading-tight mt-0.5">
                          {alertForm.title || "Subject Headline Goes Here"}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className={`uppercase text-[9px] tracking-widest font-bold ${
                        alertForm.severity === 'critical' ? "bg-red-100 text-red-800 border-red-200" : 
                        alertForm.severity === 'high' ? "bg-orange-100 text-orange-800 border-orange-200" : 
                        alertForm.severity === 'medium' ? "bg-amber-100 text-amber-800 border-amber-200" : 
                        "bg-emerald-100 text-emerald-800 border-emerald-200"
                      }`}>{alertForm.severity}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 pb-5 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground border-b pb-2">
                       <MapPin className="h-3.5 w-3.5" /> 
                       <span>{alertForm.area || "Area Not Specified"}</span> 
                       <span className="opacity-50">•</span> 
                       <span>{alertForm.type}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">
                      "{alertForm.description || "The notification body summarizing the instructions or intelligence will be displayed here securely."}"
                    </p>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground bg-muted/40 p-2 rounded-md font-mono">
                       <span>Valid: {new Date().toLocaleTimeString()}</span>
                       <span>TTL: {alertForm.duration === 'manual' ? 'MANUAL EXPIRY' : alertForm.duration.toUpperCase()}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="pt-6 relative">
                <Button 
                  className="w-full bg-destructive hover:bg-destructive/90 text-white font-bold h-14 text-sm tracking-wide shadow-lg flex items-center gap-2 transition-all active:scale-[0.98]"
                  onClick={async () => {
                    setAlertSubmitting(true);
                    try {
                      const { error } = await supabase
                        .from('alerts' as any)
                        .insert({
                          higher_officer_id: user?.id,
                          title: alertForm.title,
                          type: alertForm.type,
                          area: alertForm.area,
                          severity: alertForm.severity,
                          description: alertForm.description,
                          scope: alertForm.scope,
                          duration: alertForm.duration,
                          expires_at: alertForm.duration === 'manual' ? null : new Date(Date.now() + parseInt(alertForm.duration) * 3600000).toISOString(),
                        });

                      if (error) throw error;

                      toast.success("Public Safety Alert established and broadcasted across zones successfully.", { position: "top-center" });
                      setAlertForm({title: "", type: "Suspicious Activity", area: "", severity: "medium", duration: "12h", scope: "both", description: ""});
                      setAlertOpen(false);
                    } catch (e) {
                      console.error('Error broadcasting alert:', e);
                      toast.error("Failed to broadcast alert. Please check your credentials.");
                    } finally {
                      setAlertSubmitting(false);
                    }
                  }}
                  disabled={alertSubmitting || !alertForm.title || !alertForm.description}
                >
                  {alertSubmitting ? (
                    <div className="flex items-center gap-2">
                       <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"/>
                       <span>BROADCASTING TO NETWORK...</span>
                    </div>
                  ) : (
                    <>
                      <Siren className="h-4 w-4" />
                      AUTHORIZE & TRANSMIT ALERT
                    </>
                  )}
                </Button>
                <div className="text-center space-y-1 mt-3">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Authorizing Protocol Triggers Mandatory Push Delivery.
                  </p>
                  <p className="text-[9px] text-muted-foreground/70">
                    Use exclusively for emergency coordination and unverified risk notifications.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddAssetModal 
        open={assetDialogOpen} 
        onOpenChange={setAssetDialogOpen}
        onAssetAdded={() => {
          setRefreshAssets(prev => prev + 1);
          toast.success("Intelligence registry updated");
        }}
      />
    </div>
  );
};

export default HigherOfficerDashboard;