import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Package, MapPin, Clock, Search, Filter, Phone, 
  Building2, CheckSquare, AlertCircle, FileText, CheckCircle2,
  ChevronRight, Contact, Share2, ClipboardCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { IS_DEMO_MODE, DEMO_MISSING_ITEMS } from "@/lib/demoData";

interface MissingItem {
  id: string;
  item_name: string;
  category?: string;
  color?: string;
  brand?: string;
  last_seen_location?: string | null;
  found_location?: string | null;
  date_reported?: string;
  created_at?: string;
  description?: string;
  status: string;
  city?: string;
  area?: string;
  image_url?: string;
  claim_ref?: string;
  notified_branch?: boolean;
  notified_owner?: boolean;
  asset_type?: string;
  item_condition?: string;
  priority_level?: string;
}

const BRANCHES: Record<string, any> = {
  'Andheri West': { name: 'DN Nagar Police Station', phone: '+91 22 2620 4443', address: 'D.N.Nagar, Andheri West', hours: '24/7', officer: 'Ins. Rane' },
  'Fort': { name: 'MRA Marg Police Station', phone: '+91 22 2262 0891', address: 'Palton Road, Fort', hours: '24/7', officer: 'Ins. Pande' },
  'Lower Parel': { name: 'N.M. Joshi Marg Station', phone: '+91 22 2307 3634', address: 'Bawala Compound, Parel', hours: '24/7', officer: 'Ins. Salunkhe' },
  'Juhu': { name: 'Juhu Police Station', phone: '+91 22 2628 3202', address: 'JVPD Scheme, Juhu', hours: '24/7', officer: 'Ins. Kadam' },
  'Dadar': { name: 'Dadar Police Station', phone: '+91 22 2415 1111', address: 'Bhavani Shankar Road', hours: '24/7', officer: 'Ins. Jadhav' },
};

const DEFAULT_BRANCH = { name: 'Central Headquarters', phone: '+91 22 100 0000', address: 'Main City Hub', hours: '24/7', officer: 'Duty Officer' };

interface MissingItemManagerProps {
  userRole: 'higher_officer' | 'field_police' | 'admin';
  userCity: string | null;
}

const MissingItemManager: React.FC<MissingItemManagerProps> = ({ userRole, userCity }) => {
  const [items, setItems] = useState<MissingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Selected Item Operations
  const [selectedItem, setSelectedItem] = useState<MissingItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Handover Verification Checks
  const [checks, setChecks] = useState({ idProof: false, itemProof: false, descMatch: false, claimRef: false });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('missing_items')
        .select('*')
        .order('created_at', { ascending: false });

      let records = data || [];
      if (IS_DEMO_MODE) {
        records = [...records, ...(DEMO_MISSING_ITEMS as any)];
      }

      // Generate fake claim refs for demo purposes if not present
      records = records.map((r: any) => ({
        ...r,
        claim_ref: r.claim_ref || `CLM-${Math.floor(Math.random() * 90000) + 10000}`,
      }));

      setItems(records);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load missing items pipeline');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenItem = (item: MissingItem) => {
    setSelectedItem(item);
    setChecks({ idProof: false, itemProof: false, descMatch: false, claimRef: false });
    setIsDetailOpen(true);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedItem) return;
    
    // Optimistic UI
    setItems(items.map(i => i.id === selectedItem.id ? { ...i, status: newStatus } : i));
    setSelectedItem({ ...selectedItem, status: newStatus });
    toast.success(`Marked as ${newStatus.replace('_', ' ')}`);

    // Actually update DB if it's not a demo mock id starting with 'demo-'
    if (!selectedItem.id.startsWith('demo-')) {
      await supabase.from('missing_items').update({ status: newStatus }).eq('id', selectedItem.id);
    }
  };

  const handleNotifyBranch = () => {
    setSelectedItem(prev => prev ? { ...prev, notified_branch: true } : null);
    setItems(items.map(i => i.id === selectedItem?.id ? { ...i, notified_branch: true } : i));
    toast.success("Branch successfully notified. They are awaiting pickup.");
  };

  const handleCompleteHandover = () => {
    if (!checks.idProof || !checks.itemProof || !checks.descMatch || !checks.claimRef) {
      toast.error('Please complete all verification checks first.');
      return;
    }
    handleUpdateStatus('claimed');
    setIsDetailOpen(false);
  };

  const filteredItems = items.filter(item => 
    item.item_name?.toLowerCase().includes(search.toLowerCase()) || 
    item.status.toLowerCase().includes(search.toLowerCase()) ||
    item.asset_type?.toLowerCase().includes(search.toLowerCase()) ||
    item.area?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search item specs, tracking numbers, locations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11" />
        </div>
        <Button className="h-11">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-muted/20">
          <Package className="w-12 h-12 text-muted-foreground mx-auto opacity-30 mb-4" />
          <h3 className="text-lg font-medium">No recoverable assets tracked.</h3>
          <p className="text-muted-foreground mt-1">Check back later for newly reported findings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <div key={item.id} className="border rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-all group flex flex-col cursor-pointer" onClick={() => handleOpenItem(item)}>
              <div className="h-44 w-full bg-muted relative overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.item_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <Package className="w-12 h-12 text-muted-foreground opacity-20" />
                  </div>
                )}
                
                {/* Floating Tags */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                   <Badge variant="secondary" className="shadow-lg backdrop-blur-md bg-white/90 dark:bg-black/80 capitalize font-bold drop-shadow-sm">
                     {item.status.replace('_', ' ')}
                   </Badge>
                   {item.asset_type && (
                     <Badge variant="outline" className="shadow-lg backdrop-blur-md bg-primary/10 text-primary border-primary/20 uppercase text-[9px] font-black">
                       {item.asset_type.replace('_', ' ')}
                     </Badge>
                   )}
                   {item.status === 'found' && !item.notified_branch && (
                     <Badge className="bg-orange-500 text-white shadow-lg animate-pulse border-none">Requires Branch Link</Badge>
                   )}
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-base leading-tight line-clamp-1 mb-1">{item.item_name}</h3>
                <p className="text-xs font-mono tracking-widest text-muted-foreground mb-3">{item.claim_ref}</p>
                
                <p className="text-sm line-clamp-2 text-muted-foreground/90 flex-1 mb-4">
                  "{item.description}"
                </p>
                
                <div className="pt-3 border-t space-y-2 mt-auto">
                  <div className="flex items-start gap-2 text-[11px] leading-tight">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <div>
                      {item.found_location ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium tracking-wide">Found: {item.area || 'City Area'}</span>
                      ) : (
                        <span className="text-muted-foreground font-medium">Lost: {item.area || 'Unknown'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl overflow-hidden p-0 gap-0">
          <div className="bg-slate-900 text-white p-6 relative">
             <div className="absolute inset-0 opacity-20">
               {selectedItem?.image_url && <img src={selectedItem.image_url} className="w-full h-full object-cover blur-md" />}
             </div>
             <div className="relative z-10 flex justify-between items-start">
               <div>
                  <Badge variant="outline" className="text-white border-white/30 mb-3 bg-white/10 uppercase tracking-widest">
                    {selectedItem?.claim_ref}
                  </Badge>
                  <h2 className="text-2xl font-bold">{selectedItem?.item_name}</h2>
                  <p className="text-white/70 flex items-center gap-2 mt-1">
                    {selectedItem?.brand && <span>{selectedItem.brand}</span>}
                    {selectedItem?.color && <span>• {selectedItem.color}</span>}
                  </p>
               </div>
               <Select value={selectedItem?.status} onValueChange={handleUpdateStatus}>
                 <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white focus:ring-0">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="missing">Missing (Unresolved)</SelectItem>
                   <SelectItem value="found">Found (Unclaimed)</SelectItem>
                   <SelectItem value="potential_match">Potential Match</SelectItem>
                   <SelectItem value="claimed">Claimed (Handover Complete)</SelectItem>
                   <SelectItem value="unclaimed">Unclaimed (Archived)</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </div>

          <div className="grid md:grid-cols-5 bg-card min-h-[400px]">
            {/* L SIDE: Item Intel */}
            <div className="md:col-span-3 p-6 border-r flex flex-col">
               <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                 <FileText className="w-4 h-4"/> Asset Intel
               </h4>
               
               <div className="bg-muted p-4 rounded-lg text-sm leading-relaxed mb-6 italic text-muted-foreground">
                 "{selectedItem?.description || 'No description provided.'}"
               </div>

               <div className="space-y-4 mb-6 relative pl-5 before:absolute before:inset-y-0 before:left-1.5 before:w-0.5 before:bg-border">
                  <div className="relative">
                    <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-background"></span>
                    <p className="text-xs font-semibold text-muted-foreground">LAST SEEN</p>
                    <p className="text-sm font-medium">{selectedItem?.last_seen_location || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{selectedItem?.date_reported ? new Date(selectedItem.date_reported).toLocaleString() : 'Date Unknown'}</p>
                  </div>
                  {selectedItem?.found_location && (
                    <div className="relative mt-4">
                      <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-background"></span>
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">RECOVERED AT</p>
                      <p className="text-sm font-medium">{selectedItem?.found_location}</p>
                    </div>
                  )}
               </div>

               {/* Verification Block directly integrated */}
               {selectedItem?.status === 'found' && (
                 <div className="mt-auto border rounded-xl overflow-hidden">
                    <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
                      <span className="text-sm font-semibold flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-primary"/> Identity Handover Verification</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <p className="text-xs text-rose-500 font-semibold mb-2">DO NOT SHIP. PHYSICAL PRESENCE ONLY.</p>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="idProof" checked={checks.idProof} onCheckedChange={(c) => setChecks(p => ({...p, idProof: !!c}))} />
                        <Label htmlFor="idProof" className="text-sm font-normal">Matching Government User ID Verified</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="claimRef" checked={checks.claimRef} onCheckedChange={(c) => setChecks(p => ({...p, claimRef: !!c}))} />
                        <Label htmlFor="claimRef" className="text-sm font-normal">Matches Claim Ticket <strong>{selectedItem.claim_ref}</strong></Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="itemProof" checked={checks.itemProof} onCheckedChange={(c) => setChecks(p => ({...p, itemProof: !!c}))} />
                        <Label htmlFor="itemProof" className="text-sm font-normal">Valid Proof of Ownership Shown (Receipt/Photo)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="descMatch" checked={checks.descMatch} onCheckedChange={(c) => setChecks(p => ({...p, descMatch: !!c}))} />
                        <Label htmlFor="descMatch" className="text-sm font-normal">Physical details match registry description exactly</Label>
                      </div>

                      <Button 
                        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 font-bold tracking-wide" 
                        disabled={!checks.idProof || !checks.itemProof || !checks.descMatch || !checks.claimRef}
                        onClick={handleCompleteHandover}
                      >
                        Authorize & Release to Owner
                      </Button>
                    </div>
                 </div>
               )}
            </div>

            {/* R SIDE: Branch Contact */}
            <div className="md:col-span-2 p-6 bg-slate-50 dark:bg-[#15151b] flex flex-col items-center">
               <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground w-full mb-4 text-left border-b pb-2">
                 Holding Branch
               </h4>
               
               {(() => {
                 const branchInfo = BRANCHES[selectedItem?.area || ''] || DEFAULT_BRANCH;
                 return (
                   <div className="w-full space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                          <Building2 className="w-5 h-5"/>
                        </div>
                        <div>
                          <p className="font-bold text-sm leading-tight">{branchInfo.name}</p>
                          <p className="text-xs text-muted-foreground">SafeCity Outpost</p>
                        </div>
                      </div>

                      <div className="space-y-3 bg-white dark:bg-black/20 p-4 rounded-xl shadow-sm border text-sm">
                        <p className="flex justify-between items-center">
                          <span className="text-muted-foreground flex items-center gap-2"><MapPin className="w-3.5 h-3.5"/> Address</span>
                          <span className="font-medium text-right max-w-[120px] leading-tight">{branchInfo.address}</span>
                        </p>
                        <p className="flex justify-between items-center">
                          <span className="text-muted-foreground flex items-center gap-2"><Phone className="w-3.5 h-3.5"/> Direct Line</span>
                          <span className="font-medium text-primary">{branchInfo.phone}</span>
                        </p>
                        <p className="flex justify-between items-center">
                          <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-3.5 h-3.5"/> Operations</span>
                          <span className="font-medium text-emerald-600 font-mono">{branchInfo.hours}</span>
                        </p>
                        <p className="flex justify-between items-center pt-2 border-t">
                          <span className="text-muted-foreground flex items-center gap-2"><Contact className="w-3.5 h-3.5"/> Station Chief</span>
                          <span className="font-medium">{branchInfo.officer}</span>
                        </p>
                      </div>

                      <div className="space-y-2 pt-2">
                        {selectedItem?.notified_branch ? (
                           <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 p-3 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold border border-emerald-200 dark:border-emerald-800">
                             <CheckCircle2 className="w-4 h-4" /> Branch Alerted & Receptive
                           </div>
                        ) : (
                           <Button className="w-full" variant="default" onClick={handleNotifyBranch}>
                             <Share2 className="w-4 h-4 mr-2" /> Forward Ticket to Branch
                           </Button>
                        )}
                        <Button className="w-full" variant="outline">
                          <Phone className="w-4 h-4 mr-2" /> Direct Call Branch
                        </Button>
                      </div>
                   </div>
                 );
               })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MissingItemManager;
