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

interface KycStatus {
  status: "pending" | "verified" | "rejected" | "not_submitted";
  docType?: string;
  docNumber?: string;
  submittedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

interface BankDetails {
  id: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  branchName: string;
  isVerified: boolean;
}

export default function VenueOwnerKycPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [bankSubmitting, setBankSubmitting] = useState(false);

  const [kycStatus, setKycStatus] = useState<KycStatus>({ status: "not_submitted" });
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

  useEffect(() => {
    loadKycStatus();
    loadBankDetails();
  }, []);

  const loadKycStatus = async () => {
    try {
      const response = await api.get("/kyc/venue-owner/status");
      if (response.data) {
        setKycStatus(response.data);
        if (response.data.status !== "not_submitted") {
          setKycFormData(prev => ({
            ...prev,
            docType: response.data.docType || "PAN",
            docNumber: response.data.docNumber || "",
          }));
        }
      }
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error("Failed to load KYC status:", error);
      }
    }
  };

  const loadBankDetails = async () => {
    try {
      const response = await api.get("/bank-account/venue-owner");
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

    if (kycStatus.status === "not_submitted" && !file) {
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

      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
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
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const getStatusCard = () => {
    if (!kycStatus || kycStatus.status === "not_submitted") return null;

    if (kycStatus.status === "verified") {
      return (
        <Card className="border-2 border-green-300 bg-green-50">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 text-lg">KYC Verified</h3>
                <p className="text-sm text-green-700 mt-1">
                  Your identity has been successfully verified. You can now receive payouts.
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
    }

    if (kycStatus.status === "pending") {
      return (
        <Card className="border-2 border-yellow-300 bg-yellow-50">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-900 text-lg">Verification Pending</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Your KYC documents are under review. This usually takes 24-48 hours.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (kycStatus.status === "rejected") {
      return (
        <Card className="border-2 border-red-300 bg-red-50">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
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
                    setKycStatus({ status: "not_submitted" });
                    setKycFormData({ docType: "PAN", docNumber: "" });
                    setFile(null);
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                    }
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
    }

    return (
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <Shield className="h-12 w-12 text-blue-600" />
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
  };

  const showKycForm = kycStatus.status === "not_submitted" || kycStatus.status === "rejected";
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
          <Card className="border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="text-black">
                <FileText className="h-5 w-5" />
                Owner Identity Proof
              </CardTitle>
              <CardDescription className="text-neutral-600">Upload your identity proof for verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="docType" className="text-black font-medium">Document Type *</Label>
                <select
                  id="docType"
                  value={kycFormData.docType}
                  onChange={(e) => setKycFormData({ ...kycFormData, docType: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-black"
                >
                  <option value="PAN">PAN Card</option>
                  <option value="AADHAAR">Aadhaar Card</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="docNumber" className="text-black font-medium">Document Number *</Label>
                <Input
                  id="docNumber"
                  placeholder="Enter document number"
                  value={kycFormData.docNumber}
                  onChange={(e) => setKycFormData({ ...kycFormData, docNumber: e.target.value.toUpperCase() })}
                  className="border-neutral-300 bg-white text-black"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-black font-medium">Upload Document *</Label>
                <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center">
                  {previewUrl ? (
                    <div className="space-y-4">
                      <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-4 w-4 text-neutral-600" />
                        <span className="text-sm text-neutral-600">{file?.name}</span>
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
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-10 w-10 mx-auto text-neutral-400" />
                      <div>
                        <Label htmlFor="file-upload" className="cursor-pointer">
                          <span className="text-black font-medium">Click to upload</span>
                          <span className="text-neutral-600"> or drag and drop</span>
                        </Label>
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <p className="text-xs text-neutral-600 mt-1">PDF, JPG or PNG (max 5MB)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full h-12 bg-black hover:bg-neutral-800" disabled={kycSubmitting}>
                {kycSubmitting ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <><CheckCircle2 className="h-5 w-5 mr-2" /> {kycStatus.status === "rejected" ? "Resubmit KYC" : "Submit KYC"}</>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.form>
      )}

      {/* Bank Details Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {bankDetails && !isEditingBank ? (
          <Card className="border-neutral-200 bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-black">
                    <Building className="h-5 w-5" />
                    Bank Account Details
                  </CardTitle>
                  <CardDescription className="text-neutral-600">Your registered bank account for receiving payments</CardDescription>
                </div>
                <div className="flex gap-2">
                  {bankDetails.isVerified && (
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setIsEditingBank(true)}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Update
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
                    {bankDetails.accountNumber.includes("X") 
                      ? bankDetails.accountNumber 
                      : bankDetails.accountNumber.length > 4 
                        ? "XXXX XXXX " + bankDetails.accountNumber.slice(-4)
                        : bankDetails.accountNumber}
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
                  <div className="md:col-span-2">
                    <p className="text-sm text-neutral-600">Branch Name</p>
                    <p className="font-medium text-black">{bankDetails.branchName}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="text-black">
                <Building className="h-5 w-5" />
                {bankDetails ? "Update Bank Account Details" : "Add Bank Account Details"}
              </CardTitle>
              <CardDescription className="text-neutral-600">For receiving payments from bookings</CardDescription>
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
                      className="border-neutral-300 bg-white text-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Account Number *</Label>
                    <Input
                      placeholder="Enter account number"
                      value={bankFormData.bankAccountNumber}
                      onChange={(e) => setBankFormData({ ...bankFormData, bankAccountNumber: e.target.value })}
                      className="border-neutral-300 bg-white text-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-black font-medium">IFSC Code *</Label>
                    <Input
                      placeholder="e.g., SBIN0001234"
                      value={bankFormData.ifscCode}
                      onChange={(e) => setBankFormData({ ...bankFormData, ifscCode: e.target.value.toUpperCase() })}
                      className="border-neutral-300 bg-white text-black"
                      maxLength={11}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Bank Name *</Label>
                    <Input
                      placeholder="e.g., State Bank of India"
                      value={bankFormData.bankName}
                      onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                      className="border-neutral-300 bg-white text-black"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-black font-medium">Branch Name</Label>
                    <Input
                      placeholder="e.g., Anna Nagar Branch"
                      value={bankFormData.branchName}
                      onChange={(e) => setBankFormData({ ...bankFormData, branchName: e.target.value })}
                      className="border-neutral-300 bg-white text-black"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <Lock className="h-5 w-5 text-neutral-600 flex-shrink-0" />
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
