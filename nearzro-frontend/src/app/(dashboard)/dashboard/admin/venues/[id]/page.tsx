"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Edit, MapPin, CheckCircle2, XCircle, Calendar, Download, Share2,
  Building2, Users, Loader2, X, ShieldCheck, AlertCircle, Mail, Phone, ExternalLink,
  History, CreditCard, Star, Image as ImageIcon, Briefcase, Map as MapIcon,
  Maximize2, Zap, Settings2, FileText
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface VenueDetail {
  id: number;
  ownerId: number;
  name: string;
  type: string;
  description?: string;
  address: string;
  city: string;
  area: string;
  pincode: string;
  capacityMin: number;
  capacityMax: number;
  basePriceMorning?: number;
  basePriceEvening?: number;
  basePriceFullDay?: number;
  amenities?: string;
  status: string;
  photos?: any[];
  owner?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  };
  availabilitySlots?: any[];
  kyc?: {
    status: string;
    documents: any[];
  };
  createdAt: string;
  updatedAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  HALL: "Grand Hall",
  MANDAPAM: "Traditional Mandapam",
  LAWN: "Open Air Lawn",
  RESORT: "Luxury Resort",
  BANQUET: "Banquet Suite",
  BANQUET_HALL: "Banquet Hall",
  MARRIAGE_HALL: "Marriage Hall",
  BEACH_VENUE: "Beach Front",
  HOTEL: "Business Hotel",
  COMMUNITY_HALL: "Community Hall",
  OTHER: "Generic Venue",
};

