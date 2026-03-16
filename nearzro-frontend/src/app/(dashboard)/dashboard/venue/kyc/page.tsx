"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload, FileText, CheckCircle2, Shield, Lock, Building
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/auth-context";

export default function VenueOwnerKycPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.docNumber.trim()) {
      toast.error("Please enter document number");
      return;
    }

    if (!file) {
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
      formDataToSend.append("document", file);

      await api.post("/kyc/venue-owner", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("KYC submitted successfully! Please wait for verification.");
      router.push("/dashboard/venue");
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
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Venue Owner KYC</h1>
          <p className="text-neutral-600">Complete verification to activate your venue</p>
        </div>

        <Card className="border-2 border-blue-200 bg-blue-50 mb-8">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <Shield className="h-8 w-8 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Verification Benefits</h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• Get verified badge on your venue</li>
                  <li>• Increase visibility in search results</li>
                  <li>• Receive secure payments directly</li>
                  <li>• Build trust with customers</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card className="border-2 border-black mb-6">
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
                  className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="PAN">PAN Card</option>
                  <option value="AADHAAR">Aadhaar Card</option>
                  <option value="PASSPORT">Passport</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="docNumber" className="text-black font-medium">Document Number *</Label>
                <Input
                  id="docNumber"
                  placeholder="Enter document number"
                  value={formData.docNumber}
                  onChange={(e) => setFormData({ ...formData, docNumber: e.target.value.toUpperCase() })}
                  className="border-neutral-300"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-black font-medium">Upload Document *</Label>
                <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center">
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
                      {file ? file.name : "Click to upload"}
                    </p>
                    <p className="text-xs text-neutral-600">PDF, JPG, or PNG (max 5MB)</p>
                  </label>
                </div>
                {file && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black mb-6">
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
                    className="border-neutral-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-black font-medium">Account Number *</Label>
                  <Input
                    placeholder="Enter account number"
                    value={formData.bankAccountNumber}
                    onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                    className="border-neutral-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-black font-medium">IFSC Code *</Label>
                  <Input
                    placeholder="e.g., SBIN0001234"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                    className="border-neutral-300"
                    maxLength={11}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-black font-medium">Bank Name *</Label>
                  <Input
                    placeholder="e.g., State Bank of India"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="border-neutral-300"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <Lock className="h-5 w-5 text-neutral-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-black mb-1">Secure & Encrypted</p>
                  <p className="text-xs text-neutral-600">
                    Your bank details are encrypted and used only for payment processing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            variant="default"
            size="lg"
            className="w-full h-12 text-base font-semibold bg-black hover:bg-neutral-800"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit KYC"}
          </Button>
        </form>
      </div>
    </div>
  );
}
