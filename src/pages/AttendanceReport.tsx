import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportTableToPdfWithLogo, getCurrentTimestamp } from '@/lib/pdf';
import { db, initLocalDb, getAllPayments } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

const AttendanceReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    period: 'weekly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  // Helper functions for date calculations
  const getWeekRange = (date: string): { start: string; end: string } => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday as start of week
    const start = new Date(d.setDate(diff));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const getMonthRange = (year: number, month: number): { start: string; end: string } => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const getYearRange = (year: number): { start: string; end: string } => {
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
    };
  };

  // Update date range when period changes
  const handlePeriodChange = (newPeriod: string) => {
    const today = new Date().toISOString().split('T')[0];
    let newStartDate = today;
    let newEndDate = today;

    if (newPeriod === 'daily') {
      newStartDate = today;
      newEndDate = today;
    } else if (newPeriod === 'weekly') {
      const range = getWeekRange(today);
      newStartDate = range.start;
      newEndDate = range.end;
    } else if (newPeriod === 'monthly') {
      const now = new Date();
      const range = getMonthRange(now.getFullYear(), now.getMonth());
      newStartDate = range.start;
      newEndDate = range.end;
    } else if (newPeriod === 'yearly') {
      const range = getYearRange(new Date().getFullYear());
      newStartDate = range.start;
      newEndDate = range.end;
    }

    setFilters({
      period: newPeriod,
      startDate: newStartDate,
      endDate: newEndDate,
    });
  };

  // Handle date picker changes based on period
  const handleDateChange = (value: string, type: 'date' | 'month' | 'year') => {
    if (filters.period === 'daily') {
      setFilters(prev => ({ ...prev, startDate: value, endDate: value }));
    } else if (filters.period === 'weekly') {
      const range = getWeekRange(value);
      setFilters(prev => ({ ...prev, startDate: range.start, endDate: range.end }));
    } else if (filters.period === 'monthly' && type === 'month') {
      const [year, month] = value.split('-').map(Number);
      const range = getMonthRange(year, month - 1);
      setFilters(prev => ({ ...prev, startDate: range.start, endDate: range.end }));
    } else if (filters.period === 'yearly' && type === 'year') {
      const range = getYearRange(Number(value));
      setFilters(prev => ({ ...prev, startDate: range.start, endDate: range.end }));
    }
  };

  const handleExportPDF = async () => {
    await initLocalDb();
    const allRecords = await db.attendance.toArray();
    const payments = await getAllPayments();
    const rows = allRecords
      .filter((r) => r.date >= filters.startDate && r.date <= filters.endDate)
      .map((r) => ({
        memberName: r.memberName,
        memberId: r.memberId,
        date: r.date,
        checkInTime: r.checkInTime,
        checkOutTime: r.checkOutTime || '',
      }));

    // Income summary for the period
    const incomeWindow = payments.filter((p) => (p.date || '') >= filters.startDate && (p.date || '') <= filters.endDate);
    const membershipFees = incomeWindow.filter((p) => p.category === 'Membership Fee').reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const monthlySubscriptions = incomeWindow.filter((p) => p.category === 'Monthly Subscription').reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const memberSessionFees = incomeWindow.filter((p) => p.category === 'Member Session Fee').reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const walkInIncome = incomeWindow.filter((p) => p.category === 'Walk-In Session Fee').reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const otherIncome = incomeWindow.filter((p) => p.category === 'Other').reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totalIncome = membershipFees + monthlySubscriptions + memberSessionFees + walkInIncome + otherIncome;

    exportTableToPdfWithLogo({
      title: 'Attendance Report',
      subtitle: `Period: ${filters.startDate} to ${filters.endDate} • View: ${filters.period}`,
      prependTables: [
        {
          title: 'Income Summary',
          columns: [
            { header: 'Category', dataKey: 'label' },
            { header: 'Amount (₱)', dataKey: 'amount' },
          ],
          rows: [
            { label: 'Membership Fees', amount: membershipFees },
            { label: 'Monthly Subscriptions', amount: monthlySubscriptions },
            { label: 'Member Session Fees', amount: memberSessionFees },
            { label: 'Walk-In Income', amount: walkInIncome },
            { label: 'Other', amount: otherIncome },
            { label: 'Total Income', amount: totalIncome },
          ],
        },
      ],
      columns: [
        { header: 'Member', dataKey: 'memberName' },
        { header: 'Member ID', dataKey: 'memberId' },
        { header: 'Date', dataKey: 'date' },
        { header: 'Check-in', dataKey: 'checkInTime' },
        { header: 'Check-out', dataKey: 'checkOutTime' },
      ],
      rows,
      filename: `attendance_${filters.startDate}_${filters.endDate}`,
      footnote: `Generated by PowerLift Fitness Gym on ${getCurrentTimestamp()}`,
      logoUrl: '/logo.png',
      logoWidthPx: 80,
      includeSignatures: true,
    });

    toast({ title: 'Exported PDF', description: 'Attendance report downloaded.' });
  };

  const handleExportCSV = async () => {
    await initLocalDb();
    const allRecords = await db.attendance.toArray();
    const filtered = allRecords.filter((r) => r.date >= filters.startDate && r.date <= filters.endDate);
    
    // Create CSV content
    const headers = ['Member Name', 'Member ID', 'Date', 'Check-in Time', 'Check-out Time'];
    const rows = filtered.map(r => [
      r.memberName,
      r.memberId,
      r.date,
      r.checkInTime,
      r.checkOutTime || '',
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${filters.startDate}_${filters.endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "CSV Export",
      description: "Attendance report has been exported to CSV format.",
    });
  };

  // Initialize dates on mount
  useEffect(() => {
    handlePeriodChange('weekly');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadAttendance = async () => {
      await initLocalDb();
      const allRecords = await db.attendance.toArray();
      const filtered = allRecords.filter((r) => r.date >= filters.startDate && r.date <= filters.endDate);
      setAttendanceRecords(filtered);
    };
    loadAttendance();
  }, [filters]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Reports
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Attendance Report</h1>
          <p className="text-muted-foreground">Track member attendance patterns and check-in data</p>
          <p className="mt-1 text-xl font-semibold">View: <span className="capitalize">{filters.period}</span></p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Report Period</Label>
              <Select value={filters.period} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic date picker based on period */}
            {filters.period === 'daily' && (
              <div className="space-y-2">
                <Label htmlFor="dateSelect">Date</Label>
                <Input
                  id="dateSelect"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleDateChange(e.target.value, 'date')}
                />
              </div>
            )}

            {filters.period === 'weekly' && (
              <div className="space-y-2">
                <Label htmlFor="weekSelect">Select Week (Pick any date)</Label>
                <Input
                  id="weekSelect"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleDateChange(e.target.value, 'date')}
                />
                <p className="text-xs text-muted-foreground">
                  Week range: {filters.startDate} to {filters.endDate}
                </p>
              </div>
            )}

            {filters.period === 'monthly' && (
              <div className="space-y-2">
                <Label htmlFor="monthSelect">Select Month</Label>
                <Input
                  id="monthSelect"
                  type="month"
                  value={filters.startDate.substring(0, 7)}
                  onChange={(e) => handleDateChange(e.target.value, 'month')}
                />
                <p className="text-xs text-muted-foreground">
                  Month range: {filters.startDate} to {filters.endDate}
                </p>
              </div>
            )}

            {filters.period === 'yearly' && (
              <div className="space-y-2">
                <Label htmlFor="yearSelect">Select Year</Label>
                <Select
                  value={filters.startDate.substring(0, 4)}
                  onValueChange={(value) => handleDateChange(value, 'year')}
                >
                  <SelectTrigger id="yearSelect">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - 5 + i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Year range: {filters.startDate} to {filters.endDate}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex items-center h-10 px-3 py-2 rounded-md border border-input bg-muted/50 text-sm">
                <span className="text-muted-foreground">
                  {filters.startDate} {filters.startDate !== filters.endDate && `to ${filters.endDate}`}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <Button onClick={handleExportPDF} variant="outline" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={handleExportCSV} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Data */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {attendanceRecords.length > 0 ? (
              attendanceRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">{record.memberName}</p>
                    <p className="text-sm text-muted-foreground">ID: {record.memberId}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{record.checkInTime}{record.checkOutTime ? ` • ${record.checkOutTime}` : ''}</p>
                    <p className="text-sm text-muted-foreground">{record.date}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No attendance records found for the selected period.</p>
                <p className="text-sm text-muted-foreground mt-2">Try adjusting the date range or add some attendance data.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

     
    </div>
  );
};

export default AttendanceReport;