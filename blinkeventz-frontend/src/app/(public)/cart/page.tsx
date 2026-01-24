import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Trash2 } from "lucide-react";

export default function CartPage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Event Cart</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
            {/* Cart Items */}
            {[1, 2].map((i) => (
                <Card key={i} className="flex flex-row items-center p-4">
                    <div className="h-24 w-24 bg-gray-200 rounded-lg object-cover flex-shrink-0" />
                    <div className="ml-4 flex-1">
                        <h3 className="font-semibold text-lg">Item Name {i}</h3>
                        <p className="text-gray-500 text-sm">Description or details</p>
                        <div className="mt-2 font-bold text-purple-600">₹500.00</div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-5 w-5" />
                    </Button>
                </Card>
            ))}
        </div>

        <div className="lg:col-span-1">
            <Card className="sticky top-24">
                <CardHeader>
                    <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">₹1,000.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Taxes & Fees</span>
                        <span className="font-medium">₹100.00</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-lg mt-4">
                        <span>Total</span>
                        <span className="text-purple-600">₹1,100.00</span>
                    </div>
                </CardContent>
                <CardFooter>
                    <Link href="/checkout" className="w-full">
                        <Button className="w-full h-12 text-lg">
                            Checkout <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}