export default function AdminVenueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadVenue();
  }, [params.id]);

  const loadVenue = async () => {
    try {
      setLoading(true);
      // Fetching from the broad administrative dossier endpoint
      const response = await api.get(`/venues/admin/${params.id}`);
      setVenue(response.data || null);
    } catch (error: any) {
      console.error("Transmission Error:", error);
      toast.error("Failed to extract venue dossier from registry");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string, reason?: string) => {
    try {
      setActionLoading(true);
      if (status === 'ACTIVE') {
        await api.patch(`/venues/${venue?.id}/approve`);
      } else if (status === 'REJECTED') {
        await api.patch(`/venues/${venue?.id}/reject`, { reason });
      } else {
        await api.patch(`/venues/${venue?.id}`, { status });
      }
      toast.success(`Operational status updated to ${status}`);
      loadVenue();
    } catch (error: any) {
      toast.error("Failed to update asset operational status");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-16 w-16 border-[4px] border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Syncing Asset Dossier</p>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <AlertCircle className="h-20 w-20 text-red-600" />
        <div className="text-center">
          <h3 className="text-2xl font-black text-black uppercase tracking-tight">Node Not Found</h3>
          <p className="text-neutral-500 font-medium mt-1">Asset ID {params.id} is missing from the global registry.</p>
        </div>
        <Button onClick={() => router.push("/dashboard/admin/venues")} className="h-12 bg-black text-white px-8 rounded-xl font-bold">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Registry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Industrial Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b-2 border-neutral-100">
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="p-0 hover:bg-transparent text-neutral-400 hover:text-black transition-colors font-bold uppercase tracking-widest text-[10px] flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Exit to Registry
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-[2.5rem] bg-black flex items-center justify-center font-black text-white text-3xl shadow-2xl shadow-black/20">
              <Building2 className="h-10 w-10" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black tracking-tighter text-black uppercase">{venue.name}</h1>
                <Badge className={`rounded px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${venue.status === 'ACTIVE' ? 'bg-emerald-600' :
                    (venue.status === 'REJECTED' || venue.status === 'INACTIVE' || venue.status === 'DELISTED') ? 'bg-red-600' : 'bg-amber-500'
                  } text-white`}>
                  {venue.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs mt-1 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-neutral-300" /> {venue.area}, {venue.city} • Capacity: {venue.capacityMax} Guests
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {venue.status === 'PENDING_APPROVAL' && (
            <>
              <Button
                onClick={() => handleStatusUpdate('ACTIVE')}
                disabled={actionLoading}
                className="h-12 bg-emerald-600 text-white hover:bg-emerald-700 px-6 rounded-xl font-bold border-b-4 border-emerald-800 active:border-b-0 transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5" /> AUTHORIZE ASSET
              </Button>
              <Button
                onClick={() => {
                  const reason = prompt("Enter rejection reason:");
                  if (reason) handleStatusUpdate('REJECTED', reason);
                }}
                disabled={actionLoading}
                className="h-12 bg-white text-red-600 hover:bg-red-50 px-6 rounded-xl font-bold border-2 border-red-100 flex items-center gap-2"
              >
                <XCircle className="h-5 w-5" /> REJECT ASSET
              </Button>
            </>
          )}
          <Button
            onClick={() => router.push(`/dashboard/admin/venues/${venue.id}/edit`)}
            className="h-12 bg-black text-white hover:bg-neutral-800 px-6 rounded-xl font-bold border-b-4 border-neutral-900 active:border-b-0 transition-all flex items-center gap-2"
          >
            <Edit className="h-5 w-5" /> EDIT SPECS
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-neutral-100 p-1.5 rounded-[2rem] w-full lg:w-max flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'gallery', label: 'Gallery', icon: ImageIcon },
            { id: 'operations', label: 'Operations', icon: Settings2 },
            { id: 'kyc', label: 'Ownership & KYC', icon: ShieldCheck },
            { id: 'pricing', label: 'Economics', icon: CreditCard },
          ].map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="px-8 py-3 rounded-[1.5rem] data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-[0.1em] text-neutral-400 transition-all flex items-center gap-2"
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-8 mt-0 focus-visible:outline-none">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-2 border-neutral-100 shadow-sm rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-neutral-50 px-8 py-6 border-b-2 border-neutral-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black">Asset Specifications</CardTitle>
                <Building2 className="h-5 w-5 text-neutral-300" />
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Property Type</label>
                    <p className="text-xl font-black text-black">{TYPE_LABELS[venue.type] || venue.type}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Guest Capacity</label>
                    <p className="text-xl font-black text-black">{venue.capacityMin} - {venue.capacityMax} Guests</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Dossier / Background</label>
                  <p className="text-neutral-600 font-medium leading-relaxed">{venue.description || 'No descriptive metadata captured.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-50">
                    <div className="h-10 w-10 rounded-xl bg-white border border-neutral-100 flex items-center justify-center text-black">
                      <MapIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 leading-none mb-1">Hub Location</p>
                      <p className="text-sm font-black text-black leading-none">{venue.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-50">
                    <div className="h-10 w-10 rounded-xl bg-white border border-neutral-100 flex items-center justify-center text-black">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 leading-none mb-1">Address Index</p>
                      <p className="text-sm font-black text-black leading-none truncate w-40">{venue.address}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-neutral-100 shadow-sm rounded-[2rem] overflow-hidden h-max">
              <CardHeader className="bg-black px-8 py-6 border-b-2 border-neutral-900 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-white">Property Management</CardTitle>
                <Users className="h-5 w-5 text-neutral-500" />
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-neutral-100 flex items-center justify-center font-black text-neutral-400 text-lg uppercase">
                    {venue.owner?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-lg font-black text-black leading-tight uppercase tracking-tight">{venue.owner?.name || 'Unknown'}</p>
                    <Badge className="mt-1 bg-black text-white text-[8px] font-black uppercase">Owner ID: #{venue.owner?.id}</Badge>
                  </div>
                </div>
                <div className="space-y-4 pt-4">
                  <div className="group flex items-center justify-between p-3 border-b border-neutral-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-neutral-400" />
                      <span className="text-xs font-bold text-neutral-600">{venue.owner?.email || 'N/A'}</span>
                    </div>
                    <ExternalLink className="h-3 w-3 text-neutral-200 group-hover:text-black" />
                  </div>
                  <div className="group flex items-center justify-between p-3 border-b border-neutral-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-neutral-400" />
                      <span className="text-xs font-bold text-neutral-600">{venue.owner?.phone || 'N/A'}</span>
                    </div>
                    <ExternalLink className="h-3 w-3 text-neutral-200 group-hover:text-black" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gallery" className="space-y-8 mt-0 focus-visible:outline-none">
          <Card className="border-2 border-neutral-100 shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-neutral-50 px-8 py-6 border-b-2 border-neutral-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black">Property Visual Audit</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-black text-white font-black text-[9px]">{venue.photos?.length || 0} Assets</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {venue.photos && venue.photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {venue.photos.map((img: any, i: number) => (
                    <div key={i} className="group relative aspect-video rounded-3xl overflow-hidden border-2 border-neutral-100 bg-neutral-50 hover:border-black transition-all">
                      <img src={img.url} alt="Venue" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute top-4 right-4">
                        {img.isCover && <Badge className="bg-emerald-500 text-white font-black text-[8px] uppercase">Primary</Badge>}
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" className="h-10 w-10 bg-white text-black hover:bg-black hover:text-white rounded-full transition-all"><Maximize2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-24 text-center flex flex-col items-center gap-4 text-neutral-300">
                  <ImageIcon className="h-20 w-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Digital visual assets missing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-8 mt-0 focus-visible:outline-none">
          <Card className="border-2 border-neutral-100 shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-neutral-50 px-8 py-6 border-b-2 border-neutral-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black">Operational Stream</CardTitle>
              <Zap className="h-5 w-5 text-neutral-300" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-neutral-100 text-[9px] font-black uppercase tracking-widest text-neutral-400">
                      <th className="py-4 px-8">Sync Date</th>
                      <th className="py-4 px-8">Segment</th>
                      <th className="py-4 px-8">Status</th>
                      <th className="py-4 px-8 text-right">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {venue.availabilitySlots?.map((slot: any, i: number) => (
                      <tr key={i} className="group hover:bg-neutral-50/50 transition-colors">
                        <td className="py-5 px-8 text-xs font-black text-black">{new Date(slot.date).toLocaleDateString()}</td>
                        <td className="py-5 px-8 text-xs font-bold text-neutral-500">{slot.timeSlot}</td>
                        <td className="py-5 px-8">
                          <Badge variant="outline" className={`rounded text-[8px] font-black uppercase ${slot.status === 'AVAILABLE' ? 'border-emerald-200 text-emerald-600' : 'border-neutral-200 text-neutral-400'}`}>
                            {slot.status}
                          </Badge>
                        </td>
                        <td className="py-5 px-8 text-right text-[10px] font-bold text-neutral-300">#{slot.id}</td>
                      </tr>
                    ))}
                    {(!venue.availabilitySlots || venue.availabilitySlots.length === 0) && (
                      <tr><td colSpan={4} className="py-24 text-center text-[10px] font-black uppercase tracking-widest text-neutral-300">No operational logs found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kyc" className="space-y-8 mt-0 focus-visible:outline-none">
          <Card className="border-2 border-neutral-100 shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-neutral-50 px-8 py-6 border-b-2 border-neutral-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black">Asset Ownership Audit</CardTitle>
              <ShieldCheck className={`h-5 w-5 ${venue.kyc?.status === 'VERIFIED' ? 'text-emerald-500' : 'text-amber-500'}`} />
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex items-center gap-4 p-6 rounded-2xl bg-neutral-50 border-2 border-neutral-100 mb-8 max-w-md">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${venue.kyc?.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 leading-none mb-1">Dossier Status</p>
                  <p className="text-lg font-black text-black leading-none">{venue.kyc?.status || 'PENDING'}</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {venue.kyc?.documents?.map((doc: any, i: number) => (
                  <div key={i} className="p-6 rounded-[1.5rem] border-2 border-neutral-100 flex items-center justify-between group hover:border-black transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400 group-hover:text-black transition-colors">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-black uppercase tracking-tight">{doc.docType}</p>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{doc.status}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="font-black text-[10px] uppercase tracking-widest h-10 px-4 rounded-xl border border-transparent hover:border-neutral-200">View Asset</Button>
                  </div>
                ))}
                {(!venue.kyc?.documents || venue.kyc.documents.length === 0) && (
                  <div className="col-span-full py-24 text-center text-neutral-300 font-black uppercase tracking-widest text-[10px]">No verification assets found for owner ID #{venue.ownerId}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-8 mt-0 focus-visible:outline-none">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { label: 'Morning Cluster', time: '06:00 - 12:00', price: venue.basePriceMorning, icon: Zap },
              { label: 'Evening Cluster', time: '16:00 - 22:00', price: venue.basePriceEvening, icon: Star },
              { label: 'Full Protocol', time: '24 Hour Block', price: venue.basePriceFullDay, icon: Maximize2 },
            ].map((tier, i) => (
              <Card key={i} className="border-2 border-neutral-100 shadow-sm rounded-[2rem] overflow-hidden group hover:border-black transition-all">
                <div className="p-8 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="h-12 w-12 rounded-2xl bg-neutral-50 flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-all">
                      <tier.icon className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" className="border-neutral-100 text-[8px] font-black uppercase">{tier.time}</Badge>
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">{tier.label}</h4>
                    <p className="text-3xl font-black text-black tracking-tighter mt-1">₹{tier.price?.toLocaleString() || '---'}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Registry Metadata */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-6 border-b-4 border-black bg-neutral-50 rounded-2xl">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-neutral-400 mb-1">State Updated</p>
          <p className="text-xs font-black text-black leading-none">{new Date(venue.updatedAt).toLocaleString()}</p>
        </Card>
        <Card className="p-6 border-b-4 border-black bg-neutral-50 rounded-2xl">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-neutral-400 mb-1">Asset Complexity</p>
          <p className="text-xs font-black text-black leading-none uppercase">High</p>
        </Card>
        <Card className="p-6 border-b-4 border-black bg-neutral-50 rounded-2xl">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-neutral-400 mb-1">Availability Hub</p>
          <p className="text-xs font-black text-emerald-600 leading-none uppercase">Live Link</p>
        </Card>
        <Card className="p-6 border-b-4 border-black bg-neutral-50 rounded-2xl">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-neutral-400 mb-1">Relational Hash</p>
          <p className="text-xs font-black text-black leading-none uppercase">Linked #{venue.ownerId}</p>
        </Card>
      </div>
    </div>
  );
}
