"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Shield, Lock, User
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/auth-context";

export default function CustomerKycPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    docType: "AADHAAR",
    docNumber: "",
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

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("docType", formData.docType);
      formDataToSend.append("docNumber", formData.docNumber);
      formDataToSend.append("document", file);

      // The api interceptor should automatically add the Authorization header
      // Don't set Content-Type header manually - browser will set it with boundary
      await api.post("/kyc/customer", formDataToSend);

      toast.success("KYC submitted successfully! Please wait for verification.");
      router.push("/dashboard/customer");
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
      
      // Validate file type
      if (!["application/pdf", "image/jpeg", "image/png", "image/jpg"].includes(selectedFile.type)) {
        toast.error("Please upload PDF or image file (JPG/PNG)");
        e.target.value = "";
        return;
      }

      // Validate file size (max 5MB)
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
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">KYC Verification</h1>
          <p className="text-neutral-600">Complete your identity verification to book events</p>
        </div>

        {/* Info Card */}
        <Card className="border-2 border-blue-200 bg-blue-50 mb-8">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <Shield className="h-8 w-8 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Why KYC is Required</h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• Verify your identity for secure bookings</li>
                  <li>• Required for high-value events (₹1L+)</li>
                  <li>• Protects you and vendors from fraud</li>
                  <li>• Your data is encrypted and secure</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KYC Form */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Submit Your KYC
            </CardTitle>
            <CardDescription>
              Upload a government-issued ID proof
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">
              {/* Document Type */}
              <div className="space-y-2">
                <Label htmlFor="docType" className="text-black font-medium">
                  ID Type *
                </Label>
                <select
                  id="docType"
                  value={formData.docType}
                  onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-black focus:ring-black"
                >
                  <option value="AADHAAR">Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                  <option value="VOTER_ID">Voter ID</option>
                </select>
              </div>

              {/* Document Number */}
              <div className="space-y-2">
                <Label htmlFor="docNumber" className="text-black font-medium">
                  Document Number *
                </Label>
                <Input
                  id="docNumber"
                  placeholder="Enter your document number"
                  value={formData.docNumber}
                  onChange={(e) => setFormData({ ...formData, docNumber: e.target.value.toUpperCase() })}
                  className="border-neutral-300"
                />
                <p className="text-xs text-neutral-600">
                  {formData.docType === "AADHAAR" && "Example: 1234 5678 9012"}
                  {formData.docType === "PAN" && "Example: ABCDE1234F"}
                  {formData.docType === "PASSPORT" && "Example: A1234567"}
                </p>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label className="text-black font-medium">
                  Upload Document *
                </Label>
                <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-black transition-colors">
                  <input
                    type="file"
                    id="document"
                    name="document"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="document" className="cursor-pointer">
                    <Upload className="h-10 w-10 text-neutral-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-black mb-1">
                      {file ? file.name : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-neutral-600">
                      PDF, JPG, or PNG (max 5MB)
                    </p>
                  </label>
                </div>
                {file && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <Lock className="h-5 w-5 text-neutral-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-black mb-1">Your Data is Secure</p>
                  <p className="text-xs text-neutral-600">
                    All documents are encrypted and stored securely. Only authorized admins can view them.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
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
          </CardContent>
        </Card>

        {/* Accepted Documents */}
        <Card className="border-2 border-neutral-200 mt-6">
          <CardHeader>
            <CardTitle className="text-black text-lg">Accepted Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-black">Aadhaar Card</p>
                  <p className="text-xs text-neutral-600">Front and back side</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-black">PAN Card</p>
                  <p className="text-xs text-neutral-600">Clear photo of PAN card</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-black">Passport</p>
                  <p className="text-xs text-neutral-600">First and last page</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-black">Driving License</p>
                  <p className="text-xs text-neutral-600">Front and back side</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
