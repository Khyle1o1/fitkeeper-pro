import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const Attendance = () => {
  const [memberId, setMemberId] = useState('');
  const [checkedInMember, setCheckedInMember] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const { toast } = useToast();

  const refreshTodayAttendance = async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .gte('checked_in_at', start.toISOString())
      .lte('checked_in_at', end.toISOString())
      .order('checked_in_at', { ascending: false });

    if (error) {
      toast({ title: 'Failed to load attendance', description: error.message, variant: 'destructive' });
      return;
    }

    setTodayAttendance(data ?? []);
  };

  useEffect(() => {
    refreshTodayAttendance();
  }, []);

  const handleCheckIn = async () => {
    const { data: members, error: memberErr } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .limit(1);

    if (memberErr) {
      toast({ title: 'Lookup failed', description: memberErr.message, variant: 'destructive' });
      return;
    }

    const member = members?.[0];
    if (!member) {
      toast({
        title: 'Member Not Found',
        description: 'No member found with this ID. Please check and try again.',
        variant: 'destructive',
      });
      return;
    }

    const now = new Date();
    const checkInTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const { error: insertErr } = await supabase.from('attendance').insert({
      member_id: member.id,
      member_name: member.full_name,
      checked_in_at: now.toISOString(),
    });

    if (insertErr) {
      toast({ title: 'Failed to check in', description: insertErr.message, variant: 'destructive' });
      return;
    }

    setCheckedInMember({
      id: member.id,
      fullName: member.full_name,
      status: member.status,
      checkInTime,
    });

    toast({
      title: 'Check-in Successful',
      description: `${member.full_name} checked in at ${checkInTime}`,
    });

    setMemberId('');
    refreshTodayAttendance();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance Tracking</h1>
        <p className="text-muted-foreground">Record member check-ins and view daily attendance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-in Form */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Member Check-in
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="memberId">Member ID</Label>
              <div className="flex gap-2">
                <Input
                  id="memberId"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="Enter or scan Member ID (e.g., GM001234)"
                />
                <Button onClick={handleCheckIn} disabled={!memberId} className="bg-gradient-primary hover:opacity-90">
                  Check In
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter Member ID manually or simulate QR/barcode scanning
              </p>
            </div>

            {checkedInMember && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-8 w-8 text-success" />
                  <div>
                    <h3 className="font-semibold text-success">{checkedInMember.fullName}</h3>
                    <p className="text-sm">ID: {checkedInMember.id}</p>
                    <p className="text-sm">Status: <Badge className="bg-success/10 text-success border-success/20">{checkedInMember.status}</Badge></p>
                    <p className="text-sm font-medium">Checked in at {checkedInMember.checkInTime}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Attendance */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Today's Attendance ({todayAttendance.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayAttendance.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">{record.member_name}</p>
                    <p className="text-sm text-muted-foreground">ID: {record.member_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{new Date(record.checked_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                </div>
              ))}
              
              {todayAttendance.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No check-ins recorded today</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Attendance;