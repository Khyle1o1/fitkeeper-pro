import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { initLocalDb, getAppPricing, setAppPricing } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { toast } = useToast();
  const [membershipFee, setMembershipFee] = useState<string>('200');
  const [monthlySubscriptionFee, setMonthlySubscriptionFee] = useState<string>('500');
  const [perSessionMemberFee, setPerSessionMemberFee] = useState<string>('80');
  const [perSessionWalkInFee, setPerSessionWalkInFee] = useState<string>('100');

  useEffect(() => {
    (async () => {
      await initLocalDb();
      const appPricing = await getAppPricing();
      setMembershipFee(String(appPricing.membershipFee ?? 200));
      setMonthlySubscriptionFee(String(appPricing.monthlySubscriptionFee ?? 500));
      setPerSessionMemberFee(String(appPricing.perSessionMemberFee ?? 80));
      setPerSessionWalkInFee(String(appPricing.perSessionWalkInFee ?? 100));
    })();
  }, []);

  const handleSave = async () => {
    await setAppPricing({ 
      membershipFee: Number(membershipFee) || 200,
      monthlySubscriptionFee: Number(monthlySubscriptionFee) || 500,
      perSessionMemberFee: Number(perSessionMemberFee) || 80,
      perSessionWalkInFee: Number(perSessionWalkInFee) || 100,
    });
    toast({ title: 'Saved', description: 'Pricing has been updated.' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure application preferences</p>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="membershipFee">Membership Fee (Lifetime) (₱)</Label>
              <Input id="membershipFee" type="number" min="0" value={membershipFee} onChange={(e) => setMembershipFee(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlySubscriptionFee">Monthly Subscription Fee (₱)</Label>
              <Input id="monthlySubscriptionFee" type="number" min="0" value={monthlySubscriptionFee} onChange={(e) => setMonthlySubscriptionFee(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perSessionMemberFee">Per Session Fee (Member) (₱)</Label>
              <Input id="perSessionMemberFee" type="number" min="0" value={perSessionMemberFee} onChange={(e) => setPerSessionMemberFee(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perSessionWalkInFee">Per Session Fee (Walk-in) (₱)</Label>
              <Input id="perSessionWalkInFee" type="number" min="0" value={perSessionWalkInFee} onChange={(e) => setPerSessionWalkInFee(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="bg-gradient-primary hover:opacity-90" onClick={handleSave}>Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;


