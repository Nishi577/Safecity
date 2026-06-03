import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Shield, User, LogOut, Users, CheckCircle2, XCircle, 
  Clock, Settings, Activity, FileText, Bell, Eye,
  UserCheck, UserX, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/roleValidation";
import type { AppRole } from "@/lib/roleValidation";
import OfficerRegistryManager from "@/components/OfficerRegistryManager";
import LiveIncidentsModule from "@/components/LiveIncidentsModule";
import JurisdictionMappingManager from "@/components/JurisdictionMappingManager";
import { IS_DEMO_MODE, DEMO_USERS, DEMO_AUDIT_LOGS } from "@/lib/demoData";

interface PendingUser {
  id: string;
  user_id: string;
  role: AppRole;
  is_approved: boolean;
  created_at: string;
  profile?: {
    full_name: string | null;
  };
  email?: string;
}

interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  details: any;
  created_at: string;
  incident_id: string | null;
}

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const { role, isApproved, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [allUsers, setAllUsers] = useState<PendingUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject';
    user: PendingUser | null;
  }>({ open: false, action: 'approve', user: null });

  useEffect(() => {
    if (!roleLoading && (!user || !isApproved || role !== 'admin')) {
      navigate("/auth");
    }
  }, [user, role, isApproved, roleLoading, navigate]);

  useEffect(() => {
    if (user && role === 'admin' && isApproved) {
      fetchData();
    }
  }, [user, role, isApproved]);

  const fetchData = async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      const userIds = rolesData?.map(r => r.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const usersWithProfiles = rolesData?.map(role => ({
        ...role,
        profile: profilesMap.get(role.user_id),
      })) || [];

      if (IS_DEMO_MODE) {
        usersWithProfiles.push(...(DEMO_USERS as any));
      }

      setPendingUsers(usersWithProfiles.filter(u => !u.is_approved));
      setAllUsers(usersWithProfiles);

      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      let allLogs = logsData || [];
      if (IS_DEMO_MODE) {
        allLogs = [...allLogs, ...(DEMO_AUDIT_LOGS as any)];
      }
      setAuditLogs(allLogs);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleApproval = (pendingUser: PendingUser, action: 'approve' | 'reject') => {
    setConfirmDialog({ open: true, action, user: pendingUser });
  };

  const confirmAction = async () => {
    if (!confirmDialog.user) return;

    try {
      if (confirmDialog.action === 'approve') {
        const { error } = await supabase
          .from('user_roles')
          .update({
            is_approved: true,
            approved_by: user?.id,
            approved_at: new Date().toISOString(),
          })
          .eq('id', confirmDialog.user.id);

        if (error) throw error;

        await supabase.from('audit_logs').insert({
          actor_id: user?.id,
          action: 'user_approved',
          details: {
            approved_user_id: confirmDialog.user.user_id,
            role: confirmDialog.user.role,
          },
        });

        toast.success(`${ROLE_LABELS[confirmDialog.user.role]} account approved`);
      } else {
        toast.info('User request rejected');
      }

      setConfirmDialog({ open: false, action: 'approve', user: null });
      fetchData();
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error('Failed to process request');
    }
  };

  const stats = {
    pending: pendingUsers.length,
    approved: allUsers.filter(u => u.is_approved).length,
    citizens: allUsers.filter(u => u.role === 'citizen').length,
    officers: allUsers.filter(u => u.role === 'field_police').length,
    higherOfficers: allUsers.filter(u => u.role === 'higher_officer').length,
    admins: allUsers.filter(u => u.role === 'admin').length,
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const getRoleBadge = (role: AppRole) => {
    const styles: Record<AppRole, string> = {
      citizen: "bg-muted text-muted-foreground",
      field_police: "bg-blue-100 text-blue-800",
      higher_officer: "bg-purple-100 text-purple-800",
      admin: "bg-red-100 text-red-800",
    };
    return styles[role];
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SafeCity Admin</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium">{user?.email}</span>
              <span className="text-xs text-muted-foreground">Administrator</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">System Control</h1>
          <p className="text-muted-foreground">Manage user permissions and monitor system activity.</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-8">
          {[
            { label: "Pending", value: stats.pending, icon: Clock },
            { label: "Total Users", value: stats.approved, icon: Users },
            { label: "Citizens", value: stats.citizens, icon: User },
            { label: "Officers", value: stats.officers, icon: Shield },
            { label: "Executive", value: stats.higherOfficers, icon: Eye },
            { label: "Admins", value: stats.admins, icon: Settings },
          ].map((stat, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase">{stat.label}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="city-pulse" className="space-y-4">
          <TabsList className="bg-muted/60 p-1 flex overflow-x-auto w-full max-w-full">
            <TabsTrigger value="city-pulse" className="font-bold text-primary data-[state=active]:bg-primary data-[state=active]:text-white">City Pulse (Live)</TabsTrigger>
            <TabsTrigger value="pending">Approvals ({stats.pending})</TabsTrigger>
            <TabsTrigger value="routing">Territory Routing</TabsTrigger>
            <TabsTrigger value="users">User Directory</TabsTrigger>
            <TabsTrigger value="registry">Officer Mgt</TabsTrigger>
            <TabsTrigger value="audit">System Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="routing">
            <JurisdictionMappingManager />
          </TabsContent>

          <TabsContent value="city-pulse">
            <Card>
              <CardContent className="pt-6">
                 <LiveIncidentsModule userRole="admin" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
             <Card>
               <CardHeader>
                 <CardTitle>Pending Authorization Requests</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="rounded-md border">
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>User</TableHead>
                         <TableHead>Role Requested</TableHead>
                         <TableHead>Time</TableHead>
                         <TableHead className="text-right">Actions</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {pendingUsers.length === 0 ? (
                         <TableRow><TableCell colSpan={4} className="text-center py-8">All caught up.</TableCell></TableRow>
                       ) : pendingUsers.map(u => (
                         <TableRow key={u.id}>
                           <TableCell>{u.profile?.full_name || 'Incomplete Profile'}</TableCell>
                           <TableCell><Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge></TableCell>
                           <TableCell className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                           <TableCell className="text-right">
                             <div className="flex justify-end gap-2">
                               <Button size="sm" variant="outline" onClick={() => handleApproval(u, 'approve')}>Approve</Button>
                               <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleApproval(u, 'reject')}>Reject</Button>
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

          <TabsContent value="users">
            <Card>
              <CardContent className="pt-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>System Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Access</TableHead>
                        <TableHead>Registration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map(u => (
                        <TableRow key={u.id}>
                          <TableCell>{u.profile?.full_name || 'N/A'}</TableCell>
                          <TableCell><Badge variant="outline" className={getRoleBadge(u.role)}>{ROLE_LABELS[u.role]}</Badge></TableCell>
                          <TableCell>{u.is_approved ? 'Verified' : 'Pending'}</TableCell>
                          <TableCell className="text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="registry">
            <OfficerRegistryManager />
          </TabsContent>

          <TabsContent value="audit">
             <Card>
               <CardContent className="pt-6">
                 <div className="rounded-md border">
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>Event</TableHead>
                         <TableHead>Metadata</TableHead>
                         <TableHead>Timestamp</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {auditLogs.map(log => (
                         <TableRow key={log.id}>
                           <TableCell><span className="font-medium">{log.action.replace('_', ' ')}</span></TableCell>
                           <TableCell className="text-xs font-mono max-w-md truncate">{JSON.stringify(log.details)}</TableCell>
                           <TableCell className="text-sm">{new Date(log.created_at).toLocaleString()}</TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
                 </div>
               </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.action === 'approve' ? 'Approve Access' : 'Reject Request'}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
            <Button onClick={confirmAction}>{confirmDialog.action === 'approve' ? 'Authorize' : 'Decline'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
