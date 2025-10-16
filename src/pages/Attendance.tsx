import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext, PaginationLink } from '@/components/ui/pagination';
import { QrCode, UserCheck, Camera, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, initLocalDb, getAppPricing, addPayment } from '@/lib/db';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import QRScanner from '@/components/QRScanner';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'checkin' | 'checkout'>('checkin');
  const [memberForAction, setMemberForAction] = useState<any>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showingToday, setShowingToday] = useState(false);

  // Check-in type state (Member vs Walk-In)
  const [checkInType, setCheckInType] = useState<'member' | 'walkin'>(() => {
    const saved = localStorage.getItem('attendance_checkin_type');
    return (saved === 'walkin' || saved === 'member') ? (saved as any) : 'member';
  });
  // Walk-in state
  const [walkInName, setWalkInName] = useState('');
  const [sessionType] = useState<'whole_day'>('whole_day');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'GCash' | 'Card'>('Cash');
  const [appPricing, setAppPricingState] = useState<{ membershipFee: number; monthlySubscriptionFee?: number; perSessionMemberFee?: number; perSessionWalkInFee?: number }>({ membershipFee: 200, monthlySubscriptionFee: 500, perSessionMemberFee: 80, perSessionWalkInFee: 100 });
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(true);
  const [walkInConfirmOpen, setWalkInConfirmOpen] = useState(false);
  // Member per-session payment modal
  const [memberPayOpen, setMemberPayOpen] = useState(false);
  const [memberForPayment, setMemberForPayment] = useState<any>(null);

  const refreshTodayAttendance = async () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const records = await db.attendance.where('date').equals(dateStr).toArray();
    // Sort latest first by id (timestamp-based below)
    records.sort((a: any, b: any) => (b.id > a.id ? 1 : -1));
    setTodayAttendance(records);
    // Reset page if needed
    const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
    setCurrentPage(prev => Math.min(prev, pageCount));
  };

  useEffect(() => {
    (async () => {
      await initLocalDb();
      const appP = await getAppPricing();
      setAppPricingState(appP as any);
      refreshTodayAttendance();
    })();
  }, []);

  useEffect(() => {
    // Persist check-in type selection
    localStorage.setItem('attendance_checkin_type', checkInType);
  }, [checkInType]);

  // Handle URL query parameter for date filter
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam === 'today') {
      setShowingToday(true);
    }
  }, [searchParams]);

  const clearDateFilter = () => {
    setShowingToday(false);
    setSearchParams({});
  };

  useEffect(() => {
    // Determine if current walk-in name is a first-time visitor
    (async () => {
      const normalized = (walkInName || '').trim().toLowerCase();
      if (!normalized) {
        setIsFirstVisit(true);
        return;
      }
      const allWalkins = await db.attendance.where('memberId').equals('WALKIN').toArray();
      const prior = allWalkins.some((r: any) => (r.walkInName || '').trim().toLowerCase() === normalized);
      setIsFirstVisit(!prior);
    })();
  }, [walkInName]);

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

    // Message handled by caller depending on flow
    toast({ title: 'Check-in Successful', description: `${member.fullName} checked in at ${checkInTime}` });

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

      {/* Active Date Filter Indicator */}
      {showingToday && (
        <Alert className="border-success/50 bg-success/5">
          <AlertDescription className="flex items-center justify-between">
            <span>
              📅 Showing Today's Attendance ({new Date().toLocaleDateString()})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDateFilter}
              className="h-6 px-2"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filter
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <Label>Check-In Type</Label>
          <Select value={checkInType} onValueChange={(v: any) => setCheckInType(v)}>
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select Check-In Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="walkin">Non-Member (Walk-In)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-in Form */}
        {checkInType === 'member' && (
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
        )}

        {/* Walk-In Check-in */
        }
        {checkInType === 'walkin' && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Walk-In Check-in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="walkInName">Walk-In Name</Label>
              <Input id="walkInName" required placeholder="e.g., Juan D." value={walkInName} onChange={(e) => setWalkInName(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Session Type</Label>
                <div className="w-full h-10 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm">
                  Per Session {appPricing.perSessionWalkInFee ? `(₱${appPricing.perSessionWalkInFee})` : ''}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="GCash">GCash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">No lifetime fee for walk-ins. They pay the walk-in per session rate every visit.</p>

            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">₱{Number(appPricing.perSessionWalkInFee) || 100}</span>
              </div>
              <Button
                className="bg-gradient-primary hover:opacity-90"
                disabled={!walkInName.trim()}
                onClick={() => {
                  if (!walkInName.trim()) {
                    toast({ title: 'Name Required', description: 'Please enter the walk-in name before recording.', variant: 'destructive' });
                    return;
                  }
                  setWalkInConfirmOpen(true);
                }}
              >
                Record Walk-In
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Today's Attendance */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Today's Attendance ({todayAttendance.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const pageCount = Math.max(1, Math.ceil(todayAttendance.length / pageSize));
                const start = (currentPage - 1) * pageSize;
                const visible = todayAttendance.slice(start, start + pageSize);
                return visible;
              })().map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">
                      {record.memberName} {record.is_walk_in ? <span className="text-xs text-muted-foreground">(Non-Member)</span> : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {record.is_walk_in ? `${record.session_type?.replace('_', ' ')} • ${record.payment_method} • ₱${record.price}` : `ID: ${record.memberId}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{record.checkInTime}{record.checkOutTime ? ` • ${record.checkOutTime}` : ''}</p>
                    <Badge variant="outline" className="text-xs">{record.is_walk_in ? 'Walk-In' : 'Active'}</Badge>
                  </div>
                </div>
              ))}
              
              {todayAttendance.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No check-ins recorded today</p>
              )}
            </div>
            {todayAttendance.length > pageSize && (
              <div className="pt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} />
                    </PaginationItem>
                    {Array.from({ length: Math.ceil(todayAttendance.length / pageSize) }, (_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink isActive={currentPage === i + 1} onClick={() => setCurrentPage(i + 1)}>
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext onClick={() => setCurrentPage(p => Math.min(Math.ceil(todayAttendance.length / pageSize), p + 1))} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
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
                      <div>
                        <Badge className={(memberForAction.status === 'expired' || !memberForAction.isActive) ? 'bg-destructive/15 text-destructive border-destructive/30' : ''} variant={(memberForAction.status === 'expired' || !memberForAction.isActive) ? 'destructive' : 'outline'}>
                          {String(memberForAction.status).toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium w-24">Membership Fee:</span>
                      <Badge variant={memberForAction.membershipFeePaid ? 'outline' : 'destructive'} className={!memberForAction.membershipFeePaid ? 'text-destructive border-destructive/30' : ''}>
                        {memberForAction.membershipFeePaid ? 'Paid' : 'Unpaid'}
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
                  // Determine subscription status
                  const today = new Date();
                  const subExpiry = memberForAction.subscriptionExpiryDate ? new Date(memberForAction.subscriptionExpiryDate) : null;
                  const isActiveSub = memberForAction.paymentType === 'monthly' && subExpiry && subExpiry >= today;
                  if (isActiveSub) {
                    performCheckIn(memberForAction);
                  } else {
                    setMemberForPayment(memberForAction);
                    setMemberPayOpen(true);
                  }
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

      {/* Walk-In Confirmation Modal */}
      <AlertDialog open={walkInConfirmOpen} onOpenChange={setWalkInConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Walk-In</AlertDialogTitle>
            <AlertDialogDescription>
              Please review the walk-in details before recording.
            </AlertDialogDescription>
          </AlertDialogHeader>
            <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{walkInName || 'Walk-In'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Session</span><span className="font-medium">Per session</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="font-medium">{paymentMethod}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Rate</span><span className="font-medium">₱{Number(appPricing.perSessionWalkInFee) || 100}</span></div>
            <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Total</span><span className="font-semibold">₱{Number(appPricing.perSessionWalkInFee) || 100}</span></div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const now = new Date();
                const checkInTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' });
                const dateStr = now.toISOString().split('T')[0];
                const price = Number(appPricing.perSessionWalkInFee) || 100;
                const total = price;
                await db.attendance.add({
                  id: `${Date.now()}`,
                  memberId: 'WALKIN',
                  memberName: walkInName || 'Walk-In',
                  date: dateStr,
                  checkInTime,
                  is_walk_in: true,
                  walkInName: walkInName || 'Walk-In',
                  session_type: 'whole_day',
                  payment_method: paymentMethod,
                  price: total,
                } as any);
                await addPayment({
                  date: dateStr,
                  amount: price,
                  method: paymentMethod,
                  category: 'Walk-In Session Fee',
                  description: `Walk-in per session for ${walkInName || 'Walk-In'}`,
                  memberId: `WALKIN:${walkInName || 'Walk-In'}`,
                });
                setWalkInConfirmOpen(false);
                setWalkInName('');
                setPaymentMethod('Cash');
                toast({ title: 'Walk-In Recorded', description: `Recorded ${walkInName || 'Walk-In'} • Per session • ₱${total}` });
                refreshTodayAttendance();
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

  {/* Member Per-Session Payment Modal */}
  <AlertDialog open={memberPayOpen} onOpenChange={setMemberPayOpen}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Per-Session Payment Required</AlertDialogTitle>
        <AlertDialogDescription>
          {memberForPayment ? `${memberForPayment.fullName} does not have an active monthly subscription.` : ''}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Member</span><span className="font-medium">{memberForPayment?.fullName}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Rate</span><span className="font-medium">₱{Number(appPricing.perSessionMemberFee) || 80}</span></div>
        <div className="space-y-2 pt-2">
          <Label>Payment Method</Label>
          <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="GCash">GCash</SelectItem>
              <SelectItem value="Card">Card</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={async () => {
            if (!memberForPayment) return;
            const fee = Number(appPricing.perSessionMemberFee) || 80;
            const dateStr = new Date().toISOString().split('T')[0];
            await addPayment({
              date: dateStr,
              amount: fee,
              method: paymentMethod,
              category: 'Member Session Fee',
              description: `Per-session payment for ${memberForPayment.fullName} (${memberForPayment.id})`,
              memberId: memberForPayment.id,
            });
            setMemberPayOpen(false);
            await performCheckIn(memberForPayment);
            toast({ title: 'Payment Successful', description: `Paid ₱${fee}. Check-in completed.` });
          }}
        >
          Pay & Check In
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