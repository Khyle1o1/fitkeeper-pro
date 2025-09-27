import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, UserCheck, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, initLocalDb } from '@/lib/db';
import QRScanner from '@/components/QRScanner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Attendance = () => {
  const [memberId, setMemberId] = useState('');
  const [checkedInMember, setCheckedInMember] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'checkin' | 'checkout'>('checkin');
  const [memberForAction, setMemberForAction] = useState<any>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  const refreshTodayAttendance = async () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const records = await db.attendance.where('date').equals(dateStr).toArray();
    // Sort latest first by id (timestamp-based below)
    records.sort((a: any, b: any) => (b.id > a.id ? 1 : -1));
    setTodayAttendance(records);
  };

  useEffect(() => {
    (async () => {
      await initLocalDb();
      refreshTodayAttendance();
    })();
  }, []);

  const openConfirm = (type: 'checkin' | 'checkout', member: any) => {
    setConfirmType(type);
    setMemberForAction(member);
    setConfirmOpen(true);
  };

  const handleQRScan = async (scannedId: string) => {
    setMemberId(scannedId);
    await processMemberId(scannedId);
  };

  const processMemberId = async (id: string) => {
    const member = await db.members.get(id);
    if (!member) {
      toast({
        title: 'Member Not Found',
        description: 'No member found with this ID. Please check and try again.',
        variant: 'destructive',
      });
      return;
    }

    // Check if member is already checked in today
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecords = await db.attendance.where('date').equals(todayStr).toArray();
    const existing = [...todayRecords]
      .filter((r: any) => r.memberId === member.id)
      .sort((a: any, b: any) => (b.id > a.id ? 1 : -1))[0];

    if (existing && !existing.checkOutTime) {
      // Member is already checked in, offer check out
      openConfirm('checkout', member);
    } else {
      // Member is not checked in, offer check in
      openConfirm('checkin', member);
    }
  };

  const handleCheckIn = async () => {
    await processMemberId(memberId);
  };

  const performCheckIn = async (member: any) => {
    const now = new Date();
    const checkInTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila',
    });

    const dateStr = now.toISOString().split('T')[0];
    await db.attendance.add({
      id: `${Date.now()}`,
      memberId: member.id,
      memberName: member.fullName,
      date: dateStr,
      checkInTime,
    } as any);

    setCheckedInMember({
      id: member.id,
      fullName: member.fullName,
      status: member.status,
      checkInTime,
    });

    toast({
      title: 'Check-in Successful',
      description: `${member.fullName} checked in at ${checkInTime}`,
    });

    setMemberId('');
    refreshTodayAttendance();
  };

  const handleCheckOut = async () => {
    await processMemberId(memberId);
  };

  const performCheckOut = async (member: any) => {
    const now = new Date();
    const checkOutTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila',
    });
    const dateStr = now.toISOString().split('T')[0];
    const todays = await db.attendance.where('date').equals(dateStr).toArray();
    const latest = [...todays]
      .filter((r: any) => r.memberId === member.id)
      .sort((a: any, b: any) => (b.id > a.id ? 1 : -1))[0];
    if (latest) {
      await db.attendance.update(latest.id, { checkOutTime });
    }
    toast({ title: 'Check-out Successful', description: `${member.fullName} checked out at ${checkOutTime}` });
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && memberId) {
                      handleCheckIn();
                    }
                  }}
                />
                <Button 
                  variant="outline" 
                  onClick={() => setQrScannerOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Scan
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleCheckIn} 
                  disabled={!memberId} 
                  className="bg-gradient-primary hover:opacity-90 flex-1"
                >
                  Check In
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCheckOut} 
                  disabled={!memberId}
                  className="flex-1"
                >
                  Check Out
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter Member ID manually or use the camera to scan QR code/barcode
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
                    <p className="font-medium">{record.checkInTime}{record.checkOutTime ? ` • ${record.checkOutTime}` : ''}</p>
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
      {/* Confirmation Modal */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmType === 'checkin' ? 'Confirm Check-in' : 'Confirm Check-out'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmType === 'checkin' 
                ? 'Please verify the member details before checking in.' 
                : 'Please verify the member details before checking out.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {memberForAction && (
            <div className="relative overflow-hidden border border-border/50 rounded-lg bg-muted/10">
              <div className="grid grid-cols-[120px_1fr_70px] gap-4 p-4">
                {/* Photo */}
                <div className="flex items-start">
                  {memberForAction.photoDataUrl ? (
                    <img
                      src={memberForAction.photoDataUrl}
                      alt="Member"
                      className="h-24 w-24 rounded-md object-cover border"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-md border bg-muted" />
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1">
                  <p className="text-xl font-semibold leading-6">{memberForAction.fullName}</p>
                  <p className="text-xs text-muted-foreground">Member</p>

                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-medium w-24">ISSUE:</span>
                      <span className="text-muted-foreground">
                        {new Date(memberForAction.membershipStartDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium w-24">EXPIRY:</span>
                      <span className="text-muted-foreground">{new Date(memberForAction.membershipExpiryDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium w-24">Member#:</span>
                      <span className="text-muted-foreground">{memberForAction.id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium w-24">Status:</span>
                      <Badge className={(memberForAction.status === 'expired' || !memberForAction.isActive) ? 'bg-destructive/15 text-destructive border-destructive/30' : ''} variant={(memberForAction.status === 'expired' || !memberForAction.isActive) ? 'destructive' : 'outline'}>
                        {String(memberForAction.status).toUpperCase()}
                      </Badge>
                    </div>
                    {confirmType === 'checkout' && (
                      <div className="flex items-center gap-3">
                        <span className="font-medium w-24">Check-out:</span>
                        <span className="text-muted-foreground">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })}</span>
                      </div>
                    )}
                    {confirmType === 'checkin' && (memberForAction.status === 'expired' || !memberForAction.isActive) && (
                      <p className="text-destructive text-xs">Member inactive or expired. Check-in disabled.</p>
                    )}
                  </div>
                </div>

                {/* Right vertical stripe */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-y-0 right-0 w-[70px] bg-primary rounded-md" />
                  <span className="z-10 -rotate-90 tracking-widest text-background font-bold text-lg">
                    MEMBER
                  </span>
                </div>
              </div>

              {/* Bottom company bar */}
              <div className="px-4 pb-4">
                <div className="h-10 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-background font-semibold text-sm">POWERLIFT FITNESS GYM</span>
                </div>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmType === 'checkin' && memberForAction && (memberForAction.status === 'expired' || !memberForAction.isActive)}
              onClick={() => {
                if (!memberForAction) return;
                setConfirmOpen(false);
                if (confirmType === 'checkin') {
                  performCheckIn(memberForAction);
                } else {
                  performCheckOut(memberForAction);
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        onScan={handleQRScan}
      />
    </div>
  );
};

export default Attendance;