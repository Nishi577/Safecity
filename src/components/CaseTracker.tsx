import { useState, useEffect } from "react";
import { 
  ChevronDown, ChevronUp, Clock, User, Calendar,
  FileText, AlertTriangle, MapPin, MessageCircle, XCircle, Eye, EyeOff
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import CaseChat from "./CaseChat";

interface CaseUpdate {
  id: string;
  update_text: string;
  status_change: string | null;
  created_at: string;
  visible_to_citizen: boolean;
}

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

interface CaseTrackerProps {
  incident: Incident;
  onRefresh?: () => void;
}

const CaseTracker = ({ incident, onRefresh }: CaseTrackerProps) => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [updates, setUpdates] = useState<CaseUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [officerName, setOfficerName] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (expanded) {
      fetchUpdates();
      if (incident.assigned_officer_id) fetchOfficerName();
    }
  }, [expanded, incident.id, incident.assigned_officer_id]);

  const fetchUpdates = async () => {
    setLoadingUpdates(true);
    try {
      const { data, error } = await supabase
        .from("case_updates")
        .select("*")
        .eq("incident_id", incident.id)
        .eq("visible_to_citizen", true)        // Citizens only see updates shared with them
        .order("created_at", { ascending: true });
      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error("Error fetching updates:", error);
    } finally {
      setLoadingUpdates(false);
    }
  };

  const fetchOfficerName = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", incident.assigned_officer_id)
        .single();
      if (data) setOfficerName(data.full_name);
    } catch {}
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("incidents")
        .update({
          status: "cancelled",
          close_reason: cancelReason,
          closed_by: user?.id,
          closed_at: new Date().toISOString(),
        })
        .eq("id", incident.id)
        .eq("citizen_id", user?.id);
      if (error) throw error;
      toast.success("Report cancelled successfully");
      setCancelOpen(false);
      onRefresh?.();
    } catch (e) {
      console.error(e);
      toast.error("Failed to cancel report");
    } finally {
      setCancelling(false);
    }
  };

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-warning/10 text-warning border-warning/20",
      assigned: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      in_progress: "bg-accent/10 text-accent border-accent/20",
      awaiting_input: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      resolved: "bg-success/10 text-success border-success/20",
      cancelled: "bg-muted text-muted-foreground border-muted",
      closed: "bg-muted text-muted-foreground border-muted",
      rejected: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return styles[status] || "bg-muted text-muted-foreground";
  };

  const isAssigned = !!incident.assigned_officer_id;
  const isClosed = ["cancelled", "closed", "rejected", "resolved"].includes(incident.status);
  const canCancel = !isClosed; // Citizens can cancel as long as it's not already closed

  return (
    <div className={`rounded-xl border bg-card overflow-hidden ${isClosed ? "opacity-70" : "border-border"}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-4 hover:bg-muted/50 transition-colors text-left"
      >
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${incident.is_emergency ? "bg-destructive/10" : "bg-secondary"}`}>
          {incident.is_emergency ? (
            <AlertTriangle className="h-5 w-5 text-destructive" />
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium truncate">{incident.category}</p>
            {incident.is_emergency && <Badge variant="destructive" className="text-[10px]">EMERGENCY</Badge>}
          </div>
          <p className="text-sm text-muted-foreground truncate">{incident.description}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className={getStatusStyle(incident.status)}>
              {incident.status.replace("_", " ")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(incident.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />}
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4 animate-fade-in">
          {/* Case Details */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Location</p>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  {incident.city && incident.area && (
                    <p className="text-sm font-medium">{incident.city} - {incident.area}</p>
                  )}
                  {incident.location_description && (
                    <p className="text-sm text-muted-foreground">{incident.location_description}</p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Assigned Officer</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{officerName || (isAssigned ? "Loading..." : "Not yet assigned")}</p>
              </div>
            </div>
            {incident.deadline && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Deadline</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{new Date(incident.deadline).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {isAssigned && !isClosed && (
              <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)} className="flex-1">
                <MessageCircle className="h-4 w-4 mr-2" />
                {showChat ? "Hide Chat" : "Chat with Officer"}
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); setCancelOpen(true); }}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Report
              </Button>
            )}
          </div>

          {showChat && (
            <CaseChat incidentId={incident.id} isAssigned={isAssigned} assignedOfficerId={incident.assigned_officer_id} />
          )}

          {/* Progress Updates — only visible_to_citizen ones */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Progress Updates from Officer
            </h4>
            {loadingUpdates ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto" />
              </div>
            ) : updates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No updates shared by officer yet
              </p>
            ) : (
              <div className="space-y-3">
                {updates.map((update, i) => (
                  <div key={update.id} className="relative pl-8 pb-3">
                    {i < updates.length - 1 && <div className="absolute left-3 top-4 bottom-0 w-px bg-border" />}
                    <div className="absolute left-1 top-0.5 h-4 w-4 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-[9px] font-bold text-white">{i + 1}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date(update.created_at).toLocaleString()}
                      {update.status_change && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          → {update.status_change.replace("_", " ")}
                        </Badge>
                      )}
                    </p>
                    <div className="rounded-lg border border-border bg-muted/30 p-2">
                      <p className="text-sm">{update.update_text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Report</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this report. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Textarea
              placeholder="Reason for cancellation (e.g. issue resolved, filed by mistake...)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Quick suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "No longer an issue / Resolved",
                  "Reported by mistake",
                  "Someone is threatening me to withdraw",
                  "I do not wish to pursue this further",
                ].map((reason) => (
                  <Badge
                    key={reason}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted font-normal text-xs"
                    onClick={() => setCancelReason(reason)}
                  >
                    {reason}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>Keep Report</Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelling || !cancelReason.trim()}
            >
              {cancelling ? "Cancelling..." : "Yes, Cancel Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaseTracker;