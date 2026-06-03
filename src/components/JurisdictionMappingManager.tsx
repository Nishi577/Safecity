import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, User, Shield, AlertTriangle, Plus, Trash2, Search, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Mapping {
  id: string;
  area: string;
  city: string;
  higher_officer_id: string;
  created_at: string;
}

interface HigherOfficer {
  user_id: string;
  full_name: string | null;
}

const JurisdictionMappingManager = () => {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [officers, setOfficers] = useState<HigherOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [newArea, setNewArea] = useState("");
  const [newCity, setNewCity] = useState("Mumbai");
  const [newOfficerId, setNewOfficerId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch higher officers
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'higher_officer')
        .eq('is_approved', true);

      if (rolesError) throw rolesError;

      const officerIds = rolesData.map(r => r.user_id);
      
      let profilesData: any[] = [];
      if (officerIds.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', officerIds);
        if (error) throw error;
        profilesData = data || [];
      }
      setOfficers(profilesData);

      // Fetch mappings
      // Using generic request since TS might complain about unrecognized table
      const { data: mappingData, error: mappingError } = await (supabase as any)
        .from('jurisdiction_mappings')
        .select('*')
        .order('city', { ascending: true })
        .order('area', { ascending: true }) as unknown as { data: Mapping[], error: any };

      if (mappingError) {
        // Handle gracefully if table doesn't exist yet
        console.warn('Jurisdiction mappings table might not exist yet.');
        setMappings([]);
      } else {
        setMappings(mappingData || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMapping = async () => {
    if (!newArea || !newCity || !newOfficerId) {
      toast.error('Please fill in all fields.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { data, error } = await (supabase as any)
        .from('jurisdiction_mappings')
        .insert({
          area: newArea,
          city: newCity,
          higher_officer_id: newOfficerId
        })
        .select()
        .single() as unknown as { data: Mapping, error: any };

      if (error) throw error;
      
      toast.success('Jurisdiction mapping saved.');
      setMappings([data, ...mappings]);
      setNewArea("");
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to add mapping. Check constraints.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('jurisdiction_mappings')
        .delete()
        .eq('id', id) as unknown as { error: any };

      if (error) throw error;
      
      toast.success('Mapping removed.');
      setMappings(mappings.filter(m => m.id !== id));
    } catch (error) {
      toast.error('Failed to remove mapping.');
      console.error(error);
    }
  };

  const filteredMappings = mappings.filter(m => 
    m.area.toLowerCase().includes(search.toLowerCase()) || 
    m.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid md:grid-cols-3 gap-6 animate-in fade-in duration-300">
      
      <Card className="md:col-span-1 h-fit">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-primary" /> Map New Territory
          </CardTitle>
          <CardDescription>Allocate SOS routing for a specific area to a Higher Officer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="space-y-2">
             <Label>City / District</Label>
             <Input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="e.g. Mumbai" />
           </div>
           
           <div className="space-y-2">
             <Label>Area / Ward / Zone</Label>
             <Input value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="e.g. Andheri West" />
           </div>

           <div className="space-y-2">
             <Label>Responsible Executive Officer</Label>
             <Select value={newOfficerId} onValueChange={setNewOfficerId}>
               <SelectTrigger>
                 <SelectValue placeholder="Select Officer" />
               </SelectTrigger>
               <SelectContent>
                 {officers.length === 0 && <SelectItem value="disabled" disabled>No Executive Officers available</SelectItem>}
                 {officers.map(off => (
                   <SelectItem key={off.user_id} value={off.user_id}>
                     {off.full_name || 'Unnamed Officer'}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
           
           <Button className="w-full mt-2" onClick={handleAddMapping} disabled={isSubmitting}>
             {isSubmitting ? 'Mapping...' : 'Allocate Jurisdiction'}
           </Button>
           
           <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 mt-4 text-xs text-orange-800">
             <p className="font-semibold mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Routing Logic</p>
             <p>When an SOS matches the Area & City defined here, it routes explicitly to this officer. Unmapped SOS cases broadcast to the global pool.</p>
           </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="text-lg">Active Mappings</CardTitle>
            <CardDescription>Current automated SOS dispatch rules.</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
             <Input placeholder="Search territory..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
           {loading ? (
             <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
           ) : mappings.length === 0 ? (
             <div className="text-center py-12 border-dashed border rounded-xl text-muted-foreground bg-muted/20">
               <MapPin className="w-8 h-8 mx-auto mb-3 opacity-20" />
               <p className="font-medium text-sm">No territories mapped yet.</p>
               <p className="text-xs mt-1">Add a mapping to automate SOS dispatch routing.</p>
             </div>
           ) : (
             <div className="border rounded-lg overflow-hidden">
               <Table>
                 <TableHeader className="bg-muted/50">
                   <TableRow>
                     <TableHead>Location</TableHead>
                     <TableHead>Assigned Officer</TableHead>
                     <TableHead className="text-right">Action</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredMappings.map(mapping => {
                     const officer = officers.find(o => o.user_id === mapping.higher_officer_id);
                     return (
                       <TableRow key={mapping.id}>
                         <TableCell>
                           <p className="font-semibold">{mapping.area}</p>
                           <p className="text-xs text-muted-foreground hidden sm:block">{mapping.city}</p>
                         </TableCell>
                         <TableCell>
                           <div className="flex items-center gap-2">
                             <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                               <Shield className="w-3 h-3"/>
                             </div>
                             <span className="text-sm font-medium">{officer?.full_name || 'Unknown Officer'}</span>
                           </div>
                         </TableCell>
                         <TableCell className="text-right">
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(mapping.id)}>
                             <Trash2 className="w-4 h-4"/>
                           </Button>
                         </TableCell>
                       </TableRow>
                     )
                   })}
                 </TableBody>
               </Table>
             </div>
           )}
        </CardContent>
      </Card>
      
    </div>
  );
};

export default JurisdictionMappingManager;
