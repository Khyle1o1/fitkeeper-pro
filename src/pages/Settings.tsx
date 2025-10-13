import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getWalkInPricing, setWalkInPricing, initLocalDb } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { toast } = useToast();
  const [oneHour, setOneHour] = useState<string>('0');
  const [twoHours, setTwoHours] = useState<string>('0');
  const [wholeDay, setWholeDay] = useState<string>('0');

  useEffect(() => {
    (async () => {
      await initLocalDb();
      const pricing = await getWalkInPricing();
      setOneHour(String(pricing.oneHour ?? 0));
      setTwoHours(String(pricing.twoHours ?? 0));
      setWholeDay(String(pricing.wholeDay ?? 0));
    })();
  }, []);

  const handleSave = async () => {
    const payload = {
      oneHour: Number(oneHour) || 0,
      twoHours: Number(twoHours) || 0,
      wholeDay: Number(wholeDay) || 0,
    };
    await setWalkInPricing(payload);
    toast({ title: 'Saved', description: 'Walk-In pricing has been updated.' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure application preferences</p>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Walk-In Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="oneHour">1 Hour (₱)</Label>
              <Input id="oneHour" type="number" min="0" value={oneHour} onChange={(e) => setOneHour(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twoHours">2 Hours (₱)</Label>
              <Input id="twoHours" type="number" min="0" value={twoHours} onChange={(e) => setTwoHours(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wholeDay">Whole Day (₱)</Label>
              <Input id="wholeDay" type="number" min="0" value={wholeDay} onChange={(e) => setWholeDay(e.target.value)} />
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


