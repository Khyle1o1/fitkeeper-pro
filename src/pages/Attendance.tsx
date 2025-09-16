import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, UserCheck } from 'lucide-react';
import { mockMembers, mockAttendanceRecords } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

const Attendance = () => {
  const [memberId, setMemberId] = useState('');
  const [checkedInMember, setCheckedInMember] = useState<any>(null);
  const { toast } = useToast();

  const todayAttendance = mockAttendanceRecords.filter(r => r.date === '2024-09-16');

  const handleCheckIn = () => {
    const member = mockMembers.find(m => m.id === memberId);
    
    if (!member) {
      toast({
        title: "Member Not Found",
        description: "No member found with this ID. Please check and try again.",
        variant: "destructive",
      });
      return;
    }

    const checkInTime = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });

    setCheckedInMember({ ...member, checkInTime });
    
    toast({
      title: "Check-in Successful",
      description: `${member.fullName} checked in at ${checkInTime}`,
    });
    
    setMemberId('');
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
                    <p className="font-medium">{record.memberName}</p>
                    <p className="text-sm text-muted-foreground">ID: {record.memberId}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{record.checkInTime}</p>
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