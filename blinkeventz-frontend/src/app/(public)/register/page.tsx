import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-purple-50/50">
      <Card className="w-full max-w-md border-purple-100 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription>
            Enter your details below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" placeholder="John" type="text" />
             </div>
             <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" placeholder="Doe" type="text" />
             </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" placeholder="name@example.com" type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" />
          </div>
          
          <div className="space-y-2">
            <Label>I want to join as a:</Label>
            <div className="grid grid-cols-3 gap-2">
                 <Button variant="outline" className="text-xs">Customer</Button>
                 <Button variant="outline" className="text-xs">Vendor</Button>
                 <Button variant="outline" className="text-xs">Venue Owner</Button>
            </div>
          </div>

          <Button className="w-full mt-4">Create Account</Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="w-full">
               Google
            </Button>
            <Button variant="outline" className="w-full">
               Facebook
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-sm text-gray-500">
            <div>
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-purple-600 hover:text-purple-500">
                    Sign in
                </Link>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
