'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils/helpers';
import { getClientSupabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

interface PrintRequest {
  id: string;
  user_id: string;
  storybook_id: string;
  status: 'pending' | 'approved' | 'shipped' | 'rejected';
  created_at: string;
  notes?: string;
  user: {
    email: string;
  };
  storybook: {
    title: string;
  };
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  shipped: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function PrintRequestsPage() {
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getClientSupabase();

  useEffect(() => {
    checkAdminAccess();
    fetchPrintRequests();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }

      const { data: user } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', session.user.id)
        .single();

      if (!user || user.user_type !== 'admin') {
        router.push('/');
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have permission to view this page.',
        });
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.push('/');
    }
  };

  const fetchPrintRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('print_requests')
        .select(`
          *,
          user:users(email),
          storybook:storybook_entries(title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fetch print requests',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (requestId: string, newStatus: string) => {
    setUpdating(requestId);
    try {
      const { error } = await supabase
        .from('print_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      setRequests(requests.map(request => 
        request.id === requestId 
          ? { ...request, status: newStatus as PrintRequest['status'] }
          : request
      ));

      toast({
        title: 'Status Updated',
        description: `Request status changed to ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update status',
      });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container">
        <Card>
          <CardHeader>
            <CardTitle>Print Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Storybook</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{formatDate(request.created_at)}</TableCell>
                    <TableCell>{request.user.email}</TableCell>
                    <TableCell>{request.storybook.title}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[request.status]}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{request.notes || '-'}</TableCell>
                    <TableCell>
                      <Select
                        value={request.status}
                        onValueChange={(value) => updateStatus(request.id, value)}
                        disabled={updating === request.id}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}