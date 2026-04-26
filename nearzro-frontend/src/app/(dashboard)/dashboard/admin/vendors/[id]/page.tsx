"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Edit, MapPin, CheckCircle2, XCircle, Calendar, Download, Share2, 
  Store, Package, Loader2, X, ShieldCheck, AlertCircle, Mail, Phone, ExternalLink,
  History, CreditCard, Star, Image as ImageIcon, Briefcase
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface VendorDetail {
  id: number;
  userId: number;
  businessName: string;
  description?: string;
  city: string;
  area: string;
  serviceRadiusKm?: number;
  verificationStatus: string;
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  };
  services?: any[];
  portfolio?: any[];
  kyc?: {
    status: string;
    documents: any[];
  };
  bankAccounts?: any[];
  reviews?: any[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminVendorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadVendor();
  }, [params.id]);

  const loadVendor = async () => {
    try {
      setLoading(true);
      // Using the new admin details endpoint
      const response = await api.get(`/vendors/admin/${params.id}`);
      setVendor(response.data || null);
    } catch (error: any) {
      console.error("Failed to load vendor:", error);
      toast.error("Critical error while retrieving vendor dossier");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string, reason?: string) => {
    try {
      setActionLoading(true);
      if (status === 'VERIFIED') {
        await api.patch(`/vendors/${vendor?.id}/approve`);
      } else if (status === 'REJECTED') {
        await api.patch(`/vendors/${vendor?.id}/reject`, { reason });
      } else {
        await api.patch(`/vendors/admin/${vendor?.id}/status`, { status, reason });
      }
      toast.success(`Operational status updated to ${status}`);
      loadVendor();
    } catch (error: any) {
      toast.error("Failed to update vendor operational status");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-16 w-16 border-[4px] border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Syncing Vendor Dossier</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <AlertCircle className="h-20 w-20 text-red-600" />
        <div className="text-center">
          <h3 className="text-2xl font-black text-black uppercase tracking-tight">Record Terminated</h3>
          <p className="text-neutral-500 font-medium mt-1">Vendor ID {params.id} does not exist in the registry.</p>
        </div>
        <Button onClick={() => router.push("/dashboard/admin/vendors")} className="h-12 bg-black text-white px-8 rounded-xl font-bold">
          <ArrowLeft className="h-4 w-4 mr-2" /> Return to Registry
        </Button>
      </div>
    );
  }

  const kycStatus = vendor.kyc?.status || 'PENDING';

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
            <ArrowLeft className="h-4 w-4" /> Return to List
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-[2.5rem] bg-black flex items-center justify-center font-black text-white text-3xl shadow-2xl shadow-black/20">
              {vendor.businessName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black tracking-tighter text-black uppercase">{vendor.businessName}</h1>
                <Badge className={`rounded px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${
                  vendor.verificationStatus === 'VERIFIED' ? 'bg-emerald-600' : 
                  vendor.verificationStatus === 'REJECTED' ? 'bg-red-600' : 'bg-amber-500'
                } text-white`}>
                  {vendor.verificationStatus}
                </Badge>
              </div>
              <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs mt-1 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-neutral-300" /> {vendor.area}, {vendor.city} • Registry ID: #{vendor.id}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {vendor.verificationStatus === 'PENDING' && (
            <>
              <Button 
                onClick={() => handleStatusUpdate('VERIFIED')} 
                disabled={actionLoading}
                className="h-12 bg-emerald-600 text-white hover:bg-emerald-700 px-6 rounded-xl font-bold border-b-4 border-emerald-800 active:border-b-0 transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5" /> AUTHORIZE PARTNER
              </Button>
              <Button 
                onClick={() => {
                  const reason = prompt("Enter rejection reason:");
                  if (reason) handleStatusUpdate('REJECTED', reason);
                }} 
                disabled={actionLoading}
                className="h-12 bg-white text-red-600 hover:bg-red-50 px-6 rounded-xl font-bold border-2 border-red-100 flex items-center gap-2"
              >
                <XCircle className="h-5 w-5" /> REJECT APPLICATION
              </Button>
            </>
          )}
          <Button 
            onClick={() => router.push(`/dashboard/admin/vendors/${vendor.id}/edit`)}
            className="h-12 bg-black text-white hover:bg-neutral-800 px-6 rounded-xl font-bold border-b-4 border-neutral-900 active:border-b-0 transition-all flex items-center gap-2"
          >
            <Edit className="h-5 w-5" /> EDIT CONFIG
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-neutral-100 p-1.5 rounded-[2rem] w-full lg:w-max flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: Briefcase },
            { id: 'portfolio', label: 'Portfolio', icon: ImageIcon },
            { id: 'services', label: 'Services', icon: Package },
            { id: 'kyc', label: 'KYC & Banking', icon: ShieldCheck },
            { id: 'reviews', label: 'Reviews', icon: Star },
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
          <div className="grid gap-6 md:grid-cols-3">
             <Card className="md:col-span-2 border-2 border-neutral-100 shadow-sm rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-neutral-50 px-8 py-6 border-b-2 border-neutral-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black">Business Dossier</CardTitle>
                  <Briefcase className="h-5 w-5 text-neutral-300" />
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Official Name</label>
                       <p className="text-xl font-black text-black">{vendor.businessName}</p>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Radius Capacity</label>
                       <p className="text-xl font-black text-black">{vendor.serviceRadiusKm || 'GLOBAL'} KM</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Business Bio</label>
                    <p className="text-neutral-600 font-medium leading-relaxed">{vendor.description || 'No description provided in record.'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-8 pt-4">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-50">
                       <div className="h-10 w-10 rounded-xl bg-white border border-neutral-100 flex items-center justify-center text-black">
                         <MapPin className="h-5 w-5" />
                       </div>
                       <div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 leading-none mb-1">Stationed at</p>
                         <p className="text-sm font-black text-black leading-none">{vendor.city}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-50">
                       <div className="h-10 w-10 rounded-xl bg-white border border-neutral-100 flex items-center justify-center text-black">
                         <Calendar className="h-5 w-5" />
                       </div>
                       <div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 leading-none mb-1">Registered on</p>
                         <p className="text-sm font-black text-black leading-none">{new Date(vendor.createdAt).toLocaleDateString()}</p>
                       </div>
                    </div>
                  </div>
                </CardContent>
             </Card>

             <Card className="border-2 border-neutral-100 shadow-sm rounded-[2rem] overflow-hidden h-max">
                <CardHeader className="bg-black px-8 py-6 border-b-2 border-neutral-900 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-white">Representative</CardTitle>
                  <ShieldCheck className="h-5 w-5 text-neutral-500" />
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-neutral-100 flex items-center justify-center font-black text-neutral-400 text-lg">
                        {vendor.user?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-lg font-black text-black leading-tight">{vendor.user?.name || 'N/A'}</p>
                        <Badge className="mt-1 bg-black text-white text-[8px] font-black uppercase">User ID: #{vendor.user?.id}</Badge>
                      </div>
                   </div>
                   <div className="space-y-4 pt-4">
                      <div className="group flex items-center justify-between p-3 border-b border-neutral-50 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-neutral-400" />
                          <span className="text-xs font-bold text-neutral-600">{vendor.user?.email || 'N/A'}</span>
                        </div>
                        <ExternalLink className="h-3 w-3 text-neutral-200 group-hover:text-black" />
                      </div>
                      <div className="group flex items-center justify-between p-3 border-b border-neutral-50 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-neutral-400" />
                          <span className="text-xs font-bold text-neutral-600">{vendor.user?.phone || 'N/A'}</span>
                        </div>
                        <ExternalLink className="h-3 w-3 text-neutral-200 group-hover:text-black" />
                      </div>
                   </div>
                </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-8 mt-0 focus-visible:outline-none">
           <Card className="border-2 border-neutral-100 shadow-sm rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-neutral-50 px-8 py-6 border-b-2 border-neutral-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black">Work Samples & Media</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className="bg-black text-white font-black text-[9px]">{vendor.portfolio?.length || 0} Assets</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                 {vendor.portfolio && vendor.portfolio.length > 0 ? (
                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {vendor.portfolio.map((img: any, i: number) => (
                        <div key={i} className="group relative aspect-square rounded-3xl overflow-hidden border-2 border-neutral-100 bg-neutral-50 hover:border-black transition-all">
                           <img src={img.url} alt="Portfolio" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button variant="ghost" size="icon" className="h-10 w-10 bg-white text-black hover:bg-black hover:text-white rounded-full"><Download className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-10 w-10 bg-white text-black hover:bg-black hover:text-white rounded-full"><ExternalLink className="h-4 w-4" /></Button>
                           </div>
                        </div>
                      ))}
                   </div>
                 ) : (
                   <div className="py-24 text-center flex flex-col items-center gap-4 text-neutral-300">
                      <ImageIcon className="h-20 w-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No visual assets registered</p>
                   </div>
                 )}
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-8 mt-0 focus-visible:outline-none">
           <Card className="border-2 border-neutral-100 shadow-sm rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-neutral-50 px-8 py-6 border-b-2 border-neutral-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black">Service Catalog</CardTitle>
                <Package className="h-5 w-5 text-neutral-300" />
              </CardHeader>
              <CardContent className="p-8">
                 <div className="grid md:grid-cols-2 gap-6">
                    {vendor.services?.map((svc: any, idx: number) => (
                      <div key={idx} className="p-6 rounded-[2rem] border-2 border-neutral-100 bg-neutral-50/50 flex flex-col justify-between hover:border-black transition-all">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <Badge className="bg-black text-white text-[9px] font-black uppercase">{svc.serviceType}</Badge>
                            <span className={`h-2 w-2 rounded-full ${svc.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          </div>
                          <h4 className="text-xl font-black text-black uppercase tracking-tight leading-tight mb-2">{svc.name || svc.serviceType}</h4>
                          <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-6">{svc.pricingModel} Basis</p>
                        </div>
                        <div className="flex items-end justify-between">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Standard Rate</label>
                            <p className="text-2xl font-black text-black tracking-tighter">₹{svc.baseRate?.toLocaleString()}</p>
                          </div>
                          <Button variant="outline" className="h-10 rounded-xl border-black hover:bg-black hover:text-white transition-all">
                             Audit Log
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!vendor.services || vendor.services.length === 0) && (
                      <div className="col-span-full py-24 text-center text-neutral-300 font-black uppercase tracking-widest text-[10px]">Registry is empty for this segment</div>
                    )}
                 </div>
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="kyc" className="space-y-8 mt-0 focus-visible:outline-none">
           <div className="grid gap-8 md:grid-cols-2">
              <Card className="border-2 border-neutral-100 shadow-sm rounded-[2rem] overflow-hidden">
                 <CardHeader className="bg-neutral-50 px-8 py-6 border-b-2 border-neutral-100 flex flex-row items-center justify-between">
                   <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black">KYC Verification</CardTitle>
                   <ShieldCheck className={`h-5 w-5 ${kycStatus === 'VERIFIED' ? 'text-emerald-500' : 'text-amber-500'}`} />
                 </CardHeader>
                 <CardContent className="p-8">
                    <div className="flex items-center gap-4 p-6 rounded-2xl bg-neutral-50 border-2 border-neutral-100 mb-8">
                       <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${kycStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                         <ShieldCheck className="h-6 w-6" />
                       </div>
                       <div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 leading-none mb-1">Audit Status</p>
                         <p className="text-lg font-black text-black leading-none">{kycStatus}</p>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Attached Certificates</label>
                       {vendor.kyc?.documents?.map((doc: any, i: number) => (
                         <div key={i} className="p-4 rounded-xl border border-neutral-100 flex items-center justify-between hover:bg-neutral-50 transition-all cursor-pointer">
                            <div className="flex items-center gap-4">
                               <div className="h-10 w-10 rounded-lg bg-neutral-100 flex items-center justify-center"><Download className="h-5 w-5 text-neutral-400" /></div>
                               <div>
                                 <p className="text-xs font-black text-black">Aadhaar / PAN Registry</p>
                                 <p className="text-[10px] text-neutral-400 font-bold">{doc.status}</p>
                               </div>
                            </div>
                            <Button variant="ghost" size="sm" className="font-black text-[9px] uppercase tracking-widest">Verify</Button>
                         </div>
                       ))}
                       {(!vendor.kyc?.documents || vendor.kyc.documents.length === 0) && (
                         <div className="py-8 text-center text-neutral-300 font-black uppercase tracking-widest text-[9px]">No KYC documents found</div>
                       )}
                    </div>
                 </CardContent>
              </Card>

              <Card className="border-2 border-neutral-100 shadow-sm rounded-[2rem] overflow-hidden">
                 <CardHeader className="bg-neutral-50 px-8 py-6 border-b-2 border-neutral-100 flex flex-row items-center justify-between">
                   <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black">Banking Pipeline</CardTitle>
                   <CreditCard className="h-5 w-5 text-neutral-300" />
                 </CardHeader>
                 <CardContent className="p-8">
                    {vendor.bankAccounts?.map((bank: any, i: number) => (
                      <div key={i} className="relative p-8 rounded-[2rem] bg-black text-white overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 h-full w-full flex justify-end items-end opacity-10">
                          <CreditCard className="h-32 w-32 -rotate-12 translate-x-12 translate-y-12" />
                        </div>
                        <div className="relative z-10 space-y-8">
                           <div className="flex justify-between items-start">
                             <div className="space-y-1">
                               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Financial Institution</p>
                               <p className="text-xl font-black uppercase tracking-tight">{bank.bankName}</p>
                             </div>
                             {bank.isVerified && <Badge className="bg-emerald-500 text-white font-black text-[9px]">VERIFIED</Badge>}
                           </div>
                           <div className="space-y-1">
                             <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Account Index</p>
                             <p className="text-2xl font-black tracking-widest">{bank.accountNumberMasked || '**** **** **** 0000'}</p>
                           </div>
                           <div className="flex justify-between">
                             <div className="space-y-1">
                               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Account Holder</p>
                               <p className="text-xs font-black uppercase">{bank.accountHolder}</p>
                             </div>
                             <div className="space-y-1 text-right">
                               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">IFSC Code</p>
                               <p className="text-xs font-black uppercase">{bank.ifsc}</p>
                             </div>
                           </div>
                        </div>
                      </div>
                    ))}
                    {(!vendor.bankAccounts || vendor.bankAccounts.length === 0) && (
                      <div className="py-24 text-center text-neutral-300 font-black uppercase tracking-widest text-[10px] flex flex-col items-center gap-4">
                        <CreditCard className="h-16 w-16 opacity-20" />
                        <span>No registered banking vectors</span>
                      </div>
                    )}
                 </CardContent>
              </Card>
           </div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-8 mt-0 focus-visible:outline-none">
           <Card className="border-2 border-neutral-100 shadow-sm rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-neutral-50 px-8 py-6 border-b-2 border-neutral-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black">Market Sentiment</CardTitle>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-black text-black">4.9 Internal Rating</span>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                 <div className="grid gap-4">
                    {vendor.reviews?.map((review: any, i: number) => (
                      <div key={i} className="p-6 rounded-2xl border border-neutral-100 bg-neutral-50/30">
                        <div className="flex justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-neutral-200" />
                            <p className="text-sm font-black text-black capitalize">{review.user?.name || 'Anonymous client'}</p>
                          </div>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, star) => (
                               <Star key={star} className={`h-3 w-3 ${star < (review.rating || 5) ? 'fill-black text-black' : 'text-neutral-200'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-neutral-600 font-medium leading-relaxed italic">"{review.comment || 'Quality service provided.'}"</p>
                        <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest mt-4">{new Date(review.createdAt || Date.now()).toLocaleDateString()}</p>
                      </div>
                    ))}
                    {(!vendor.reviews || vendor.reviews.length === 0) && (
                      <div className="py-24 text-center text-neutral-300 font-black uppercase tracking-widest text-[10px]">No historical sentiment data</div>
                    )}
                 </div>
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
      
      {/* Risk Mitigation / Logs */}
      <div className="grid md:grid-cols-4 gap-4">
         <Card className="p-6 border-b-4 border-black bg-neutral-50 rounded-2xl">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-neutral-400 mb-1">Last Transmission</p>
            <p className="text-xs font-black text-black leading-none">{new Date(vendor.updatedAt).toLocaleString()}</p>
         </Card>
         <Card className="p-6 border-b-4 border-black bg-neutral-50 rounded-2xl">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-neutral-400 mb-1">Operational Tier</p>
            <p className="text-xs font-black text-black leading-none uppercase">{vendor.user?.role || 'VENDOR'}</p>
         </Card>
         <Card className="p-6 border-b-4 border-black bg-neutral-50 rounded-2xl">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-neutral-400 mb-1">System Health</p>
            <p className="text-xs font-black text-emerald-600 leading-none uppercase">Optimized</p>
         </Card>
         <Card className="p-6 border-b-4 border-black bg-neutral-50 rounded-2xl">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-neutral-400 mb-1">Relational Integrity</p>
            <p className="text-xs font-black text-black leading-none uppercase">Linked #{vendor.userId}</p>
         </Card>
      </div>
    </div>
  );
}
