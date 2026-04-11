'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  Users, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Eye,
  MessageSquare,
  Filter
} from 'lucide-react';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Booking {
  id: number;
  customerName: string;
  eventName: string;
  date: string;
  timeSlot: string;
  guestCount?: number;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  amount: number;
  specialNotes?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
};

export function VendorBookingsTable() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchBookings() {
      try {
        const response = await api.get('/vendors/me/bookings');
        setBookings(response.data.bookings || response.data);
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
        // Mock data for development
        const mockBookings: Booking[] = [
          {
            id: 1,
            customerName: 'Rajesh Kumar',
            eventName: 'Wedding Reception',
            date: '2026-04-15',
            timeSlot: '10:00-18:00',
            guestCount: 200,
            status: 'PENDING',
            amount: 50000,
            specialNotes: 'Need coverage for ceremony and reception'
          },
          {
            id: 2,
            customerName: 'Priya Sharma',
            eventName: 'Birthday Party',
            date: '2026-04-20',
            timeSlot: '14:00-20:00',
            guestCount: 50,
            status: 'CONFIRMED',
            amount: 25000,
            specialNotes: 'Kids birthday, need candid shots'
          },
          {
            id: 3,
            customerName: 'Amit Patel',
            eventName: 'Corporate Event',
            date: '2026-04-25',
            timeSlot: '09:00-17:00',
            guestCount: 100,
            status: 'CONFIRMED',
            amount: 75000,
            specialNotes: 'Annual company meeting'
          },
        ];
        setBookings(mockBookings);
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.eventName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Booking['status']) => {
    const colors = {
      PENDING: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
      CONFIRMED: 'bg-green-900/50 text-green-300 border-green-700',
      IN_PROGRESS: 'bg-blue-900/50 text-blue-300 border-blue-700',
      COMPLETED: 'bg-silver-800/50 text-silver-300 border-silver-600',
      CANCELLED: 'bg-red-900/50 text-red-300 border-red-700',
    };
    return colors[status] || colors.CANCELLED;
  };

  const getStatusIcon = (status: Booking['status']) => {
    const icons = {
      PENDING: <Clock className="h-4 w-4" />,
      CONFIRMED: <CheckCircle2 className="h-4 w-4" />,
      IN_PROGRESS: <Clock className="h-4 w-4" />,
      COMPLETED: <CheckCircle2 className="h-4 w-4" />,
      CANCELLED: <XCircle className="h-4 w-4" />,
    };
    return icons[status] || icons.CANCELLED;
  };

  const handleAcceptBooking = async (bookingId: number) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status: 'CONFIRMED' });
      setBookings(prev => prev.map(b => 
        b.id === bookingId ? { ...b, status: 'CONFIRMED' as const } : b
      ));
    } catch (error) {
      console.error('Failed to accept booking:', error);
    }
  };

  const handleDeclineBooking = async (bookingId: number) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status: 'CANCELLED' });
      setBookings(prev => prev.map(b => 
        b.id === bookingId ? { ...b, status: 'CANCELLED' as const } : b
      ));
    } catch (error) {
      console.error('Failed to decline booking:', error);
    }
  };

  if (loading) {
    return (
      <Card className="border-silver-800 bg-silver-900/50">
        <CardHeader>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-silver-700 rounded w-48" />
            <div className="h-4 bg-silver-700 rounded w-32" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-silver-800 bg-gradient-to-br from-silver-900/50 to-silver-950/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-white">Recent Bookings</CardTitle>
              <CardDescription>
                Manage your booking requests
              </CardDescription>
            </div>
            <Button
              variant="premium"
              size="sm"
              onClick={() => router.push('/dashboard/vendor/bookings')}
            >
              View All
              <Eye className="h-4 w-4 ml-2" />
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-500" />
              <Input
                placeholder="Search by customer or event..."
                className="pl-9 bg-silver-900/50 border-silver-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-500" />
              <select
                className="h-10 pl-9 pr-8 rounded-xl border border-silver-700 bg-silver-900/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-silver-600 appearance-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-silver-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No bookings found</h3>
              <p className="text-silver-400">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No booking requests yet'}
              </p>
            </div>
          ) : (
            <motion.div 
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredBookings.slice(0, 5).map((booking, index) => (
                <motion.div
                  key={booking.id}
                  variants={itemVariants}
                  className="flex items-center justify-between p-4 rounded-xl border border-silver-800 hover:shadow-lg hover:shadow-black/20 hover:border-silver-700 transition-all duration-300 bg-gradient-to-r from-silver-900/30 to-transparent"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-silver-600 to-silver-800 flex items-center justify-center text-white font-bold shadow-lg shadow-black/20">
                      {booking.customerName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{booking.eventName}</h3>
                      <div className="flex items-center gap-4 text-sm text-silver-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {booking.customerName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(booking.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {booking.timeSlot}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        ₹{(booking.amount || 0).toLocaleString()}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        {booking.status === 'PENDING' ? (
                          <Badge className={`${getStatusColor(booking.status)} border`}>
                            {getStatusIcon(booking.status)}
                            <span className="ml-1 capitalize">{booking.status.toLowerCase()}</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-silver-400 border-silver-700">
                            {getStatusIcon(booking.status)}
                            <span className="ml-1 capitalize">{booking.status.toLowerCase()}</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons for Pending Bookings */}
                    {booking.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-700 text-red-400 hover:bg-red-900/50"
                          onClick={() => handleDeclineBooking(booking.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-700 hover:bg-green-800"
                          onClick={() => handleAcceptBooking(booking.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    {booking.status !== 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="silver"
                          onClick={() => router.push(`/dashboard/vendor/bookings/${booking.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="silver"
                          onClick={() => router.push(`/dashboard/vendor/bookings/${booking.id}?action=message`)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
