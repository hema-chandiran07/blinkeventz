"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileText, CheckCircle2, Shield, Lock, Building, AlertCircle,
  Clock, XCircle, RefreshCw, Loader2, Save, MapPin
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ==================== Types ====================
interface KycStatus {
  status: "PENDING" | "VERIFIED" | "REJECTED" | "NOT_SUBMITTED";
  docType?: string;
  docNumber?: string;
  submittedAt?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

interface BankDetails {
  id?: number;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  branchName?: string;
  isVerified?: boolean;
}

// ==================== Constants ====================
const DOC_TYPES = [
  { value: "PAN", label: "PAN Card" },
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
];

// ==================== Main Component ====================
export default function VenueOwnerKycPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [bankSubmitting, setBankSubmitting] = useState(false);
  
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  
  // KYC Form State
  const [kycFormData, setKycFormData] = useState({
    docType: "PAN",
    docNumber: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Bank Details Form State
  const [bankFormData, setBankFormData] = useState({
    accountHolder: "",
    bankAccountNumber: "",
    ifscCode: "",
    bankName: "",
    branchName: "",
  });
  const [isEditingBank, setIsEditingBank] = useState(false);

  // Load KYC status and bank details on mount
  useEffect(() => {
    loadKycStatus();
    loadBankDetails();
  }, []);

  const loadKycStatus = async () => {
    try {
      const response = await api.get("/kyc/venue-owner/status");
      if (response.data) {
        // Handle backend returning uppercase or mixed case
        const normalizedStatus = {
          ...response.data,
          status: response.data.status?.toUpperCase() || "NOT_SUBMITTED"
        };
        setKycStatus(normalizedStatus);
        
        if (normalizedStatus.status !== "NOT_SUBMITTED") {
          setKycFormData(prev => ({
            ...prev,
            docType: normalizedStatus.docType || "PAN",
            docNumber: normalizedStatus.docNumber || "",
          }));
        }
      }
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error("Failed to load KYC status:", error);
      }
      setKycStatus({ status: "NOT_SUBMITTED" });
    }
  };

  const loadBankDetails = async () => {
    try {
      const response = await api.get("/bank-account/venue-owner");
      // Handle unified { success: true, data: {...} } response
      const bankData = response.data?.data || response.data;
      
      if (bankData && (bankData.id || bankData.accountNumber)) {
        setBankDetails(bankData);
        setBankFormData({
          accountHolder: bankData.accountHolder || "",
          bankAccountNumber: bankData.accountNumber || "",
          ifscCode: bankData.ifsc || "",
          bankName: bankData.bankName || "",
          branchName: bankData.branchName || "",
        });
      } else {
        setBankDetails(null);
      }
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error("Failed to load bank details:", error);
      }
      setBankDetails(null);
    }
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!kycFormData.docNumber.trim()) {
      toast.error("Please enter document number");
      return;
    }

    if (kycStatus?.status === "NOT_SUBMITTED" && !file) {
      toast.error("Please upload document");
      return;
    }

    setKycSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("docType", kycFormData.docType);
      formDataToSend.append("docNumber", kycFormData.docNumber);

      if (file) {
        formDataToSend.append("document", file);
      }

