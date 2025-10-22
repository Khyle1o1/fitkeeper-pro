import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Users, UserCheck, ArrowRight } from 'lucide-react';
import { db, initLocalDb, getAllPayments } from '@/lib/db';

const Reports = () => {
  const [stats, setStats] = useState({
    totalCheckIns: 0,
    activeMembers: 0,
    expiringMembers: 0,
    retentionRate: 0,
    walkInIncome: 0,
    membershipFees: 0,
    monthlySubscriptions: 0,
    memberSessionFees: 0,
    otherIncome: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      await initLocalDb();
      
      // Get current month check-ins
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const allAttendance = await db.attendance.toArray();
      const monthlyCheckIns = allAttendance.filter(record => 
        record.date.startsWith(currentMonth)
      ).length;
      // Income breakdown using payments table
      const ym = new Date().toISOString().slice(0, 7);
      const payments = await getAllPayments();
      const thisMonth = payments.filter(p => (p.date || '').startsWith(ym));
      const membershipFees = thisMonth.filter(p => p.category === 'Membership Fee').reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const monthlySubscriptions = thisMonth.filter(p => p.category === 'Monthly Subscription').reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const memberSessionFees = thisMonth.filter(p => p.category === 'Member Session Fee').reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const walkInIncome = thisMonth.filter(p => p.category === 'Walk-In Session Fee').reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const otherIncome = thisMonth.filter(p => p.category === 'Other').reduce((s, p) => s + (Number(p.amount) || 0), 0);
      
      // Get active members (IndexedDB cannot index boolean keys reliably; query by string index then filter)
      const activeMembers = (await db.members.where('status').equals('active').toArray())
        .filter(m => m.isActive === true);
      
      // Get expiring members (next 7 days)
      const today = new Date();
      const in7 = new Date();
      in7.setDate(today.getDate() + 7);
      const expiring = activeMembers.filter(member => {
        const expiryDate = new Date(member.membershipExpiryDate);
        return expiryDate >= today && expiryDate <= in7;
      });
      
      // Calculate retention rate (simplified)
      const totalMembers = await db.members.count();
      const retentionRate = totalMembers > 0 ? Math.round((activeMembers.length / totalMembers) * 100) : 0;
      
      setStats({
        totalCheckIns: monthlyCheckIns,
        activeMembers: activeMembers.length,
        expiringMembers: expiring.length,
        retentionRate,
        walkInIncome,
        membershipFees,
        monthlySubscriptions,
        memberSessionFees,
        otherIncome,
      });
    };
    
    loadStats();
  }, []);

  const reports = [
    {
      title: 'Attendance Report',
      description: 'View daily, weekly, and monthly attendance records with detailed check-in times',
      icon: UserCheck,
      href: '/reports/attendance',
      color: 'text-primary',
    },
    {
      title: 'Membership Status Report',
      description: 'Monitor active, expired, and soon-to-expire memberships with renewal insights',
      icon: Users,
      href: '/reports/membership',
      color: 'text-success',
    },
    {
      title: 'Member Activity Report',
      description: 'Analyze individual member attendance patterns and workout frequency',
      icon: FileText,
      href: '/reports/member-activity',
      color: 'text-accent',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">Generate comprehensive reports to track your gym's performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.title} className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <report.icon className={`h-6 w-6 ${report.color}`} />
                <CardTitle className="text-lg">{report.title}</CardTitle>
              </div>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={report.href}>
                <Button className="w-full justify-between bg-gradient-primary hover:opacity-90">
                  Generate Report
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Report Overview</CardTitle>
          <CardDescription>Key metrics at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalCheckIns}</p>
              <p className="text-sm text-muted-foreground">Total Check-ins This Month</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{stats.activeMembers}</p>
              <p className="text-sm text-muted-foreground">Active Members</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{stats.expiringMembers}</p>
              <p className="text-sm text-muted-foreground">Expiring Memberships</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{stats.retentionRate}%</p>
              <p className="text-sm text-muted-foreground">Member Retention Rate</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">₱{stats.membershipFees}</p>
              <p className="text-sm text-muted-foreground">Membership Fees</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">₱{stats.walkInIncome}</p>
              <p className="text-sm text-muted-foreground">Walk-In Daily Income</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">₱{stats.membershipFees + stats.monthlySubscriptions + stats.memberSessionFees + stats.walkInIncome + stats.otherIncome}</p>
              <p className="text-sm text-muted-foreground">Total Income</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;