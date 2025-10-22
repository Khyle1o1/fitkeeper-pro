import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserCheck, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { db, initLocalDb } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening at your gym today.</p>
        {currentTime && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <Clock className="h-4 w-4" />
            <span>Manila Time: {currentTime}</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <TooltipProvider>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Total Active Members Card */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/members?status=active" className="group">
                <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-primary/10 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:from-primary/10 hover:to-primary/15 cursor-pointer relative overflow-hidden">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-3 w-3 text-primary" />
                  </div>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Active Members</CardTitle>
                    <Users className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalActiveMembers}</div>
                    <p className="text-xs text-muted-foreground">
                      Click to view all active members
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>View all active members</p>
            </TooltipContent>
          </Tooltip>

          {/* Today's Attendance Card */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/attendance?date=today" className="group">
                <Card className="border-0 shadow-md bg-gradient-to-br from-success/5 to-success/10 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:from-success/10 hover:to-success/15 cursor-pointer relative overflow-hidden">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-3 w-3 text-success" />
                  </div>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
                    <UserCheck className="h-4 w-4 text-success" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dailyAttendance}</div>
                    <p className="text-xs text-muted-foreground">
                      Click to view today's check-ins
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>View today's attendance records</p>
            </TooltipContent>
          </Tooltip>

          {/* Expiring Memberships Card */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/members?expiry=7days" className="group">
                <Card className="border-0 shadow-md bg-gradient-to-br from-warning/5 to-warning/10 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:from-warning/10 hover:to-warning/15 cursor-pointer relative overflow-hidden">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-3 w-3 text-warning" />
                  </div>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Expiring Memberships</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{expiringMembers.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Within 7 days - Click to view
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>View soon-to-expire memberships</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

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