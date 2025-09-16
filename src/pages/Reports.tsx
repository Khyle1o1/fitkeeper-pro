import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Users, UserCheck, ArrowRight } from 'lucide-react';

const Reports = () => {
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
              <p className="text-2xl font-bold text-primary">156</p>
              <p className="text-sm text-muted-foreground">Total Check-ins This Month</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">45</p>
              <p className="text-sm text-muted-foreground">Active Members</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">8</p>
              <p className="text-sm text-muted-foreground">Expiring Memberships</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">92%</p>
              <p className="text-sm text-muted-foreground">Member Retention Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;