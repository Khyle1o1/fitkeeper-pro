import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockMembers, mockAttendanceRecords } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

const MemberActivityReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedMember, setSelectedMember] = useState('');

  const selectedMemberData = mockMembers.find(m => m.id === selectedMember);
  const memberAttendance = mockAttendanceRecords.filter(r => r.memberId === selectedMember);

  const handleExport = (format: 'pdf' | 'csv') => {
    toast({
      title: `${format.toUpperCase()} Export`,
      description: `Member activity report has been exported to ${format.toUpperCase()} format.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Reports
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Member Activity Report</h1>
          <p className="text-muted-foreground">Analyze individual member attendance and activity patterns</p>
        </div>
      </div>

      {/* Member Selection */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Select Member</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a member to analyze" />
              </SelectTrigger>
              <SelectContent>
                {mockMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.fullName} ({member.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={() => handleExport('pdf')} variant="outline" className="flex-1" disabled={!selectedMember}>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button onClick={() => handleExport('csv')} variant="outline" className="flex-1" disabled={!selectedMember}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedMemberData && (
        <>
          {/* Member Info */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Member Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p><strong>Name:</strong> {selectedMemberData.fullName}</p>
                  <p><strong>ID:</strong> {selectedMemberData.id}</p>
                  <p><strong>Email:</strong> {selectedMemberData.email}</p>
                </div>
                <div>
                  <p><strong>Start Date:</strong> {selectedMemberData.membershipStartDate}</p>
                  <p><strong>Expiry Date:</strong> {selectedMemberData.membershipExpiryDate}</p>
                  <p><strong>Status:</strong> {selectedMemberData.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-primary">{memberAttendance.length}</p>
                <p className="text-sm text-muted-foreground">Total Check-ins</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-success">3.2</p>
                <p className="text-sm text-muted-foreground">Avg. Weekly Visits</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-accent">85%</p>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Attendance History */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Recent Attendance History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {memberAttendance.length > 0 ? (
                  memberAttendance.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">Check-in</p>
                        <p className="text-sm text-muted-foreground">Session #{record.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{record.checkInTime}</p>
                        <p className="text-sm text-muted-foreground">{record.date}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No attendance records found for this member</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default MemberActivityReport;