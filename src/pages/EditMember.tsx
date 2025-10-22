import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { type Member, type PromoRate } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { db, initLocalDb, checkAndApplyPromo, getAppPricing, addPayment } from '@/lib/db';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EditMember = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    membershipExpiryDate: '',
  });
  
  // Subscription renewal states
  const [renewalDialogOpen, setRenewalDialogOpen] = useState(false);
  const [renewalMonths, setRenewalMonths] = useState<number>(1);
  const [appliedPromo, setAppliedPromo] = useState<PromoRate | null>(null);
  const [totalMonthsWithPromo, setTotalMonthsWithPromo] = useState<number>(1);
  const [freeMonths, setFreeMonths] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'GCash' | 'Card'>('Cash');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      await initLocalDb();
      const found = await db.members.get(id);
      if (!cancelled) {
        setMember(found || null);
        if (found) {
          setFormData({
            fullName: found.fullName,
            email: found.email,
            phone: found.phone,
            membershipExpiryDate: found.membershipExpiryDate,
          });
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Check and apply promo whenever renewal months change
  useEffect(() => {
    (async () => {
      if (renewalMonths > 0) {
        const promoResult = await checkAndApplyPromo(renewalMonths);
        setAppliedPromo(promoResult.appliedPromo);
        setTotalMonthsWithPromo(promoResult.totalMonths);
        setFreeMonths(promoResult.freeMonths);
      }
    })();
  }, [renewalMonths]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    await initLocalDb();
    await db.members.update(id, {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      membershipExpiryDate: formData.membershipExpiryDate,
    } as any);
    toast({
      title: "Member Updated",
      description: `${formData.fullName}'s information has been updated successfully.`,
    });
    navigate('/members');
  };

  const handleRenewal = () => {
    const newExpiryDate = new Date(formData.membershipExpiryDate);
    newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);
    setFormData(prev => ({ ...prev, membershipExpiryDate: newExpiryDate.toISOString().split('T')[0] }));
    toast({
      title: "Membership Renewed",
      description: "Membership has been extended by 1 month.",
    });
  };

  const handleOpenRenewalDialog = () => {
    setRenewalMonths(1);
    setRenewalDialogOpen(true);
  };

  const addMonths = (dateStr: string, months: number): string => {
    const date = new Date(dateStr);
    const startDay = date.getDate();
    date.setMonth(date.getMonth() + months);
    if (date.getDate() !== startDay) {
      date.setDate(0);
    }
    return date.toISOString().split('T')[0];
  };

  const handleSubscriptionRenewal = async () => {
    if (!member || !id) return;

    try {
      const pricing = await getAppPricing();
      const dateStr = new Date().toISOString().split('T')[0];
      
      // Calculate new expiry date using total months (including promo)
      const currentExpiry = member.subscriptionExpiryDate || formData.membershipExpiryDate;
      const newExpiry = addMonths(currentExpiry, totalMonthsWithPromo);

      // Update member with new expiry and promo info
      await db.members.update(id, {
        subscriptionExpiryDate: newExpiry,
        appliedPromoId: appliedPromo?.id || null,
        paidMonths: (member.paidMonths || 0) + renewalMonths,
        freeMonths: (member.freeMonths || 0) + freeMonths,
      } as any);

      // Record payment
      const promoNote = appliedPromo && freeMonths > 0 
        ? ` [Promo: ${appliedPromo.name} - ${freeMonths} free month(s), total ${totalMonthsWithPromo} months]`
        : '';
      await addPayment({
        date: dateStr,
        amount: (Number(pricing.monthlySubscriptionFee) || 500) * renewalMonths,
        method: paymentMethod,
        category: 'Monthly Subscription',
        description: `Subscription renewal: ${renewalMonths} month(s) for ${member.fullName} (${id})${promoNote}`,
        memberId: id,
      });

      const promoMessage = appliedPromo && freeMonths > 0
        ? ` 🎉 ${appliedPromo.name} applied: +${freeMonths} free month(s)!`
        : '';
      toast({
        title: 'Subscription Renewed',
        description: `Subscription extended to ${newExpiry}${promoMessage}`,
      });

      // Refresh member data
      const updated = await db.members.get(id);
      setMember(updated || null);
      if (updated) {
        setFormData(prev => ({
          ...prev,
          membershipExpiryDate: updated.membershipExpiryDate,
        }));
      }

      setRenewalDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to renew subscription.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!member) {
    return <div className="p-6">Member not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/members')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Members
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Member</h1>
          <p className="text-muted-foreground">Update member information and manage membership</p>
        </div>
      </div>

      <Card className="border-0 shadow-md max-w-2xl">
        <CardHeader>
          <CardTitle>Member Information - ID: {member.id}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryDate">Membership Expiry Date</Label>
              <div className="flex gap-2">
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.membershipExpiryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, membershipExpiryDate: e.target.value }))}
                  className="flex-1"
                />
                <Button type="button" onClick={handleRenewal} className="bg-gradient-success hover:opacity-90">
                  Renew (+1 Month)
                </Button>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/members')} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-gradient-primary hover:opacity-90">
                Update Member
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Subscription Renewal Card (for monthly subscribers) */}
      {member.paymentType === 'monthly' && member.subscriptionExpiryDate && (
        <Card className="border-0 shadow-md max-w-2xl">
          <CardHeader>
            <CardTitle>Subscription Renewal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Current Subscription</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                  Expires: {member.subscriptionExpiryDate}
                </p>
                {member.appliedPromoId && member.freeMonths && member.freeMonths > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    Last promo: {member.paidMonths} paid + {member.freeMonths} free months
                  </p>
                )}
              </div>
              <Button 
                onClick={handleOpenRenewalDialog} 
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                Renew Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral Information Card */}
      <Card className="border-0 shadow-md max-w-2xl">
        <CardHeader>
          <CardTitle>Referral Program</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Invite Code */}
            <div className="space-y-2">
              <Label>Your Invite Code</Label>
              <Input
                value={member.invite_code || member.id}
                readOnly
                className="font-mono font-semibold text-lg"
              />
              <p className="text-sm text-muted-foreground">
                Share this code with new members. Invite 4 people to earn 1 free month!
              </p>
            </div>

            {/* Referral Progress */}
            <div className="p-5 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Successful Invites</p>
                  <div className="flex items-center gap-2 mt-1 mb-2">
                    <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                      {member.invite_count || 0}/4
                    </span>
                  </div>
                  {(member.invite_count || 0) > 0 && (member.invite_count || 0) < 4 && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      {4 - (member.invite_count || 0)} more {4 - (member.invite_count || 0) === 1 ? 'invite' : 'invites'} to earn 1 free month! 🎁
                    </p>
                  )}
                  {(member.invite_count || 0) === 0 && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      Start inviting to earn free months! 🎁
                    </p>
                  )}
                </div>
                {member.referred_by && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">You Were Referred By</p>
                    <p className="font-bold text-lg text-blue-700 dark:text-blue-300 mt-1">Invite Code: {member.referred_by}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Renewal Dialog */}
      <Dialog open={renewalDialogOpen} onOpenChange={setRenewalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="renewalMonths">Select Renewal Period</Label>
              <select
                id="renewalMonths"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={renewalMonths}
                onChange={(e) => setRenewalMonths(Number(e.target.value))}
              >
                <option value={1}>1 Month</option>
                <option value={2}>2 Months</option>
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months</option>
              </select>
            </div>

            {appliedPromo && freeMonths > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-700 rounded-md">
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                  🎉 Promo Applied: {appliedPromo.name}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  You're paying for {renewalMonths} {renewalMonths > 1 ? 'months' : 'month'} and getting {freeMonths} {freeMonths > 1 ? 'months' : 'month'} free!
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Total subscription extension: <strong>{totalMonthsWithPromo} months</strong>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="GCash">GCash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-gray-700 dark:text-gray-200">
                <strong>Current Expiry:</strong> {member.subscriptionExpiryDate}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                <strong>New Expiry:</strong> {addMonths(member.subscriptionExpiryDate || '', totalMonthsWithPromo)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewalDialogOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-primary hover:opacity-90" onClick={handleSubscriptionRenewal}>
              Confirm Renewal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditMember;