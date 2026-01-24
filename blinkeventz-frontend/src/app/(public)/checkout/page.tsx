import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutPage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Secure Checkout</h1>
        
        <div className="grid gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input id="firstName" placeholder="John" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input id="lastName" placeholder="Doe" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="john@example.com" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Payment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 border border-purple-100 bg-purple-50 rounded-lg flex items-center justify-between">
                         <div className="flex items-center space-x-2">
                             <div className="h-4 w-4 rounded-full border border-purple-600 bg-purple-600 flex items-center justify-center">
                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                             </div>
                             <span className="font-medium text-purple-900">Credit Card</span>
                         </div>
                         {/* Mock Icons */}
                         <div className="flex space-x-2">
                             <div className="h-6 w-10 bg-gray-300 rounded" />
                             <div className="h-6 w-10 bg-gray-300 rounded" />
                         </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input id="cardNumber" placeholder="0000 0000 0000 0000" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="expiry">Expiry Date</Label>
                            <Input id="expiry" placeholder="MM/YY" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cvc">CVC</Label>
                            <Input id="cvc" placeholder="123" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Button size="lg" className="w-full h-14 text-xl shadow-lg">
                Pay ₹1,100.00
            </Button>
            
            <p className="text-center text-sm text-gray-500 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                Your payment information is encrypted and secure.
            </p>
        </div>
      </div>
    </div>
  );
}
