import { useState, useEffect } from "react";
import { Plus, Upload, Trash2, Shield, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import type { AppRole } from "@/lib/roleValidation";

interface RegistryEntry {
  id: string;
  badge_id: string;
  official_email: string;
  full_name: string | null;
  role: AppRole;
  city: string | null;
  area: string | null;
  is_active: boolean;
  created_at: string;
}

const OfficerRegistryManager = () => {
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    badgeId: "",
    email: "",
    fullName: "",
    role: "field_police" as AppRole,
    city: "",
    area: "",
  });

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from("officer_registry")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Failed to load registry");
    }
    setEntries((data as RegistryEntry[]) || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!formData.badgeId || !formData.email) {
      toast.error("Badge ID and email are required");
      return;
    }

    const { error } = await supabase.from("officer_registry").insert({
      badge_id: formData.badgeId,
      official_email: formData.email.toLowerCase(),
      full_name: formData.fullName || null,
      role: formData.role,
      city: formData.city || null,
      area: formData.area || null,
    });

    if (error) {
      if (error.code === "23505") toast.error("Badge ID or email already exists");
      else toast.error("Failed to add entry");
      return;
    }

    toast.success("Officer added to registry");
    setAddDialogOpen(false);
    setFormData({ badgeId: "", email: "", fullName: "", role: "field_police", city: "", area: "" });
    fetchEntries();
  };

  const toggleActive = async (id: string, currentlyActive: boolean) => {
    const { error } = await supabase
      .from("officer_registry")
      .update({ is_active: !currentlyActive })
      .eq("id", id);
    if (error) toast.error("Failed to update");
    else fetchEntries();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("officer_registry").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Entry removed");
      fetchEntries();
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

    const badgeIdx = headers.findIndex(h => h.includes("badge"));
    const emailIdx = headers.findIndex(h => h.includes("email"));
    const nameIdx = headers.findIndex(h => h.includes("name"));
    const roleIdx = headers.findIndex(h => h.includes("role"));
    const cityIdx = headers.findIndex(h => h.includes("city"));
    const areaIdx = headers.findIndex(h => h.includes("area"));

    if (badgeIdx === -1 || emailIdx === -1) {
      toast.error("CSV must have 'badge_id' and 'email' columns");
      return;
    }

    const rows = lines.slice(1).map(line => {
      const cols = line.split(",").map(c => c.trim());
      return {
        badge_id: cols[badgeIdx],
        official_email: cols[emailIdx]?.toLowerCase(),
        full_name: nameIdx >= 0 ? cols[nameIdx] || null : null,
        role: (roleIdx >= 0 && ["field_police", "higher_officer"].includes(cols[roleIdx]))
          ? cols[roleIdx] as AppRole : "field_police" as AppRole,
        city: cityIdx >= 0 ? cols[cityIdx] || null : null,
        area: areaIdx >= 0 ? cols[areaIdx] || null : null,
      };
    }).filter(r => r.badge_id && r.official_email);

    if (rows.length === 0) {
      toast.error("No valid rows found");
      return;
    }

    const { error } = await supabase.from("officer_registry").insert(rows);
    if (error) {
      toast.error(`Import failed: ${error.message}`);
    } else {
      toast.success(`${rows.length} officers imported`);
      fetchEntries();
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Officer Registry</h3>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            <Button variant="outline" size="sm" asChild>
              <span><Upload className="h-4 w-4 mr-1" />Import CSV</span>
            </Button>
          </label>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />Add Officer
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Badge ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Jurisdiction</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No officers in registry. Add officers or import CSV.
                </TableCell>
              </TableRow>
            ) : entries.map(entry => (
              <TableRow key={entry.id}>
                <TableCell className="font-mono text-sm">{entry.badge_id}</TableCell>
                <TableCell>{entry.full_name || "—"}</TableCell>
                <TableCell className="text-sm">{entry.official_email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={entry.role === "higher_officer" ? "text-purple-500" : "text-blue-500"}>
                    {entry.role === "higher_officer" ? "Higher Officer" : "Field Officer"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {entry.city ? `${entry.city}${entry.area ? ` - ${entry.area}` : ""}` : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={entry.is_active ? "text-success" : "text-muted-foreground"}>
                    {entry.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(entry.id, entry.is_active)}>
                      {entry.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(entry.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Officer to Registry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Badge ID <span className="text-destructive">*</span></Label>
              <Input value={formData.badgeId} onChange={(e) => setFormData(p => ({ ...p, badgeId: e.target.value }))} placeholder="e.g., OFF-2024-001" />
            </div>
            <div className="space-y-2">
              <Label>Official Email <span className="text-destructive">*</span></Label>
              <Input value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="officer@officer.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={formData.fullName} onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData(p => ({ ...p, role: v as AppRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="field_police">Field Officer</SelectItem>
                  <SelectItem value="higher_officer">Higher Officer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <LocationSelector
              city={formData.city}
              area={formData.area}
              onCityChange={(c) => setFormData(p => ({ ...p, city: c, area: "" }))}
              onAreaChange={(a) => setFormData(p => ({ ...p, area: a }))}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleAdd}>Add to Registry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfficerRegistryManager;
