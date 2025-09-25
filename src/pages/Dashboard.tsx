import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserCheck, AlertTriangle, Clock, Trash2 } from 'lucide-react';
import { db, initLocalDb, clearAllData, resetDatabase } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const [totalActiveMembers, setTotalActiveMembers] = useState(0);
  const [dailyAttendance, setDailyAttendance] = useState(0);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [expiringMembers, setExpiringMembers] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const loadStats = async () => {
      await initLocalDb();
      
      // Total active members (avoid boolean index queries which break IDBKeyRange)
      const allMembersForActive = await db.members.toArray();
      const activeMembers = allMembersForActive.filter((m: any) => m.isActive && m.status === 'active');
      setTotalActiveMembers(activeMembers.length);

      // Today's attendance
      const today = new Date().toISOString().split('T')[0];
      const attendanceData = await db.attendance.where('date').equals(today).toArray();
      attendanceData.sort((a: any, b: any) => (b.id > a.id ? 1 : -1));
      
      setTodayAttendance(attendanceData);
      setDailyAttendance(attendanceData.length);

      // Expiring in next 7 days
      const todayDate = new Date();
      const in7 = new Date();
      in7.setDate(todayDate.getDate() + 7);
      
      const allMembers = allMembersForActive.filter((m: any) => m.isActive);
      const expiring = allMembers.filter((member: any) => {
        const expiryDate = new Date(member.membershipExpiryDate);
        return expiryDate >= todayDate && expiryDate <= in7;
      });
      
      setExpiringMembers(expiring);
    };

    loadStats();
    
    // Update time every second
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
      setCurrentTime(timeStr);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleClearAllData = async () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      await clearAllData();
      toast({
        title: 'Data Cleared',
        description: 'All members, attendance, and renewal data has been cleared.',
      });
      // Reload stats
      window.location.reload();
    }
  };

  const handleResetDatabase = async () => {
    if (confirm('Are you sure you want to reset the database? This will fix schema issues but clear all data.')) {
      await resetDatabase();
      toast({
        title: 'Database Reset',
        description: 'Database has been reset with new schema.',
      });
      // Reload stats
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening at your gym today.</p>
        <div className="flex items-center justify-between mt-2">
          {currentTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Manila Time: {currentTime}</span>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDatabase}
              className="text-orange-600 hover:text-orange-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Reset DB
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllData}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Data
            </Button>
          </div>
        </div>
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
                      <p className="font-medium">{record.memberName}</p>
                      <p className="text-sm text-muted-foreground">ID: {record.memberId}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{record.checkInTime}</p>
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
                      <p className="font-medium">{member.fullName}</p>
                      <p className="text-sm text-muted-foreground">ID: {member.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-warning">Expires {member.membershipExpiryDate}</p>
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