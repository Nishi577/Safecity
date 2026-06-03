import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, ArrowLeft, Package, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LocationSelector from "@/components/LocationSelector";

const itemCategories = [
  "Electronics", "Documents", "Jewelry", "Bags/Wallets", 
  "Clothing", "Keys", "Pets", "Vehicles", "Other"
];

const ReportMissingItem = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    itemName: "",
    category: "",
    description: "",
    lastSeenLocation: "",
    city: "",
    area: "",
    dateLost: "",
    contactInfo: "",
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("missing_items").insert({
        citizen_id: user.id,
        item_name: formData.itemName,
        category: formData.category,
        description: formData.description,
        last_seen_location: formData.lastSeenLocation || null,
        city: formData.city || null,
        area: formData.area || null,
        date_lost: formData.dateLost || null,
        contact_info: formData.contactInfo || null,
      });

      if (error) throw error;
      toast.success("Missing item report submitted!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
             <h1 className="text-lg font-bold">Report Missing Item</h1>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Item Details</CardTitle>
              <CardDescription>Provide information about the lost item.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Item Name</Label>
                  <Input placeholder="e.g., iPhone 13" value={formData.itemName} onChange={e => setFormData(p => ({ ...p, itemName: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                   <Label>Category</Label>
                   <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                     <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                     <SelectContent>
                       {itemCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                     </SelectContent>
                   </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Color, brand, special marks..." value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} required />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Last Seen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <LocationSelector city={formData.city} area={formData.area} onCityChange={c => setFormData(p => ({ ...p, city: c }))} onAreaChange={a => setFormData(p => ({ ...p, area: a }))} />
               <div className="space-y-2">
                  <Label>Specific Location/Landmark</Label>
                  <Input value={formData.lastSeenLocation} onChange={e => setFormData(p => ({ ...p, lastSeenLocation: e.target.value }))} />
               </div>
               <div className="space-y-2">
                  <Label>Date Lost</Label>
                  <Input type="date" value={formData.dateLost} onChange={e => setFormData(p => ({ ...p, dateLost: e.target.value }))} />
               </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
             <CardContent>
                <div className="space-y-2">
                   <Label>Phone or Email</Label>
                   <Input placeholder="How can we reach you?" value={formData.contactInfo} onChange={e => setFormData(p => ({ ...p, contactInfo: e.target.value }))} />
                </div>
             </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
             {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default ReportMissingItem;
