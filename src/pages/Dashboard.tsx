import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const Dashboard = () => {
  const [totalActiveMembers, setTotalActiveMembers] = useState(0);
  const [dailyAttendance, setDailyAttendance] = useState(0);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [expiringMembers, setExpiringMembers] = useState<any[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      // Total active members
      const { count: activeCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('status', 'active');
      setTotalActiveMembers(activeCount ?? 0);

      // Today's attendance list and count
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .gte('checked_in_at', start.toISOString())
        .lte('checked_in_at', end.toISOString())
        .order('checked_in_at', { ascending: false });

      setTodayAttendance(attendanceData ?? []);
      setDailyAttendance(attendanceData?.length ?? 0);

      // Expiring in next 7 days
      const today = new Date();
      const in7 = new Date();
      in7.setDate(today.getDate() + 7);

      const { data: expiring } = await supabase
        .from('members')
        .select('*')
        .eq('is_active', true)
        .gte('membership_expiry_date', today.toISOString().split('T')[0])
        .lte('membership_expiry_date', in7.toISOString().split('T')[0])
        .order('membership_expiry_date', { ascending: true });

      setExpiringMembers(expiring ?? []);
    };

    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening at your gym today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Members</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveMembers}</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-success/5 to-success/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
            <UserCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyAttendance}</div>
            <p className="text-xs text-muted-foreground">
              +12% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-warning/5 to-warning/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Memberships</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              Within 7 days
            </p>
          </CardContent>
        </Card>

        
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Check-ins */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Today's Check-ins</CardTitle>
            <CardDescription>Members who have checked in today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayAttendance.length > 0 ? (
                todayAttendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">{record.member_name}</p>
                      <p className="text-sm text-muted-foreground">ID: {record.member_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{new Date(record.checked_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                      <p className="text-sm text-muted-foreground">Today</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No check-ins today</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expiring Memberships */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Expiring Memberships
            </CardTitle>
            <CardDescription>Members whose memberships expire within 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expiringMembers.length > 0 ? (
                expiringMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-lg">
                    <div>
                      <p className="font-medium">{member.full_name}</p>
                      <p className="text-sm text-muted-foreground">ID: {member.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-warning">Expires {member.membership_expiry_date}</p>
                      <p className="text-sm text-muted-foreground">Renewal needed</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No memberships expiring soon</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;