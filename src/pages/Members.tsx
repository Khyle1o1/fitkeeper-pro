import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Archive, X } from 'lucide-react';
import { getMembershipStatus } from '@/data/mockData';
import { Member } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { db, initLocalDb, getAppPricing, addPayment } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { generateBarcodeDataUrl, generateQrCodeDataUrl } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Helper to determine member category and badge
const getMemberCategory = (member: Member): { 
  type: 'monthly_subscriber' | 'per_session' | 'archived',
  badge: { text: string; className: string; emoji: string }
} => {
  // Archived members
  if (member.status === 'archived' || !member.isActive) {
    return {
      type: 'archived',
      badge: { text: 'Archived', className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300', emoji: '🟥' }
    };
  }

  // Check if they have an active monthly subscription
  const today = new Date();
  const subExpiry = member.subscriptionExpiryDate ? new Date(member.subscriptionExpiryDate) : null;
  const hasActiveSubscription = member.paymentType === 'monthly' && subExpiry && subExpiry >= today;

  if (hasActiveSubscription) {
    return {
      type: 'monthly_subscriber',
      badge: { text: 'Active Monthly', className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300', emoji: '🟩' }
    };
  }

  // Check if they're registered but choosing per-session
  if (member.membershipFeePaid && member.paymentType === 'per_session') {
    return {
      type: 'per_session',
      badge: { text: 'Per Session', className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300', emoji: '🟦' }
    };
  }

  // Members with fee paid but no subscription yet - treat as per_session for display
  if (member.membershipFeePaid) {
    return {
      type: 'per_session',
      badge: { text: 'Member Only', className: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900 dark:text-orange-300', emoji: '🟧' }
    };
  }

  // Default to per_session if they're active
  return {
    type: 'per_session',
    badge: { text: 'Member', className: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900 dark:text-orange-300', emoji: '🟧' }
  };
};

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

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

  // Handle URL query parameters for filtering
  useEffect(() => {
    const status = searchParams.get('status');
    const expiry = searchParams.get('expiry');

    if (status === 'active') {
      setActiveFilter('active');
      setTabsValue('monthly');
    } else if (expiry === '7days') {
      setActiveFilter('expiring');
      setTabsValue('monthly');
    } else {
      setActiveFilter(null);
    }
  }, [searchParams]);

  const clearFilter = () => {
    setActiveFilter(null);
    setSearchParams({});
  };

  // Filter members based on active filter
  const getFilteredMembersByType = (baseMembers: Member[]) => {
    if (activeFilter === 'active') {
      return baseMembers.filter(m => m.isActive && m.status === 'active');
    } else if (activeFilter === 'expiring') {
      const today = new Date();
      const in7Days = new Date();
      in7Days.setDate(today.getDate() + 7);
      return baseMembers.filter(m => {
        const expiryDate = new Date(m.membershipExpiryDate);
        return m.isActive && expiryDate >= today && expiryDate <= in7Days;
      });
    }
    return baseMembers;
  };

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

      {/* Active Filter Indicator */}
      {activeFilter && (
        <Alert className="border-primary/50 bg-primary/5">
          <AlertDescription className="flex items-center justify-between">
            <span>
              {activeFilter === 'active' && '🔍 Showing only Active Members'}
              {activeFilter === 'expiring' && '⚠️ Showing only Memberships Expiring Within 7 Days'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilter}
              className="h-6 px-2"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filter
            </Button>
          </AlertDescription>
        </Alert>
      )}

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

      {/* Members List with Category Tabs */}
      <Tabs value={tabsValue} onValueChange={(v) => setTabsValue(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monthly">🟩 Monthly Subscribers</TabsTrigger>
          <TabsTrigger value="per_session">🟦 Per Session</TabsTrigger>
          <TabsTrigger value="archived">🟥 Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>🟩 Monthly Subscribers</CardTitle>
              <p className="text-sm text-muted-foreground">Members with active monthly subscriptions</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  const monthlyMembers = filteredMembers.filter(m => {
                    const category = getMemberCategory(m);
                    return category.type === 'monthly_subscriber';
                  });
                  const displayMembers = getFilteredMembersByType(monthlyMembers);
                  return displayMembers.length > 0 ? (
                    displayMembers.map((member) => {
                      const category = getMemberCategory(member);
                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => openMemberDialog(member)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {member.photoDataUrl && (
                                <img src={member.photoDataUrl} alt="" className="h-12 w-12 rounded-full object-cover border-2" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">{member.fullName}</h3>
                                  <Badge className={category.badge.className}>{category.badge.emoji} {category.badge.text}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">ID: {member.id}</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 mt-1 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Membership Fee:</span>{' '}
                                    <span className="font-medium">₱{member.membershipFeePaid ? '200 (Paid)' : 'Unpaid'}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Subscription:</span>{' '}
                                    {member.paidMonths && member.freeMonths && member.freeMonths > 0 ? (
                                      <span className="font-medium text-green-600 dark:text-green-400">
                                        {member.paidMonths} months (+{member.freeMonths} free) 🎉
                                      </span>
                                    ) : (
                                      <span className="font-medium">Monthly</span>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Expires:</span>{' '}
                                    <span className="font-medium">{member.subscriptionExpiryDate}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                db.members.update(member.id, { paymentType: 'per_session', subscriptionExpiryDate: '' } as any)
                                  .then(() => {
                                    setMembers(prev => prev.map(x => x.id === member.id ? { ...x, paymentType: 'per_session', subscriptionExpiryDate: '' } : x));
                                    toast({ title: 'Subscription Cancelled', description: `${member.fullName} is now on per-session basis.` });
                                  });
                              }}
                              className="text-orange-700 border-orange-200 hover:bg-orange-50"
                            >
                              Cancel Subscription
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        {activeFilter ? 'No members match the current filter.' : 'No monthly subscribers found.'}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="per_session">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>🟦 Per Session Members</CardTitle>
              <p className="text-sm text-muted-foreground">Members who pay per visit</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  const perSessionMembers = filteredMembers.filter(m => {
                    const category = getMemberCategory(m);
                    return category.type === 'per_session';
                  });
                  const displayMembers = getFilteredMembersByType(perSessionMembers);
                  return displayMembers.length > 0 ? (
                    displayMembers.map((member) => {
                      const category = getMemberCategory(member);
                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => openMemberDialog(member)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {member.photoDataUrl && (
                                <img src={member.photoDataUrl} alt="" className="h-12 w-12 rounded-full object-cover border-2" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">{member.fullName}</h3>
                                  <Badge className={category.badge.className}>{category.badge.emoji} {category.badge.text}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">ID: {member.id}</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 mt-1 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Membership Fee:</span>{' '}
                                    <span className="font-medium">₱200 (Paid)</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Total Sessions:</span>{' '}
                                    <span className="font-medium">{member.sessionCount || 0}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Last Session:</span>{' '}
                                    <span className="font-medium">{member.lastSessionDate || 'Never'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setRenewMember(member); 
                                setRenewMonths(1); 
                                setRenewStep('confirm'); 
                                setIsRenewDialogOpen(true); 
                              }}
                              className="text-green-700 border-green-200 hover:bg-green-50"
                            >
                              Switch to Monthly
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setArchiveMember(member); 
                                setIsArchiveDialogOpen(true); 
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              Archive
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        {activeFilter ? 'No members match the current filter.' : 'No per-session members found.'}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="archived">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>🟥 Archived</CardTitle>
              <p className="text-sm text-muted-foreground">Inactive or archived members</p>
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

                  {/* Referral Information */}
                  <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <h4 className="font-bold text-base mb-4 text-blue-700 dark:text-blue-300">Referral Program</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Your Invite Code</p>
                        <code className="inline-block px-3 py-2 bg-white dark:bg-gray-800 rounded-md font-mono text-lg font-bold border-2 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300">
                          {selectedMember.invite_code || selectedMember.id}
                        </code>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">Share this code to invite new members</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Referral Progress</p>
                        <div className="mt-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                              {selectedMember.invite_count || 0}/4
                            </span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">successful invites</span>
                          </div>
                          {(selectedMember.invite_count || 0) > 0 && (selectedMember.invite_count || 0) < 4 && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                              {4 - (selectedMember.invite_count || 0)} more {4 - (selectedMember.invite_count || 0) === 1 ? 'invite' : 'invites'} to earn 1 free month! 🎁
                            </p>
                          )}
                          {(selectedMember.invite_count || 0) === 0 && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                              Invite 4 members to earn 1 free month! 🎁
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedMember.referred_by && (
                        <div className="sm:col-span-2 pt-3 border-t border-blue-200 dark:border-blue-800">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Referred By</p>
                          <p className="font-bold text-base text-blue-700 dark:text-blue-300">Invite Code: {selectedMember.referred_by}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Promo Information */}
                  {selectedMember.paymentType === 'monthly' && selectedMember.subscriptionExpiryDate && selectedMember.paidMonths && selectedMember.freeMonths && selectedMember.freeMonths > 0 && (
                    <div className="mt-6 p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border-2 border-green-200 dark:border-green-800">
                      <h4 className="font-bold text-base mb-3 text-green-700 dark:text-green-300">🎉 Active Promo</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Paid Months</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedMember.paidMonths}</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Free Months</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedMember.freeMonths}</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Total Months</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedMember.paidMonths + selectedMember.freeMonths}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 font-medium">
                        Subscription expires: <strong>{selectedMember.subscriptionExpiryDate}</strong>
                      </p>
                    </div>
                  )}

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
                    <DialogTitle className="text-2xl">Start Monthly Subscription</DialogTitle>
                    <DialogDescription>
                      Subscribe {renewMember.fullName} to monthly access for {renewMonths} {renewMonths === 1 ? 'month' : 'months'}?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Member</span><span className="font-medium">{renewMember.fullName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-medium">{renewMonths} month{renewMonths > 1 ? 's' : ''}</span></div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold">₱{500 * renewMonths}</span>
                    </div>
                    <div className="pt-2">
                      <Label>Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="GCash">GCash</SelectItem>
                          <SelectItem value="Card">Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
                        const addMonthsToDate = (startIso: string, months: number): string => {
                          const date = new Date(startIso);
                          const startDay = date.getDate();
                          date.setMonth(date.getMonth() + months);
                          if (date.getDate() !== startDay) {
                            date.setDate(0);
                          }
                          return date.toISOString().split('T')[0];
                        };
                        const subscriptionExpiry = addMonthsToDate(nowIso, months);

                        // Update member to monthly subscription
                        await db.members.update(member.id, {
                          paymentType: 'monthly',
                          subscriptionExpiryDate: subscriptionExpiry,
                          status: 'active',
                          isActive: true,
                        } as any);

                        // Record payment
                        await addPayment({
                          date: nowIso,
                          amount: 500 * months,
                          method: paymentMethod,
                          category: 'Monthly Subscription',
                          description: `Monthly subscription (${months} month${months > 1 ? 's' : ''}) for ${member.fullName} (${member.id})`,
                          memberId: member.id,
                        });

                        setMembers(prev => prev.map(m => m.id === member.id ? {
                          ...m,
                          paymentType: 'monthly',
                          subscriptionExpiryDate: subscriptionExpiry,
                          status: 'active',
                          isActive: true,
                        } : m));

                        setTabsValue('monthly');
                        setIsRenewDialogOpen(false);
                        setRenewMember(null);
                        setRenewMonths(1);
                        setRenewStep('select');

                        toast({ title: 'Subscription Started', description: `${member.fullName} is now subscribed until ${subscriptionExpiry}.` });
                      }}
                    >
                      Confirm & Pay
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