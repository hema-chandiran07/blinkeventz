import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
         <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." className="pl-8" />
         </div>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Action</th>
                </tr>
            </thead>
            <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">User {i}</td>
                        <td className="px-6 py-4">user{i}@example.com</td>
                        <td className="px-6 py-4 capitalize">{['Customer', 'Vendor', 'Venue Owner'][i % 3]}</td>
                        <td className="px-6 py-4"><span className="text-green-600 font-medium">Active</span></td>
                        <td className="px-6 py-4">
                            <Button variant="link" className="text-purple-600 p-0">Edit</Button>
                        </td>
                    </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
