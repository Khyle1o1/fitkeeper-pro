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
  const [walkInDailyRate, setWalkInDailyRate] = useState<string>('0');

  useEffect(() => {
    (async () => {
      await initLocalDb();
      const appPricing = await getAppPricing();
      setMembershipFee(String(appPricing.membershipFee ?? 200));
      setWalkInDailyRate(String(appPricing.walkInDailyRate ?? 0));
    })();
  }, []);

  const handleSave = async () => {
    await setAppPricing({ membershipFee: Number(membershipFee) || 200, walkInDailyRate: Number(walkInDailyRate) || 0 });
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
              <Label htmlFor="membershipFee">Membership Fee (₱)</Label>
              <Input id="membershipFee" type="number" min="0" value={membershipFee} onChange={(e) => setMembershipFee(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="walkInDailyRate">Walk-In Daily Rate (₱)</Label>
              <Input id="walkInDailyRate" type="number" min="0" value={walkInDailyRate} onChange={(e) => setWalkInDailyRate(e.target.value)} />
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


