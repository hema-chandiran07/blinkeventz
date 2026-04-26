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
  Clock, XCircle, RefreshCw, Loader2, Save
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
export default function VendorKycPage() {
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
      const response = await api.get("/kyc/vendor/me");
      if (response.data) {
        setKycStatus(response.data);
        setKycFormData(prev => ({
          ...prev,
          docType: response.data.docType || "PAN",
          docNumber: response.data.docNumber || "",
        }));
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
      const response = await api.get("/bank-account/vendor");
      // Handle both { success: true, data: {...} } and direct object responses
      const bankData = response.data?.data || response.data;
      if (bankData) {
        setBankDetails(bankData);
        setBankFormData({
          accountHolder: bankData.accountHolder || "",
          bankAccountNumber: bankData.accountNumber || "",
          ifscCode: bankData.ifsc || "",
          bankName: bankData.bankName || "",
          branchName: bankData.branchName || "",
        });
      }
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error("Failed to load bank details:", error);
      }
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

      await api.post("/kyc/vendor", formDataToSend, {
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
        // Update existing bank details
        await api.put(`/bank-account/${bankDetails.id}`, payload);
        toast.success("Bank details updated successfully!");
      } else {
        // Create new bank details
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
                    Your business has been successfully verified. You can now receive payments.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-green-600">Document Type</p>
                      <p className="font-medium text-green-900">{kycStatus.docType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Document Number</p>
                      <p className="font-medium text-green-900">{kycStatus.docNumber}</p>
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
                    Complete KYC verification to activate your vendor profile
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  const showKycForm = kycStatus?.status === "NOT_SUBMITTED" || kycStatus?.status === "REJECTED";
  const canEditBank = !bankDetails || isEditingBank;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-black mb-2">KYC & Bank Details</h1>
        <p className="text-neutral-600">Complete verification to activate your business and receive payments</p>
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
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <CardTitle className="text-black">
                <FileText className="h-5 w-5" />
                KYC Document Verification
              </CardTitle>
              <CardDescription>Upload your identity proof for verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="docType" className="text-black font-medium">Document Type *</Label>
                <select
                  id="docType"
                  value={kycFormData.docType}
                  onChange={(e) => setKycFormData({ ...kycFormData, docType: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-silver-200 bg-white px-3 py-2 text-sm text-black"
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
                  className="border-silver-200 bg-white text-black"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-black font-medium">Upload Document *</Label>
                <div className="border-2 border-dashed border-silver-200 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="document"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="document" className="cursor-pointer">
                    <Upload className="h-10 w-10 text-neutral-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-black mb-1">
                      {file ? file.name : "Click to upload document"}
                    </p>
                    <p className="text-xs text-neutral-600">PDF, JPG, or PNG (max 5MB)</p>
                  </label>
                </div>
                {file && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setFile(null); setPreviewUrl(null); }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full h-12 bg-black hover:bg-neutral-800" disabled={kycSubmitting}>
                {kycSubmitting ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <><CheckCircle2 className="h-5 w-5 mr-2" /> Submit KYC Document</>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.form>
      )}

      {/* Bank Details Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {bankDetails && !isEditingBank ? (
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-black">
                    <Building className="h-5 w-5" />
                    Bank Account Details
                  </CardTitle>
                  <CardDescription>Your registered bank account for receiving payments</CardDescription>
                </div>
                <div className="flex gap-2">
                  {bankDetails.isVerified && (
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                    </Badge>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditingBank(true)}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Modify
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-600">Account Holder</p>
                  <p className="font-medium text-black">{bankDetails.accountHolder}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600">Account Number</p>
                  <p className="font-medium text-black">
                    {bankDetails.accountNumber?.length > 4 
                      ? `XXXX XXXX ${bankDetails.accountNumber.slice(-4)}` 
                      : 'Not available'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600">IFSC Code</p>
                  <p className="font-medium text-black">{bankDetails.ifsc}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600">Bank Name</p>
                  <p className="font-medium text-black">{bankDetails.bankName}</p>
                </div>
                {bankDetails.branchName && (
                  <div>
                    <p className="text-sm text-neutral-600">Branch Name</p>
                    <p className="font-medium text-black">{bankDetails.branchName}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <CardTitle className="text-black">
                <Building className="h-5 w-5" />
                {bankDetails ? "Update Bank Account Details" : "Add Bank Account Details"}
              </CardTitle>
              <CardDescription>For receiving payments from bookings</CardDescription>
            </CardHeader>
            <form onSubmit={handleBankSubmit} className="space-y-6">
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Account Holder Name *</Label>
                    <Input
                      placeholder="As per bank records"
                      value={bankFormData.accountHolder}
                      onChange={(e) => setBankFormData({ ...bankFormData, accountHolder: e.target.value })}
                      className="border-silver-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Account Number *</Label>
                    <Input
                      placeholder="Enter account number"
                      value={bankFormData.bankAccountNumber}
                      onChange={(e) => setBankFormData({ ...bankFormData, bankAccountNumber: e.target.value })}
                      className="border-silver-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-black font-medium">IFSC Code *</Label>
                    <Input
                      placeholder="e.g., SBIN0001234"
                      value={bankFormData.ifscCode}
                      onChange={(e) => setBankFormData({ ...bankFormData, ifscCode: e.target.value.toUpperCase() })}
                      className="border-silver-200"
                      maxLength={11}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Bank Name *</Label>
                    <Input
                      placeholder="e.g., State Bank of India"
                      value={bankFormData.bankName}
                      onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                      className="border-silver-200"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-black font-medium">Branch Name</Label>
                    <Input
                      placeholder="e.g., Main Branch, Chennai"
                      value={bankFormData.branchName}
                      onChange={(e) => setBankFormData({ ...bankFormData, branchName: e.target.value })}
                      className="border-silver-200"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-silver-50 rounded-lg border border-silver-200">
                  <Lock className="h-5 w-5 text-neutral-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-black mb-1">Secure & Encrypted</p>
                    <p className="text-xs text-neutral-600">
                      Your bank details are encrypted and used only for payment processing.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1 h-12 bg-black hover:bg-neutral-800" disabled={bankSubmitting}>
                    {bankSubmitting ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="h-5 w-5 mr-2" /> {bankDetails ? "Update Bank Details" : "Save Bank Details"}</>
                    )}
                  </Button>
                  {bankDetails && (
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-12"
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