      await api.post("/kyc/venue-owner", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("KYC submitted successfully! Please wait for verification.");
      loadKycStatus();
      setFile(null);
      setPreviewUrl(null);
    } catch (error: any) {
      console.error("KYC submission error:", error);
      toast.error(error?.response?.data?.message || "Failed to submit KYC");
    } finally {
      setKycSubmitting(false);
    }
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankFormData.accountHolder.trim()) {
      toast.error("Please enter account holder name");
      return;
    }
    if (!bankFormData.bankAccountNumber.trim()) {
      toast.error("Please enter bank account number");
      return;
    }
    if (!bankFormData.ifscCode.trim()) {
      toast.error("Please enter IFSC code");
      return;
    }
    if (!bankFormData.bankName.trim()) {
      toast.error("Please enter bank name");
      return;
    }

    setBankSubmitting(true);

    try {
      const payload = {
        accountHolder: bankFormData.accountHolder,
        accountNumber: bankFormData.bankAccountNumber,
        ifsc: bankFormData.ifscCode,
        bankName: bankFormData.bankName,
        branchName: bankFormData.branchName,
      };

      if (bankDetails?.id) {
        await api.put(`/bank-account/${bankDetails.id}`, payload);
        toast.success("Bank details updated successfully!");
      } else {
        await api.post("/bank-account", payload);
        toast.success("Bank details added successfully!");
      }

      loadBankDetails();
      setIsEditingBank(false);
    } catch (error: any) {
      console.error("Bank details submission error:", error);
      toast.error(error?.response?.data?.message || "Failed to update bank details");
    } finally {
      setBankSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error("Please upload PDF or image file (JPG/PNG)");
        e.target.value = "";
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        e.target.value = "";
        return;
      }

      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const getStatusCard = () => {
    if (!kycStatus) return null;

    switch (kycStatus.status) {
      case "VERIFIED":
        return (
          <Card className="border-2 border-green-300 bg-green-50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 text-lg">KYC Verified</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Your identity has been successfully verified. You can now receive payments.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-green-600">Document Type</p>
                      <p className="font-medium text-green-900">{kycStatus.docType || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Document Number</p>
                      <p className="font-medium text-green-900">{kycStatus.docNumber || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "PENDING":
        return (
          <Card className="border-2 border-yellow-300 bg-yellow-50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 text-lg">Verification Pending</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Your KYC documents are under review. This usually takes 24-48 hours.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "REJECTED":
        return (
          <Card className="border-2 border-red-300 bg-red-50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 text-lg">Verification Failed</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Your KYC documents could not be verified. Please resubmit with correct information.
                  </p>
                  {kycStatus.rejectionReason && (
                    <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-200">
                      <p className="text-xs font-medium text-red-800">Reason for rejection:</p>
                      <p className="text-sm text-red-700 mt-1">{kycStatus.rejectionReason}</p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="mt-4 text-red-700 border-red-300 hover:bg-red-100"
                    onClick={() => {
                      setKycStatus({ status: "NOT_SUBMITTED" });
                      setKycFormData({ docType: "PAN", docNumber: "" });
                      setFile(null);
                      setPreviewUrl(null);
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resubmit KYC
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <Shield className="h-12 w-12 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 text-lg">KYC Verification Required</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Complete KYC verification to activate your venue and receive payouts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  const showKycForm = !kycStatus || kycStatus.status === "NOT_SUBMITTED" || kycStatus.status === "REJECTED";
  const canEditBank = !bankDetails || isEditingBank;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-black mb-2">KYC & Bank Details</h1>
        <p className="text-neutral-600">Complete verification to activate your venue and receive payouts</p>
      </motion.div>

      {/* KYC Status */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {getStatusCard()}
      </motion.div>

      {/* KYC Form Section */}
      {showKycForm && (
        <motion.form
          onSubmit={handleKycSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-neutral-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-black inline-flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Owner Identity Proof
              </CardTitle>
              <CardDescription className="text-neutral-600">Upload your identity proof for verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="docType" className="text-black font-medium">Document Type *</Label>
                  <select
                    id="docType"
                    value={kycFormData.docType}
                    onChange={(e) => setKycFormData({ ...kycFormData, docType: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    {DOC_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="docNumber" className="text-black font-medium">Document Number *</Label>
                  <Input
                    id="docNumber"
                    placeholder="Enter document number"
                    value={kycFormData.docNumber}
                    onChange={(e) => setKycFormData({ ...kycFormData, docNumber: e.target.value.toUpperCase() })}
                    className="border-neutral-300 bg-white text-black focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-black font-medium">Upload Document *</Label>
                <div className={cn(
                  "border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center transition-colors",
                  previewUrl ? "border-solid border-green-200 bg-green-50/10" : "hover:border-neutral-400"
                )}>
                  {previewUrl ? (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <img src={previewUrl} alt="Preview" className="max-h-64 rounded-lg shadow-lg border border-white" />
                        <div className="absolute -top-3 -right-3">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="rounded-full h-8 w-8"
                            onClick={() => { setFile(null); setPreviewUrl(null); }}
                          >
                            <XCircle className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-green-700">{file?.name}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="h-16 w-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Upload className="h-8 w-8 text-neutral-400" />
                      </div>
                      <div>
                        <Label htmlFor="file-upload" className="cursor-pointer group">
                          <span className="text-black font-bold text-lg group-hover:underline">Click to upload</span>
                          <span className="text-neutral-500 block text-sm mt-1 uppercase tracking-widest font-black">PDF, JPG or PNG (MAX 5MB)</span>
                        </Label>
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full h-12 bg-black hover:bg-neutral-800 text-white font-black uppercase tracking-[0.2em] rounded-none" disabled={kycSubmitting}>
                {kycSubmitting ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><CheckCircle2 className="h-5 w-5 mr-2" /> Submit Verification</>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.form>
      )}

      {/* Bank Details Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {bankDetails && !isEditingBank ? (
          <Card className="border-neutral-200 bg-white shadow-sm">
            <CardHeader className="border-b border-neutral-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-black inline-flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Paiments Wallet & Bank
                  </CardTitle>
                  <CardDescription className="text-neutral-500">Your registered destination for all booking earnings</CardDescription>
                </div>
                <div className="flex gap-2">
                  {bankDetails.isVerified && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 rounded-full font-black text-[10px] uppercase tracking-wider">
                      Verified
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingBank(true)} className="font-black text-[10px] uppercase tracking-widest hover:bg-neutral-100">
                    <RefreshCw className="h-3 w-3 mr-1" /> Update
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">Account Holder</p>
                  <p className="font-bold text-black text-xl">{bankDetails.accountHolder}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">Account Number</p>
                  <p className="font-bold text-black text-xl tracking-tighter">
                    {bankDetails.accountNumber && bankDetails.accountNumber.length > 4 
                      ? `XXXX XXXX ${bankDetails.accountNumber.slice(-4)}` 
                      : (bankDetails.accountNumber || 'N/A')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">IFSC Code</p>
                  <p className="font-bold text-black text-xl tracking-tighter">{bankDetails.ifsc}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">Bank Name</p>
                  <p className="font-bold text-black text-xl">{bankDetails.bankName}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-neutral-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100">
              <CardTitle className="text-black inline-flex items-center gap-2">
                <Building className="h-5 w-5" />
                {bankDetails ? "Update Payout Method" : "Setup Payout Method"}
              </CardTitle>
              <CardDescription className="text-neutral-600 font-medium">Add bank details to receive your venue booking earnings</CardDescription>
            </CardHeader>
            <form onSubmit={handleBankSubmit}>
              <CardContent className="space-y-8 pt-8">
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Account Holder Name *</Label>
                    <Input
                      placeholder="AS PER BANK RECORDS"
                      value={bankFormData.accountHolder}
                      onChange={(e) => setBankFormData({ ...bankFormData, accountHolder: e.target.value.toUpperCase() })}
                      className="border-neutral-200 bg-white text-black font-bold h-12 rounded-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Bank Account Number *</Label>
                    <Input
                      placeholder="ENTER ACCOUNT NUMBER"
                      value={bankFormData.bankAccountNumber}
                      onChange={(e) => setBankFormData({ ...bankFormData, bankAccountNumber: e.target.value })}
                      className="border-neutral-200 bg-white text-black font-bold h-12 rounded-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">IFSC Code *</Label>
                    <Input
                      placeholder="E.G., SBIN0001234"
                      value={bankFormData.ifscCode}
                      onChange={(e) => setBankFormData({ ...bankFormData, ifscCode: e.target.value.toUpperCase() })}
                      className="border-neutral-200 bg-white text-black font-bold h-12 rounded-none"
                      maxLength={11}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Bank Name *</Label>
                    <Input
                      placeholder="E.G., STATE BANK OF INDIA"
                      value={bankFormData.bankName}
                      onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value.toUpperCase() })}
                      className="border-neutral-200 bg-white text-black font-bold h-12 rounded-none"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Branch Name</Label>
                    <Input
                      placeholder="E.G., MAIN BRANCH"
                      value={bankFormData.branchName}
                      onChange={(e) => setBankFormData({ ...bankFormData, branchName: e.target.value.toUpperCase() })}
                      className="border-neutral-200 bg-white text-black font-bold h-12 rounded-none"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Button type="submit" className="h-14 bg-black hover:bg-neutral-800 text-white font-black uppercase tracking-[0.2em] rounded-none" disabled={bankSubmitting}>
                    {bankSubmitting ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Processing...</>
                    ) : (
                      <><Save className="h-5 w-5 mr-2" /> Save Bank Details</>
                    )}
                  </Button>
                  {bankDetails && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-14 font-black uppercase tracking-[0.2em] rounded-none"
                      onClick={() => setIsEditingBank(false)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </form>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
