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
  Clock, XCircle, RefreshCw
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
  const [kycStatus, setKycStatus] = useState<KycStatus>({ status: "not_submitted" });
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [formData, setFormData] = useState({
    docType: "PAN",
    docNumber: "",
    bankAccountNumber: "",
    ifscCode: "",
    bankName: "",
    branchName: "",
    accountHolder: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
          setFormData(prev => ({
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
      if (response.data) {
        setBankDetails(response.data);
        setFormData(prev => ({
          ...prev,
          accountHolder: response.data.accountHolder || "",
          bankAccountNumber: response.data.accountNumber || "",
          ifscCode: response.data.ifsc || "",
          bankName: response.data.bankName || "",
          branchName: response.data.branchName || "",
        }));
      }
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error("Failed to load bank details:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.docNumber.trim()) {
      toast.error("Please enter document number");
      return;
    }

    if (kycStatus.status === "not_submitted" && !file) {
      toast.error("Please upload document");
      return;
    }

    if (!formData.bankAccountNumber || !formData.ifscCode) {
      toast.error("Please enter bank account details");
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("docType", formData.docType);
      formDataToSend.append("docNumber", formData.docNumber);
      formDataToSend.append("bankAccountNumber", formData.bankAccountNumber);
      formDataToSend.append("ifscCode", formData.ifscCode);
      formDataToSend.append("bankName", formData.bankName);
      formDataToSend.append("branchName", formData.branchName);
      formDataToSend.append("accountHolder", formData.accountHolder);
      
      if (file) {
        formDataToSend.append("document", file);
      }

      await api.post("/kyc/venue-owner", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("KYC submitted successfully! Please wait for verification.");
      loadKycStatus();
    } catch (error: any) {
      console.error("KYC submission error:", error);
      toast.error(error?.response?.data?.message || "Failed to submit KYC");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (!["application/pdf", "image/jpeg", "image/png", "image/jpg"].includes(selectedFile.type)) {
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
    switch (kycStatus.status) {
      case "verified":
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
                      <p className="font-medium text-green-900">{kycStatus.docType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Document Number</p>
                      <p className="font-medium text-green-900">{kycStatus.docNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Submitted On</p>
                      <p className="font-medium text-green-900">
                        {kycStatus.submittedAt ? new Date(kycStatus.submittedAt).toLocaleDateString("en-IN") : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Verified On</p>
                      <p className="font-medium text-green-900">
                        {kycStatus.verifiedAt ? new Date(kycStatus.verifiedAt).toLocaleDateString("en-IN") : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case "pending":
        return (
          <Card className="border-2 border-yellow-300 bg-yellow-50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 text-lg">Verification Pending</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Your KYC documents are under review. This usually takes 24-48 hours.
                  </p>
                  <div className="flex items-center gap-4 mt-4">
                    <div>
                      <p className="text-xs text-yellow-600">Submitted On</p>
                      <p className="font-medium text-yellow-900">
                        {kycStatus.submittedAt ? new Date(kycStatus.submittedAt).toLocaleDateString("en-IN") : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case "rejected":
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
                    onClick={() => setKycStatus({ status: "not_submitted" })}
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
                <Shield className="h-12 w-12 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900 text-lg">KYC Verification Required</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Complete KYC verification to activate your venue and receive payouts
                  </p>
                  <ul className="space-y-1 text-sm text-blue-800 mt-3">
                    <li>• Get verified badge on your venue</li>
                    <li>• Increase visibility in search results</li>
                    <li>• Receive secure payments directly</li>
                    <li>• Build trust with customers</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-black mb-2">KYC & Bank Details</h1>
          <p className="text-neutral-600">Complete verification to activate your venue and receive payouts</p>
        </motion.div>

        {/* KYC Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          {getStatusCard()}
        </motion.div>

        {/* Bank Details Summary */}
        {bankDetails && kycStatus.status !== "not_submitted" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="border-silver-200 bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Registered Bank Account
                    </CardTitle>
                  </div>
                  {bankDetails.isVerified && (
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
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
                    <p className="font-medium text-black">XXXX XXXX {bankDetails.accountNumber.slice(-4)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600">IFSC Code</p>
                    <p className="font-medium text-black">{bankDetails.ifsc}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600">Bank Name</p>
                    <p className="font-medium text-black">{bankDetails.bankName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* KYC Form */}
        {kycStatus.status === "not_submitted" || kycStatus.status === "rejected" ? (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <Card className="border-silver-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Owner Identity Proof
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="docType" className="text-black font-medium">Document Type *</Label>
                  <select
                    id="docType"
                    value={formData.docType}
                    onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-silver-200 bg-white px-3 py-2 text-sm"
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
                    value={formData.docNumber}
                    onChange={(e) => setFormData({ ...formData, docNumber: e.target.value.toUpperCase() })}
                    className="border-silver-200"
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
                        {file ? file.name : previewUrl ? "File selected" : "Click to upload"}
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
                        onClick={() => {
                          setFile(null);
                          setPreviewUrl(null);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {previewUrl && !file && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-neutral-600 mb-2">Previously uploaded document:</p>
                      <iframe src={previewUrl} className="w-full h-64 border rounded-lg" title="Document Preview" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-silver-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Bank Account Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Account Holder Name *</Label>
                    <Input
                      placeholder="As per bank records"
                      value={formData.accountHolder}
                      onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                      className="border-silver-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Account Number *</Label>
                    <Input
                      placeholder="Enter account number"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      className="border-silver-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-black font-medium">IFSC Code *</Label>
                    <Input
                      placeholder="e.g., SBIN0001234"
                      value={formData.ifscCode}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                      className="border-silver-200"
                      maxLength={11}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Bank Name *</Label>
                    <Input
                      placeholder="e.g., State Bank of India"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="border-silver-200"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-black font-medium">Branch Name</Label>
                    <Input
                      placeholder="e.g., Anna Nagar Branch"
                      value={formData.branchName}
                      onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                      className="border-silver-200"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-silver-50 rounded-lg border border-silver-200">
                  <Lock className="h-5 w-5 text-neutral-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-black mb-1">Secure & Encrypted</p>
                    <p className="text-xs text-neutral-600">
                      Your bank details are encrypted and used only for payment processing. We never share your information with third parties.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                type="submit"
                className="flex-1 h-12 bg-black hover:bg-neutral-800"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    {kycStatus.status === "rejected" ? "Resubmit KYC" : "Submit KYC"}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12"
                onClick={() => router.push("/dashboard/venue")}
              >
                Cancel
              </Button>
            </div>
          </motion.form>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-silver-200 bg-white">
              <CardHeader>
                <CardTitle>Need to Update Information?</CardTitle>
                <CardDescription>If you need to change your KYC or bank details, please contact support</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 p-4 bg-silver-50 rounded-lg border border-silver-200">
                  <AlertCircle className="h-8 w-8 text-neutral-600" />
                  <div className="flex-1">
                    <p className="font-medium text-black">Contact Support</p>
                    <p className="text-sm text-neutral-600">
                      For security reasons, KYC and bank details can only be updated by contacting our support team.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => window.location.href = "mailto:support@nearzro.com"}>
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
