import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Archive } from 'lucide-react';
import { getMembershipStatus } from '@/data/mockData';
import { Member } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { db, initLocalDb, getAppPricing, addPayment } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { generateBarcodeDataUrl, generateQrCodeDataUrl } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Members = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [barcodePreview, setBarcodePreview] = useState<string | null>(null);
  const [tabsValue, setTabsValue] = useState<'monthly' | 'per_session' | 'archived'>('monthly');
  const [isRenewDialogOpen, setIsRenewDialogOpen] = useState(false);
  const [renewMember, setRenewMember] = useState<Member | null>(null);
  const [renewMonths, setRenewMonths] = useState<number>(1);
  const [renewStep, setRenewStep] = useState<'select' | 'confirm'>('select');
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [archiveMember, setArchiveMember] = useState<Member | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteMemberState, setDeleteMemberState] = useState<Member | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'GCash' | 'Card'>('Cash');

  useEffect(() => {
    const fetchMembers = async () => {
      await initLocalDb();
      const all = await db.members.toArray();

      // Auto-update statuses based on dates (active -> expired -> archived)
      const today = new Date();
      const updates: Array<Promise<any>> = [];
      const updatedMembers = (all as Member[]).map((m) => {
        // Determine computed status based on expiry date
        const computed = getMembershipStatus(m.membershipExpiryDate);
        let next: Member = { ...m };
        if (computed !== m.status) {
          next.status = computed as Member['status'];
          // Archived implies inactive
          if (computed === 'archived') {
            next.isActive = false as any;
          }
          updates.push(db.members.update(m.id, { status: computed, isActive: next.isActive } as any));
          if (computed === 'expired') {
            toast({ title: 'Membership Expired', description: `Member ${m.fullName} has expired. Renew within 30 days to avoid archiving.` });
          }
          if (computed === 'archived') {
            toast({ title: 'Member Archived', description: `Member ${m.fullName} has been archived due to no renewal within 30 days.` });
          }
        }
        return next;
      });

      if (updates.length > 0) {
        await Promise.all(updates);
      }

      // Sort by full name
      updatedMembers.sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));
      setMembers(updatedMembers as any);
    };

    fetchMembers();
  }, [toast]);

  const filteredMembers = members.filter(member =>
    member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleArchiveMember = async (memberId: string) => {
    await db.members.update(memberId, { isActive: false, status: 'archived' } as any);
    setMembers(prev => prev.map(member => member.id === memberId ? { ...member, isActive: false, status: 'archived' } : member));
    toast({ title: 'Member Archived', description: 'Member has been successfully archived.' });
  };

  const handleRenew = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const currentExpiry = new Date(member.membershipExpiryDate);
    // If expired/archived, renew from today; otherwise extend from current expiry
    const baseDate = (member.status === 'expired' || member.status === 'archived') ? new Date() : currentExpiry;
    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + (member.membershipDurationMonths || 1));
    const iso = newExpiry.toISOString().split('T')[0];

    await db.members.update(memberId, { 
      membershipStartDate: new Date().toISOString().split('T')[0],
      membershipExpiryDate: iso,
      status: 'active',
      isActive: true,
    } as any);

    setMembers(prev => prev.map(m => m.id === memberId ? { 
      ...m,
      membershipStartDate: new Date().toISOString().split('T')[0],
      membershipExpiryDate: iso,
      status: 'active',
      isActive: true,
    } : m));

    toast({ title: 'Membership Renewed', description: `Member ${member.fullName} has been renewed and is now Active.` });
  };

  const getStatusBadge = (status: Member['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 border-green-200">🟢 Active</Badge>;
      case 'expired':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">🟠 Expired</Badge>;
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">⚫ Archived</Badge>;
      case 'soon-to-expire':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Expiring Soon</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getRemainingDays = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.ceil((expiry.getTime() - today.getTime()) / msPerDay));
  };

  const openMemberDialog = (member: Member) => {
    setSelectedMember(member);
    setIsDialogOpen(true);
  };

  const closeMemberDialog = () => {
    setIsDialogOpen(false);
    setSelectedMember(null);
    setQrPreview(null);
    setBarcodePreview(null);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedMember) return;
      // Prefer stored data URLs; otherwise generate from member ID
      const qr = selectedMember.qrCodeDataUrl || await generateQrCodeDataUrl(selectedMember.id);
      const bar = selectedMember.barcodeDataUrl || await generateBarcodeDataUrl(selectedMember.id);
      if (!cancelled) {
        setQrPreview(qr);
        setBarcodePreview(bar);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedMember]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Members</h1>
          <p className="text-muted-foreground">Manage your gym members and memberships</p>
        </div>
        <Link to="/members/add">
          <Button className="bg-gradient-primary hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search members by name, ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Members List with Subscription Tabs */}
      <Tabs value={tabsValue} onValueChange={(v) => setTabsValue(v as any)}>
        <TabsList>
          <TabsTrigger value="monthly">🟢 Monthly Subscribers</TabsTrigger>
          <TabsTrigger value="per_session">🟡 Per Session Members</TabsTrigger>
          <TabsTrigger value="archived">⚫ Archived Members</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>
                Monthly Subscribers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.filter(m => m.paymentType === 'monthly' && !!m.subscriptionExpiryDate && new Date(m.subscriptionExpiryDate) >= new Date()).length > 0 ? (
                  members.filter(m => m.paymentType === 'monthly' && !!m.subscriptionExpiryDate && new Date(m.subscriptionExpiryDate) >= new Date()).map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => openMemberDialog(member)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <h3 className="font-semibold">{member.fullName}</h3>
                            <p className="text-sm text-muted-foreground">ID: {member.id}</p>
                          </div>
                          <div className="hidden md:block">
                            <p className="text-sm">{member.email}</p>
                            <p className="text-sm text-muted-foreground">{member.phone}</p>
                          </div>
                          <div className="hidden lg:block">
                            <p className="text-sm">Start: {member.membershipStartDate}</p>
                            <p className="text-sm text-muted-foreground">Subscription Expires: {member.subscriptionExpiryDate}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className="bg-green-100 text-green-700 border-green-200">🟢 Active</Badge>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); /* cancel -> per session */ db.members.update(member.id, { paymentType: 'per_session', subscriptionExpiryDate: '' } as any).then(() => setMembers(prev => prev.map(x => x.id === member.id ? { ...x, paymentType: 'per_session', subscriptionExpiryDate: '' } : x))); }}
                            className="text-orange-700 border-orange-200 hover:bg-orange-50"
                          >
                            Cancel Subscription
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No active members match your search.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="per_session">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Per Session Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.filter(m => !(m.paymentType === 'monthly' && !!m.subscriptionExpiryDate && new Date(m.subscriptionExpiryDate) >= new Date()) && (m.status !== 'archived')).length > 0 ? (
                  members.filter(m => !(m.paymentType === 'monthly' && !!m.subscriptionExpiryDate && new Date(m.subscriptionExpiryDate) >= new Date()) && (m.status !== 'archived')).map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => openMemberDialog(member)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <h3 className="font-semibold">{member.fullName}</h3>
                            <p className="text-sm text-muted-foreground">ID: {member.id}</p>
                          </div>
                          <div className="hidden md:block">
                            <p className="text-sm">{member.email}</p>
                            <p className="text-sm text-muted-foreground">{member.phone}</p>
                          </div>
                          <div className="hidden lg:block">
                            <p className="text-sm">Start: {member.membershipStartDate}</p>
                            <p className="text-sm text-muted-foreground">Last Subscription Expiry: {member.subscriptionExpiryDate || '-'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">🔴 Expired</Badge>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setRenewMember(member); setRenewMonths(1); setRenewStep('confirm'); setIsRenewDialogOpen(true); }}
                            className="text-green-700 border-green-200 hover:bg-green-50"
                          >
                            Subscribe to Monthly
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setArchiveMember(member); setIsArchiveDialogOpen(true); }}
                            className="text-destructive hover:text-destructive"
                          >
                            Archive
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No expired members match your search.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archived">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Archived</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredMembers.filter(m => m.status === 'archived' || !m.isActive).length > 0 ? (
                  filteredMembers.filter(m => m.status === 'archived' || !m.isActive).map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => openMemberDialog(member)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <h3 className="font-semibold">{member.fullName}</h3>
                            <p className="text-sm text-muted-foreground">ID: {member.id}</p>
                          </div>
                          <div className="hidden md:block">
                            <p className="text-sm">{member.email}</p>
                            <p className="text-sm text-muted-foreground">{member.phone}</p>
                          </div>
                          <div className="hidden lg:block">
                            <p className="text-sm">Start: {member.membershipStartDate}</p>
                            <p className="text-sm text-muted-foreground">Expires: {member.membershipExpiryDate}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(member.status === 'archived' ? 'archived' : member.status)}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setRenewMember(member); setRenewMonths(1); setRenewStep('select'); setIsRenewDialogOpen(true); }}
                            className="text-green-700 border-green-200 hover:bg-green-50"
                          >
                            Renew
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setDeleteMemberState(member); setIsDeleteDialogOpen(true); }}
                            className="text-destructive hover:text-destructive"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No archived members match your search.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : closeMemberDialog())}>
        <DialogContent>
          {selectedMember && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedMember.fullName}</DialogTitle>
                <DialogDescription>Member information</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    {selectedMember.photoDataUrl ? (
                      <img src={selectedMember.photoDataUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">No photo</span>
                    )}
                  </div>
                  <Link to={`/members/edit/${selectedMember.id}`}>
                    <Button className="w-full">Edit Member</Button>
                  </Link>
                </div>

                <div className="sm:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Member ID</p>
                      <p className="font-medium">{selectedMember.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedMember.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium break-all">{selectedMember.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedMember.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Membership Start</p>
                      <p className="font-medium">{selectedMember.membershipStartDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expiry Date</p>
                      <p className="font-medium">{selectedMember.membershipExpiryDate}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm text-muted-foreground">QR Code</p>
                      {qrPreview ? (
                        <img src={qrPreview} alt="QR Code" className="w-40 h-40" />
                      ) : (
                        <div className="w-40 h-40 bg-muted rounded" />
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm text-muted-foreground">Barcode</p>
                      {barcodePreview ? (
                        <img src={barcodePreview} alt="Barcode" className="w-60 h-16 object-contain" />
                      ) : (
                        <div className="w-60 h-16 bg-muted rounded" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteDialogOpen(false);
            setDeleteMemberState(null);
          } else {
            setIsDeleteDialogOpen(true);
          }
        }}
      >
        <DialogContent>
          {deleteMemberState && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-2xl">Delete Member</DialogTitle>
                <DialogDescription>
                  This will permanently delete {deleteMemberState.fullName} and their records from the local database. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    const m = deleteMemberState;
                    await db.members.delete(m.id);
                    setMembers(prev => prev.filter(x => x.id !== m.id));
                    setIsDeleteDialogOpen(false);
                    setDeleteMemberState(null);
                    toast({ title: 'Member Deleted', description: `${m.fullName} has been deleted permanently.` });
                  }}
                >
                  Delete Permanently
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Modal */}
      <Dialog
        open={isArchiveDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsArchiveDialogOpen(false);
            setArchiveMember(null);
          } else {
            setIsArchiveDialogOpen(true);
          }
        }}
      >
        <DialogContent>
          {archiveMember && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-2xl">Archive Member</DialogTitle>
                <DialogDescription>
                  Are you sure you want to archive {archiveMember.fullName}? They still have an active membership with {getRemainingDays(archiveMember.membershipExpiryDate)} remaining days.
                </DialogDescription>
              </DialogHeader>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    const m = archiveMember;
                    const remaining = getRemainingDays(m.membershipExpiryDate);
                    await db.members.update(m.id, { isActive: false, status: 'archived' } as any);
                    setMembers(prev => prev.map(x => x.id === m.id ? { ...x, isActive: false, status: 'archived' } : x));
                    setTabsValue('archived');
                    setIsArchiveDialogOpen(false);
                    setArchiveMember(null);
                    toast({ title: 'Member Archived', description: `Member ${m.fullName} has been archived despite having ${remaining} days remaining.` });
                  }}
                >
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Renew Modal */}
      <Dialog
        open={isRenewDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsRenewDialogOpen(false);
            setRenewMember(null);
            setRenewMonths(1);
            setRenewStep('select');
          } else {
            setIsRenewDialogOpen(true);
          }
        }}
      >
        <DialogContent>
          {renewMember && (
            <div className="space-y-4">
              {renewStep === 'select' && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Renew Membership</DialogTitle>
                    <DialogDescription>
                      How many months do you want to renew this membership?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Months (1–12)</label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={renewMonths}
                      onChange={(e) => setRenewMonths(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" onClick={() => { setIsRenewDialogOpen(false); }}>
                      Cancel
                    </Button>
                    <Button className="bg-gradient-success hover:opacity-90" onClick={() => setRenewStep('confirm')}>
                      Continue
                    </Button>
                  </div>
                </>
              )}
              {renewStep === 'confirm' && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Confirm Renewal</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to renew {renewMember.fullName} for {renewMonths} {renewMonths === 1 ? 'month' : 'months'}?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" onClick={() => setRenewStep('select')}>
                      Back
                    </Button>
                    <Button
                      className="bg-gradient-success hover:opacity-90"
                      onClick={async () => {
                        const member = renewMember;
                        if (!member) return;
                        const months = renewMonths;
                        const nowIso = new Date().toISOString().split('T')[0];
                        const currentExpiry = new Date(member.membershipExpiryDate);
                        const baseDate = (member.status === 'expired' || member.status === 'archived') ? new Date() : currentExpiry;
                        const newExpiry = new Date(baseDate);
                        newExpiry.setMonth(newExpiry.getMonth() + months);
                        const iso = newExpiry.toISOString().split('T')[0];

                        await db.members.update(member.id, {
                          membershipStartDate: nowIso,
                          membershipExpiryDate: iso,
                          status: 'active',
                          isActive: true,
                        } as any);

                        setMembers(prev => prev.map(m => m.id === member.id ? {
                          ...m,
                          membershipStartDate: nowIso,
                          membershipExpiryDate: iso,
                          status: 'active',
                          isActive: true,
                        } : m));

                        setTabsValue('active');
                        setIsRenewDialogOpen(false);
                        setRenewMember(null);
                        setRenewMonths(1);
                        setRenewStep('select');

                        toast({ title: 'Membership Renewed', description: `Membership for ${member.fullName} has been renewed for ${months} ${months === 1 ? 'month' : 'months'}.` });
                      }}
                    >
                      Confirm
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Members;