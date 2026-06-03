import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, differenceInMinutes, parseISO } from 'date-fns';
import { IS_DEMO_MODE, DEMO_INCIDENTS } from "@/lib/demoData";
import { 
  AlertTriangle, Shield, MapPin, Clock, ShieldAlert,
  Search, Filter, Activity, Map as MapIcon, ChevronRight,
  ShieldCheck, AlertCircle, Eye
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import IncidentHeatmap from '@/components/IncidentHeatmap';
import { SeverityBadge } from '@/components/DescriptionAnalyzer';

export interface Incident {
  id: string;
  category: string;
  description: string;
  status: string;
  urgency: string;
  created_at: string;
  city: string | null;
  area: string | null;
  is_emergency: boolean;
  assigned_officer_id: string | null;
  ml_severity?: string | null;
}

interface LiveIncidentsModuleProps {
  userRole?: 'citizen' | 'field_officer' | 'higher_officer' | 'admin';
  jurisdictionCity?: string | null;
}

const LiveIncidentsModule: React.FC<LiveIncidentsModuleProps> = ({ userRole = 'citizen', jurisdictionCity }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  useEffect(() => {
    fetchIncidents();
    
    // Subscribe to realtime incident updates
    const channel = supabase.channel('live-incidents')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, payload => {
        const newIncident = payload.new as Incident;
        
        // Ensure jurisdiction scoping if applicable
        if (jurisdictionCity && newIncident.city && newIncident.city !== jurisdictionCity) {
           return;
        }

        setIncidents(prev => [newIncident, ...prev]);
        toast.info(`Live Alert: New ${newIncident.category} reported near ${newIncident.area || 'your city'}.`, {
          icon: <Activity className="h-4 w-4 text-orange-500 animate-pulse" />
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incidents' }, payload => {
        setIncidents(prev => {
          const oldIncidents = prev.filter(i => i.id !== payload.old.id);
          const filteredIncidents = [];
          
          // Re-inject the demo content so it doesn't get wiped by real-time sync states
          if (IS_DEMO_MODE) {
            const removedDemo = prev.filter(i => i.id.startsWith('demo-'));
            filteredIncidents.push(...removedDemo);
          }
          
          return [...filteredIncidents, ...(oldIncidents.map(inc => inc.id === payload.new.id ? payload.new as Incident : inc))];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jurisdictionCity]);

  const fetchIncidents = async () => {
    try {
      let query = supabase.from('incidents').select('*').order('created_at', { ascending: false });
      
      if (jurisdictionCity) {
        query = query.eq('city', jurisdictionCity);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      let fetched = data || [];
      if (IS_DEMO_MODE) {
        fetched = [...fetched, ...(DEMO_INCIDENTS as any)];
      }
      setIncidents(fetched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('incidents').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      toast.success("Incident verification updated.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status.");
    }
  };

  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      const matchSearch = inc.category.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          inc.area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inc.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = statusFilter === 'all' || 
                          (statusFilter === 'verified' && ['assigned', 'in_progress', 'resolved'].includes(inc.status)) ||
                          (statusFilter === 'pending' && inc.status === 'pending');
                          
      const matchSeverity = severityFilter === 'all' || 
                            (severityFilter === 'critical' && inc.is_emergency) ||
                            (severityFilter !== 'critical' && inc.urgency === severityFilter && !inc.is_emergency);
                            
      return matchSearch && matchStatus && matchSeverity;
    });
  }, [incidents, searchQuery, statusFilter, severityFilter]);

  const trendingAreas = useMemo(() => {
    const areaCounts: Record<string, { count: number, types: Record<string, number> }> = {};
    incidents.forEach(inc => {
      const areaName = inc.area || inc.city || "Unknown Area";
      if (!areaCounts[areaName]) areaCounts[areaName] = { count: 0, types: {} };
      areaCounts[areaName].count++;
      areaCounts[areaName].types[inc.category] = (areaCounts[areaName].types[inc.category] || 0) + 1;
    });

    const sortedAreas = Object.entries(areaCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([area, data]) => {
         const topType = Object.entries(data.types).sort((a,b) => b[1] - a[1])[0][0];
         return { area, count: data.count, topType };
      });
      
    return sortedAreas;
  }, [incidents]);

  const getSeverityColor = (urgency: string, isEmergency: boolean) => {
    if (isEmergency || urgency === 'critical') return "bg-red-500/10 text-red-600 border-red-500/20";
    if (urgency === 'high') return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    if (urgency === 'medium') return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  };
  
  const getVerificationBadge = (status: string) => {
    if (['assigned', 'in_progress', 'resolved'].includes(status)) {
       return <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 gap-1"><ShieldCheck className="w-3 h-3"/> Verified</Badge>
    }
    if (status === 'rejected') {
       return <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-500 border-gray-200 gap-1"><AlertCircle className="w-3 h-3"/> False Report</Badge>
    }
    return <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200 gap-1"><Eye className="w-3 h-3"/> Under Review</Badge>
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary animate-pulse" /> Live Incidents
          </h2>
          <p className="text-sm text-muted-foreground">Real-time awareness grid and verification tracking.</p>
        </div>
        
        <div className="flex bg-muted/50 p-1 rounded-md border text-xs gap-4 px-3 shadow-sm">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Live Monitoring</span>
          <span className="text-muted-foreground border-l pl-3">{incidents.length} Records</span>
        </div>
      </div>

      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/80">
          <TabsTrigger value="feed"><Activity className="w-4 h-4 mr-2"/> Live Feed</TabsTrigger>
          <TabsTrigger value="map"><MapIcon className="w-4 h-4 mr-2"/> Map View</TabsTrigger>
          <TabsTrigger value="trending"><TrendingUpIcon className="w-4 h-4 mr-2"/> Trending Areas</TabsTrigger>
        </TabsList>

        {/* FEED VIEW */}
        <TabsContent value="feed" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row gap-3">
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
               <Input placeholder="Search areas, types, descriptors..." className="pl-9 h-10 bg-background" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
             </div>
             <Select value={severityFilter} onValueChange={setSeverityFilter}>
               <SelectTrigger className="w-full sm:w-36 h-10 bg-background"><SelectValue placeholder="Severity"/></SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Severities</SelectItem>
                 <SelectItem value="low">Low</SelectItem>
                 <SelectItem value="medium">Medium</SelectItem>
                 <SelectItem value="high">High</SelectItem>
                 <SelectItem value="critical">Critical</SelectItem>
               </SelectContent>
             </Select>
             <Select value={statusFilter} onValueChange={setStatusFilter}>
               <SelectTrigger className="w-full sm:w-36 h-10 bg-background"><SelectValue placeholder="Verification"/></SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Progress</SelectItem>
                 <SelectItem value="pending">Under Review</SelectItem>
                 <SelectItem value="verified">Verified</SelectItem>
               </SelectContent>
             </Select>
          </div>

          <div className="grid gap-4 mt-6">
            {loading ? (
              <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : filteredIncidents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">No live incidents match your filters.</div>
            ) : (
              <div className="space-y-3">
                {filteredIncidents.map(inc => {
                   const isNew = new Date().getTime() - new Date(inc.created_at).getTime() < 1000 * 60 * 15; // 15 mins
                   
                   return (
                     <Card key={inc.id} className={`overflow-hidden transition-all hover:shadow-md border-l-4 ${inc.is_emergency ? 'border-l-red-500' : 'border-l-primary'}`}>
                       <CardContent className="p-0">
                         <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:justify-between items-start sm:items-center">
                           
                           <div className="space-y-1.5 flex-1">
                             <div className="flex items-center gap-2 flex-wrap">
                               <Badge variant="outline" className={getSeverityColor(inc.urgency, inc.is_emergency)}>
                                  {inc.is_emergency ? 'EMERGENCY' : inc.urgency.toUpperCase()}
                               </Badge>
                               {inc.ml_severity && <SeverityBadge severity={inc.ml_severity} size="sm" />}
                               <span className="font-bold text-base capitalize tracking-tight text-foreground">{inc.category.replace('_', ' ')}</span>
                               {isNew && <Badge className="bg-primary/20 text-primary border-0 text-[9px] uppercase px-1.5 h-4 ml-1">New</Badge>}
                             </div>
                             <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                               <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5"/> {inc.area || inc.city || "Unknown Location"}</span>
                               <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5"/> Reported {formatDistanceToNow(new Date(inc.created_at))} ago</span>
                             </div>
                           </div>

                           <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                              {getVerificationBadge(inc.status)}
                              
                              {userRole !== 'citizen' && inc.status === 'pending' && (
                                 <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                   <Button size="sm" variant="outline" className="h-7 text-xs flex-1 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200" onClick={() => handleVerify(inc.id, 'assigned')}>Verify Signal</Button>
                                   <Button size="sm" variant="outline" className="h-7 text-xs flex-1 bg-gray-50 hover:bg-gray-100 text-gray-500" onClick={() => handleVerify(inc.id, 'rejected')}>Reject</Button>
                                 </div>
                              )}
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                   )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* MAP VIEW */}
        <TabsContent value="map" className="mt-6">
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><MapIcon className="w-4 h-4"/> Real-time Heatmap Tracking</CardTitle>
            </CardHeader>
            <CardContent className="p-0 aspect-[4/3] sm:aspect-video relative">
               <IncidentHeatmap jurisdictionCity={jurisdictionCity} isPublicView={userRole === 'citizen'} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRENDING AREAS */}
        <TabsContent value="trending" className="mt-6">
           <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-md flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500"/> Hotspot Zones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   {trendingAreas.length === 0 ? <p className="text-sm text-muted-foreground">Insufficient data to map trends.</p> : 
                    trendingAreas.map((zone, idx) => {
                      const maxCount = trendingAreas[0].count;
                      const percentage = Math.round((zone.count / maxCount) * 100);
                      
                      return (
                        <div key={zone.area} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium flex items-center gap-2">
                               <span className="text-muted-foreground w-4 h-4 flex items-center justify-center text-xs bg-muted rounded-full">{idx+1}</span>
                               {zone.area}
                            </span>
                            <span className="font-bold">{zone.count} <span className="text-muted-foreground text-xs font-normal">reports</span></span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                             <div className="h-full bg-orange-500 transition-all" style={{ width: `${percentage}%`}}></div>
                          </div>
                          <p className="text-xs text-muted-foreground pr-1 pt-0.5 max-w-full truncate">Dominant issue: <span className="capitalize text-foreground font-medium">{zone.topType.replace('_', ' ')}</span></p>
                        </div>
                      )
                    })
                   }
                </CardContent>
              </Card>

              <Card className="bg-muted/20">
                <CardHeader>
                  <CardTitle className="text-md">AI Insights & Forecasting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="bg-background border rounded-lg p-3">
                     <p className="text-xs text-muted-foreground mb-1 leading-snug">The system has detected a slight uptick in <span className="font-semibold text-foreground">Theft</span> patterns in commercial sectors over the past 4 hours.</p>
                     <Button variant="link" className="h-auto p-0 text-xs gap-1">View Predictive Logistics <ChevronRight className="w-3 h-3"/></Button>
                   </div>
                   <div className="bg-emerald-50 text-emerald-800 border-emerald-200 border rounded-lg p-3">
                     <p className="text-xs font-medium leading-snug">Verification speeds are up by 22% today. Community trust scores are stabilizing.</p>
                   </div>
                </CardContent>
              </Card>
           </div>
        </TabsContent>
        
      </Tabs>
    </div>
  );
};

// Simple localized helper icon
function TrendingUpIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

export default LiveIncidentsModule;
