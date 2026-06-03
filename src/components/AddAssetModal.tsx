import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import {
  ChevronRight,
  ChevronLeft,
  Package,
  MapPin,
  ClipboardList,
  Image as ImageIcon,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

interface AddAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssetAdded?: () => void;
}

const ASSET_TYPES = [
  "Missing Item",
  "Found Item",
  "Recovered Item",
  "Suspicious Item",
  "Unclaimed Property",
  "Evidence Item",
];

const CATEGORIES = [
  "Electronics",
  "Vehicle",
  "Documents",
  "Personal Accessories",
  "Currency",
  "Tools/Equipment",
  "Jewelry",
  "Baggage",
  "Clothing",
  "Other",
];

const AddAssetModal = ({ open, onOpenChange, onAssetAdded }: AddAssetModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    asset_type: "Missing Item",
    category: "Electronics",
    item_name: "",
    description: "",
    case_id: "",
    incident_type: "",
    priority_level: "medium",
    status: "open",
    date_reported: new Date().toISOString().split("T")[0],
    time_reported: new Date().toLocaleTimeString("en-GB", { hour12: false }).slice(0, 5),

    // Location
    last_seen_location: "",
    found_location: "",
    area: "",
    ward: "",
    address_landmark: "",
    indoor_outdoor: "outdoor",

    // Specs
    brand: "",
    color: "",
    size: "",
    model: "",
    serial_number: "",
    distinguishing_features: "",
    item_condition: "used",
    quantity: 1,
    estimated_value: "",

    // Ownership
    owner_name: "",
    owner_contact: "",
    storage_location: "",
    assigned_officer_id: "",
    recovery_status: "pending",
  });

  const nextStep = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!formData.item_name || !formData.description) {
      toast.error("Please fill in item name and description");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("missing_items").insert({
        asset_type: formData.asset_type.toLowerCase().replace(" ", "_"),
        category: formData.category,
        item_name: formData.item_name,
        description: formData.description,
        citizen_id: user?.id, // Default to user if citizen not provided
        last_seen_location: formData.last_seen_location,
        found_location: formData.found_location,
        area: formData.area,
        status: formData.status,
        date_lost: formData.date_reported,
        contact_info: formData.owner_contact,
        case_id: formData.case_id || null,
        incident_type: formData.incident_type,
        priority_level: formData.priority_level,
        time_reported: formData.time_reported,
        ward: formData.ward,
        address_landmark: formData.address_landmark,
        indoor_outdoor: formData.indoor_outdoor,
        brand: formData.brand,
        color: formData.color,
        size: formData.size,
        model: formData.model,
        serial_number: formData.serial_number,
        distinguishing_features: formData.distinguishing_features,
        item_condition: formData.item_condition,
        quantity: formData.quantity,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        owner_name: formData.owner_name,
        owner_contact: formData.owner_contact,
        reporting_officer_id: user?.id,
        storage_location: formData.storage_location,
        assigned_officer_id: formData.assigned_officer_id || null,
        recovery_status: formData.recovery_status,
      });

      if (error) throw error;

      toast.success("Asset registered successfully");
      onOpenChange(false);
      setStep(1);
      setFormData({
        ...formData,
        item_name: "",
        description: "",
      });
      if (onAssetAdded) onAssetAdded();
    } catch (error) {
      console.error("Error adding asset:", error);
      toast.error("Failed to register asset. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Asset Classification</Label>
                <Select
                  value={formData.asset_type}
                  onValueChange={(v) => setFormData({ ...formData, asset_type: v })}
                >
                  <SelectTrigger className="bg-muted/50 border-0 focus:ring-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger className="bg-muted/50 border-0 focus:ring-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Item Title / Name</Label>
              <Input
                placeholder="e.g. Blue HP Laptop 15s"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                className="bg-muted/50 border-0 focus:ring-1"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Detailed description of the item including marks, damages..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-muted/50 border-0 focus:ring-1 min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Linked Case ID (Optional)</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Reference code"
                    value={formData.case_id}
                    onChange={(e) => setFormData({ ...formData, case_id: e.target.value })}
                    className="bg-muted/50 border-0 focus:ring-1 pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority_level}
                  onValueChange={(v) => setFormData({ ...formData, priority_level: v })}
                >
                  <SelectTrigger className="bg-muted/50 border-0 focus:ring-1 capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high", "critical"].map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Report Date</Label>
                <Input
                  type="date"
                  value={formData.date_reported}
                  onChange={(e) => setFormData({ ...formData, date_reported: e.target.value })}
                  className="bg-muted/50 border-0 focus:ring-1"
                />
              </div>
              <div className="space-y-2">
                <Label>Report Time</Label>
                <Input
                  type="time"
                  value={formData.time_reported}
                  onChange={(e) => setFormData({ ...formData, time_reported: e.target.value })}
                  className="bg-muted/50 border-0 focus:ring-1"
                />
              </div>
            </div>

            {formData.asset_type === "Found Item" || formData.asset_type === "Recovered Item" ? (
              <div className="space-y-2">
                <Label>Found / Recovered Location</Label>
                <Input
                  placeholder="Where the item was discovered"
                  value={formData.found_location}
                  onChange={(e) => setFormData({ ...formData, found_location: e.target.value })}
                  className="bg-muted/50 border-0 focus:ring-1"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Last Seen Location</Label>
                <Input
                  placeholder="Where the item was last known to be"
                  value={formData.last_seen_location}
                  onChange={(e) => setFormData({ ...formData, last_seen_location: e.target.value })}
                  className="bg-muted/50 border-0 focus:ring-1"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Area / Zone</Label>
                <Input
                  placeholder="Name of area"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="bg-muted/50 border-0 focus:ring-1"
                />
              </div>
              <div className="space-y-2">
                <Label>Inside / Outside</Label>
                <Select
                  value={formData.indoor_outdoor}
                  onValueChange={(v) => setFormData({ ...formData, indoor_outdoor: v })}
                >
                  <SelectTrigger className="bg-muted/50 border-0 focus:ring-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indoor">Indoor</SelectItem>
                    <SelectItem value="outdoor">Outdoor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address or Landmark</Label>
              <Input
                placeholder="e.g. Near Big Ben clock tower"
                value={formData.address_landmark}
                onChange={(e) => setFormData({ ...formData, address_landmark: e.target.value })}
                className="bg-muted/50 border-0 focus:ring-1"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand / Manufacturer</Label>
                <Input
                  placeholder="e.g. Samsung"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="bg-muted/50 border-0 focus:ring-1"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  placeholder="e.g. Midnight Black"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="bg-muted/50 border-0 focus:ring-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Model No.</Label>
                <Input
                  placeholder="e.g. SM-G991B"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="bg-muted/50 border-0 focus:ring-1"
                />
              </div>
              <div className="space-y-2">
                <Label>Serial / IMEI</Label>
                <Input
                  placeholder="Unique identifier"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  className="bg-muted/50 border-0 focus:ring-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="bg-muted/50 border-0 focus:ring-1"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Est. Value</Label>
                <Input
                  placeholder="Amount in local currency"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                  className="bg-muted/50 border-0 focus:ring-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Distinguishing Features</Label>
              <Input
                placeholder="e.g. Cracked screen, stickers on back..."
                value={formData.distinguishing_features}
                onChange={(e) => setFormData({ ...formData, distinguishing_features: e.target.value })}
                className="bg-muted/50 border-0 focus:ring-1"
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <Label>Owner Name</Label>
              <Input
                placeholder="Full name (if known)"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                className="bg-muted/50 border-0 focus:ring-1"
              />
            </div>

            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input
                placeholder="Phone number"
                value={formData.owner_contact}
                onChange={(e) => setFormData({ ...formData, owner_contact: e.target.value })}
                className="bg-muted/50 border-0 focus:ring-1"
              />
            </div>

            <div className="space-y-2">
              <Label>Assigned Branch / Storage</Label>
              <Input
                placeholder="Police Branch No. or Locker ID"
                value={formData.storage_location}
                onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                className="bg-muted/50 border-0 focus:ring-1"
              />
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed bg-muted/20">
                <ImageIcon className="h-8 w-8 text-muted-foreground opacity-50" />
                <div className="flex-1">
                  <p className="text-xs font-semibold">Media Attachment</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Drag and drop photos or documents here. (Simulated)</p>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-[10px]">Add Files</Button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getStepIcon = (i: number) => {
    switch (i) {
      case 1:
        return <Package className="h-4 w-4" />;
      case 2:
        return <MapPin className="h-4 w-4" />;
      case 3:
        return <ClipboardList className="h-4 w-4" />;
      case 4:
        return <User className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStepLabel = (i: number) => {
    switch (i) {
      case 1:
        return "Tactical Details";
      case 2:
        return "Location Intel";
      case 3:
        return "Specifications";
      case 4:
        return "Custody & Ownership";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-border/40">
        <div className="flex flex-col h-[600px]">
          {/* Header */}
          <div className="bg-muted p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> Tactical Asset Entry
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-medium">Record intelligence for assets discovered in the field.</p>
              </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                    i <= step ? (i === step ? "bg-primary w-2/5" : "bg-primary/40") : "bg-border"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="h-6 gap-1.5 text-[10px] font-bold tracking-tight uppercase">
                {getStepIcon(step)} Step {step}: {getStepLabel(step)}
              </Badge>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 p-6 overflow-y-auto">
            {renderStep()}
          </div>

          {/* Footer */}
          <DialogFooter className="p-6 bg-muted/30 border-t flex items-center justify-between gap-4">
            <div className="flex-1">
              {step > 1 && (
                <Button variant="ghost" onClick={prevStep} className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {step < totalSteps ? (
                <Button onClick={nextStep} className="gap-2 min-w-[100px]">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px] shadow-lg shadow-primary/20"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    "Authorize Entry"
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddAssetModal;
