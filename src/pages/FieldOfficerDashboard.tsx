import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Shield, User, LogOut, FileText, Clock, CheckCircle2, 
  AlertTriangle, Calendar, Upload, MessageSquare, Bell,
  ChevronRight, Play, Pause, Check, MessageCircle, Eye, EyeOff, MapPin, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CaseChat from "@/components/CaseChat";
import LiveIncidentsModule from "@/components/LiveIncidentsModule";
import MissingItemManager from "@/components/MissingItemManager";
import AddAssetModal from "@/components/AddAssetModal";
import { SeverityBadge } from "@/components/DescriptionAnalyzer";

interface AssignedCase {
  id: string;
  category: string;
  description: string;
  urgency: string;
  status: string;
  created_at: string;
  deadline: string | null;
  priority_score: number | null;
  is_emergency: boolean;
  location_description: string | null;
  landmark: string | null;
  city: string | null;
  area: string | null;
  close_reason: string | null;
  ml_severity?: string | null;
  evidence_urls: string[] | null;
}

interface CaseUpdate {
  id: string;
  update_text: string;
  status_change: string | null;
  created_at: string;
  visible_to_citizen: boolean;
}

const FieldOfficerDashboard = () => {
  const { user, signOut } = useAuth();
  const { role, isApproved, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  
  const [cases, setCases] = useState<AssignedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<AssignedCase | null>(null);
  const [caseUpdates, setCaseUpdates] = useState<CaseUpdate[]>([]);
  
  // Update dialog
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [visibleToCitizen, setVisibleToCitizen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [refreshAssets, setRefreshAssets] = useState(0);

  useEffect(() => {
    if (!roleLoading && (!user || !isApproved || role !== 'field_police')) {
      navigate("/auth");
    }
  }, [user, role, isApproved, roleLoading, navigate]);

  useEffect(() => {
    if (user && role === 'field_police' && isApproved) {
      fetchAssignedCases();
    }
  }, [user, role, isApproved]);

  const fetchAssignedCases = async () => {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('assigned_officer_id', user?.id)
        .order('deadline', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error fetching cases:', error);
      toast.error('Failed to load assigned cases');
    } finally {
      setLoading(false);
    }
  };

  const fetchCaseUpdates = async (caseId: string) => {
    try {
      const { data, error } = await supabase
        .from('case_updates')
        .select('*')
        .eq('incident_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCaseUpdates(data || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleCaseSelect = (caseItem: AssignedCase) => {
    setSelectedCase(caseItem);
    fetchCaseUpdates(caseItem.id);
  };

  const handleUpdateCase = () => {
    if (!selectedCase) return;
    setNewStatus(selectedCase.status);
    setUpdateText("");
    setVisibleToCitizen(false);
    setUpdateDialogOpen(true);
  };

  const submitUpdate = async () => {
    if (!selectedCase || !updateText.trim()) {
      toast.error('Please enter an update');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('case_updates')
        .insert({
          incident_id: selectedCase.id,
          officer_id: user?.id,
          update_text: updateText,
          status_change: newStatus !== selectedCase.status ? newStatus : null,
          visible_to_citizen: visibleToCitizen,
        });

      if (updateError) throw updateError;

      if (newStatus !== selectedCase.status) {
        const updateData: any = { status: newStatus };
        if (newStatus === 'resolved') {
          updateData.resolved_at = new Date().toISOString();
        }
        await supabase.from('incidents').update(updateData).eq('id', selectedCase.id);
      }

      await supabase.from('audit_logs').insert({
        incident_id: selectedCase.id,
        actor_id: user?.id,
        action: 'daily_update',
        details: { update_text: updateText, status_change: newStatus !== selectedCase.status ? newStatus : null },
      });

      toast.success('Update submitted successfully');
      setUpdateDialogOpen(false);
      fetchAssignedCases();
      fetchCaseUpdates(selectedCase.id);
    } catch (error) {
      console.error('Error submitting update:', error);
      toast.error('Failed to submit update');
    }
  };

  const stats = {
    total: cases.length,
    inProgress: cases.filter(c => c.status === 'in_progress').length,
    resolved: cases.filter(c => c.status === 'resolved').length,
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SafeCity Officer</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium">{user?.email}</span>
              <span className="text-xs text-muted-foreground">Field Officer</span>
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
            <h1 className="text-3xl font-bold tracking-tight">Active Assignments</h1>
            <p className="text-muted-foreground">Manage your assigned cases and provide status updates.</p>
          </div>
          <Button 
            onClick={() => setAssetDialogOpen(true)} 
            className="bg-primary hover:bg-primary/90 text-white font-semibold flex items-center gap-2"
          >
            <Package className="h-5 w-5" />
            Add Asset
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Cases</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.inProgress}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.resolved}</div></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="assignments" className="space-y-6">
          <TabsList className="bg-muted/60 p-1 flex w-full max-w-lg h-auto text-sm">
            <TabsTrigger value="assignments" className="rounded-md flex-1">My Assignments</TabsTrigger>
            <TabsTrigger value="live" className="rounded-md flex-1 font-bold">Watch Map Dashboard</TabsTrigger>
            <TabsTrigger value="recovery" className="rounded-md flex-1 font-bold">Asset Recovery</TabsTrigger>
          </TabsList>

          <TabsContent value="recovery" className="animate-in fade-in duration-500">
              <MissingItemManager 
                key={`assets-${refreshAssets}`} 
                userRole="field_police" 
                userCity={null} 
              />
          </TabsContent>

          <TabsContent value="live" className="animate-in fade-in duration-500">
             <LiveIncidentsModule userRole="field_officer" />
          </TabsContent>

          <TabsContent value="assignments">
            <div className="grid lg:grid-cols-3 gap-8">
          {/* Cases List */}
          <div className="lg:col-span-1 border rounded-lg overflow-hidden bg-card">
            <div className="p-4 border-b bg-muted/50 font-semibold">Assignment Queue</div>
            {cases.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No active assignments</div>
            ) : (
              <div className="divide-y">
                {cases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    onClick={() => handleCaseSelect(caseItem)}
                    className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${selectedCase?.id === caseItem.id ? 'bg-accent' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                       <span className="font-medium text-sm">{caseItem.category}</span>
                       <Badge variant={caseItem.urgency === 'critical' || caseItem.urgency === 'high' ? 'destructive' : 'secondary'} className="text-[10px]">
                         {caseItem.urgency}
                       </Badge>
                     </div>
                     <p className="text-xs text-muted-foreground line-clamp-1">{caseItem.description}</p>
                     <div className="mt-2 flex items-center justify-between">
                       <span className="text-[10px] text-muted-foreground">ID: {caseItem.id.slice(0, 8)}</span>
                       {caseItem.ml_severity && <SeverityBadge severity={caseItem.ml_severity} size="sm" />}
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Case Details */}
          <div className="lg:col-span-2">
            {selectedCase ? (
              <Card>
                 <CardHeader>
                   <div className="flex justify-between items-start">
                     <div>
                       <CardTitle>{selectedCase.category}</CardTitle>
                       <CardDescription>Case reference: {selectedCase.id}</CardDescription>
                     </div>
                     <div className="flex items-center gap-2">
                       {selectedCase.ml_severity && <SeverityBadge severity={selectedCase.ml_severity} />}
                       <Badge variant="outline">{selectedCase.status.replace('_', ' ')}</Badge>
                     </div>
                   </div>
                 </CardHeader>
                <CardContent className="space-y-6">
                   {selectedCase.status === 'cancelled' && (
                     <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-md space-y-2 mb-4">
                       <h4 className="font-semibold text-sm flex items-center gap-2">
                         <AlertTriangle className="h-4 w-4" /> Case Withdrawn by Citizen
                       </h4>
                       <p className="text-sm">
                         <strong>Reason Given:</strong> {selectedCase.close_reason || "No reason provided."}
                       </p>
                     </div>
                   )}
                   <div className="space-y-2">
                     <h4 className="text-sm font-semibold">Incident Narrative</h4>
                     <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{selectedCase.description}</p>
                   </div>
                   
                   {selectedCase.evidence_urls && selectedCase.evidence_urls.length > 0 && (
                     <div className="space-y-3">
                       <h4 className="text-sm font-semibold flex items-center gap-2">
                         <Shield className="h-4 w-4 text-primary" /> Tactical Evidence ({selectedCase.evidence_urls.length})
                       </h4>
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                         {selectedCase.evidence_urls.map((url, i) => {
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
                                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-0 text-[10px]">View Detail</Badge>
                               </div>
                             </div>
                           );
                         })}
                       </div>
                     </div>
                   )}
                   
                   <div className="grid md:grid-cols-2 gap-4">
                     <div className="space-y-1">
                       <p className="text-xs text-muted-foreground">Location</p>
                       <p className="text-sm font-medium">{selectedCase.city || 'N/A'}, {selectedCase.area || 'N/A'}</p>
                     </div>
                     <div className="space-y-1">
                       <p className="text-xs text-muted-foreground">Reported On</p>
                       <p className="text-sm font-medium">{new Date(selectedCase.created_at).toLocaleString()}</p>
                     </div>
                   </div>

                   {['cancelled', 'resolved', 'closed', 'rejected'].includes(selectedCase.status) ? null : (
                     <div className="flex gap-4 border-t pt-6">
                       <Button onClick={handleUpdateCase}>Update Progress</Button>
                       <Button variant="outline" onClick={() => setShowChat(!showChat)}>
                         {showChat ? "Hide Chat" : "Open Comms"}
                       </Button>
                     </div>
                   )}

                   {showChat && !['cancelled', 'resolved', 'closed', 'rejected'].includes(selectedCase.status) && (
                     <div className="border rounded-md mt-4">
                       <CaseChat incidentId={selectedCase.id} isAssigned={true} />
                     </div>
                   )}

                   <div className="space-y-4 border-t pt-6">
                     <h4 className="text-sm font-semibold">Operational Logs</h4>
                     {caseUpdates.length === 0 ? (
                       <p className="text-xs text-muted-foreground italic">No tactical updates recorded yet.</p>
                     ) : (
                       <div className="space-y-3">
                         {caseUpdates.map(update => (
                           <div key={update.id} className="text-sm border-l-2 border-primary pl-3 py-1">
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
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center border rounded-lg border-dashed p-12 text-muted-foreground text-center">
                <div>
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Select a case from the queue to view tactical details.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  </main>

  <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tactical Log Entry</DialogTitle>
            <DialogDescription>Submit a status update for this case.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Phase Shift</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="awaiting_input">Awaiting Information</SelectItem>
                  <SelectItem value="resolved">Mission Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Report Details</Label>
              <Textarea
                placeholder="Log tactical findings..."
                value={updateText}
                onChange={e => setUpdateText(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
               <input 
                 type="checkbox" 
                 id="v-citizen"
                 checked={visibleToCitizen}
                 onChange={e => setVisibleToCitizen(e.target.checked)}
               />
               <Label htmlFor="v-citizen" className="text-xs">Visible to Citizen</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitUpdate}>Commit Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddAssetModal 
        open={assetDialogOpen} 
        onOpenChange={setAssetDialogOpen}
        onAssetAdded={() => {
          setRefreshAssets(prev => prev + 1);
          toast.success("Tactical asset added to jurisdiction queue");
        }}
      />
    </div>
  );
};

export default FieldOfficerDashboard;