"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  Shield, UserPlus, Eye, EyeOff, ArrowLeft, 
  ShieldCheck, RefreshCw, AlertCircle, Loader2, 
  Users, CheckCircle2, IndianRupee 
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function CreateAdminPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "ADMIN",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register-admin", {
        name: formData.email.split('@')[0],
        email: formData.email,
        phone: "",
        role: "ADMIN",
        password: formData.password
      });
      toast.success("Admin account created successfully!");
      router.push("/dashboard/admin/users");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-6 bg-[#0a0a0b] text-white selection:bg-blue-500/30 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-2xl border border-zinc-700/50">
            <UserPlus className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight">
              Access <span className="text-zinc-500">Provisioning</span>
            </h1>
            <p className="text-zinc-500 font-medium">Initialize new system administrative entities</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => router.back()} className="text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all rounded-full">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Matrix
        </Button>
      </motion.div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-zinc-800 shadow-2xl bg-zinc-950/50 backdrop-blur-xl overflow-hidden relative h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-zinc-900 shadow-lg">
                  <UserPlus className="h-5 w-5 text-blue-400" />
                </div>
                <CardTitle className="text-2xl font-black text-white">Identity Credentials</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="admin@nearzro.com"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="h-11 bg-zinc-900/50 border-zinc-800 text-white focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="password" title="Required" className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Access Token</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="h-11 pr-10 bg-zinc-900/50 border-zinc-800 text-white focus:border-blue-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" title="Required" className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Verify Token</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="h-11 pr-10 bg-zinc-900/50 border-zinc-800 text-white focus:border-blue-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    This account will have elevated administrative access to system features and user data.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-white hover:bg-zinc-200 text-black font-black h-12 shadow-xl shadow-white/5 transition-all rounded-xl"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Initializing Authorization Protocols...
                    </>
                  ) : (
                    "Execute Account Provisioning"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-6"
        >
          <Card className="border-zinc-800 shadow-xl bg-zinc-950/50 backdrop-blur-xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-20" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-zinc-900 shadow-sm border border-zinc-800">
                  <ShieldCheck className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black text-white">Kernel Access Policies</CardTitle>
                  <CardDescription className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">Administrative clearance guidelines</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                {[
                  { icon: Shield, title: "System Overrides", desc: "Modify platform-wide logic & global hooks", color: "bg-zinc-900 text-blue-400" },
                  { icon: Users, title: "Identity Control", desc: "Full CRUD access to the global identity database", color: "bg-zinc-900 text-indigo-400" },
                  { icon: CheckCircle2, title: "Supply Chain Approval", desc: "Onboard and verify critical venue/vendor assets", color: "bg-zinc-900 text-emerald-400" },
                  { icon: IndianRupee, title: "Ledger Oversight", desc: "Audit high-level financial transactions & net revenue", color: "bg-zinc-900 text-amber-400" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:border-blue-500/50 transition-all group">
                    <div className={cn("p-2.5 rounded-xl transition-all group-hover:scale-110", item.color)}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-100 text-sm">{item.title}</p>
                      <p className="text-xs text-zinc-500 font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
