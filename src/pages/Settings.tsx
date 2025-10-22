import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { initLocalDb, getAppPricing, setAppPricing, getAllPromos, createPromo, updatePromo, deletePromo } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { PromoRate } from '@/data/mockData';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, Plus, Shield, RotateCcw } from 'lucide-react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { resetActivation, isAppActivated } from '@/lib/activation';

const Settings = () => {
  const { toast } = useToast();
  const [membershipFee, setMembershipFee] = useState<string>('200');
  const [monthlySubscriptionFee, setMonthlySubscriptionFee] = useState<string>('500');
  const [studentMonthlySubscriptionFee, setStudentMonthlySubscriptionFee] = useState<string>('350');
  const [perSessionMemberFee, setPerSessionMemberFee] = useState<string>('80');
  const [perSessionWalkInFee, setPerSessionWalkInFee] = useState<string>('100');
  
  // Promo states
  const [promos, setPromos] = useState<PromoRate[]>([]);
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoRate | null>(null);
  const [promoFormData, setPromoFormData] = useState({
    name: '',
    minMonths: '1',
    freeMonths: '1',
    isActive: false,
  });
  const [deletePromoId, setDeletePromoId] = useState<string | null>(null);
  
  // Activation reset states
  const [showResetActivation, setShowResetActivation] = useState(false);
  const [activationStatus, setActivationStatus] = useState<boolean>(false);

  const loadPromos = async () => {
    const allPromos = await getAllPromos();
    setPromos(allPromos);
  };

  useEffect(() => {
    (async () => {
      await initLocalDb();
      const appPricing = await getAppPricing();
      setMembershipFee(String(appPricing.membershipFee ?? 200));
      setMonthlySubscriptionFee(String(appPricing.monthlySubscriptionFee ?? 500));
      setStudentMonthlySubscriptionFee(String(appPricing.studentMonthlySubscriptionFee ?? 350));
      setPerSessionMemberFee(String(appPricing.perSessionMemberFee ?? 80));
      setPerSessionWalkInFee(String(appPricing.perSessionWalkInFee ?? 100));
      await loadPromos();
      
      // Check activation status
      const isActivated = await isAppActivated();
      setActivationStatus(isActivated);
    })();
  }, []);

  const handleSave = async () => {
    await setAppPricing({ 
      membershipFee: Number(membershipFee) || 200,
      monthlySubscriptionFee: Number(monthlySubscriptionFee) || 500,
      studentMonthlySubscriptionFee: Number(studentMonthlySubscriptionFee) || 350,
      perSessionMemberFee: Number(perSessionMemberFee) || 80,
      perSessionWalkInFee: Number(perSessionWalkInFee) || 100,
    });
    toast({ title: 'Saved', description: 'Pricing has been updated.' });
  };

  const handleOpenPromoDialog = (promo?: PromoRate) => {
    if (promo) {
      setEditingPromo(promo);
      setPromoFormData({
        name: promo.name,
        minMonths: String(promo.minMonths),
        freeMonths: String(promo.freeMonths),
        isActive: promo.isActive,
      });
    } else {
      setEditingPromo(null);
      setPromoFormData({
        name: '',
        minMonths: '1',
        freeMonths: '1',
        isActive: false,
      });
    }
    setPromoDialogOpen(true);
  };

  const handleSavePromo = async () => {
    const minMonths = Number(promoFormData.minMonths);
    const freeMonths = Number(promoFormData.freeMonths);

    if (!promoFormData.name.trim()) {
      toast({ title: 'Error', description: 'Promo name is required.', variant: 'destructive' });
      return;
    }

    if (minMonths < 1 || freeMonths < 1) {
      toast({ title: 'Error', description: 'Minimum months and free months must be at least 1.', variant: 'destructive' });
      return;
    }

    try {
      if (editingPromo) {
        await updatePromo(editingPromo.id, {
          name: promoFormData.name,
          minMonths,
          freeMonths,
          isActive: promoFormData.isActive,
        });
        toast({ title: 'Success', description: 'Promo updated successfully.' });
      } else {
        await createPromo({
          name: promoFormData.name,
          minMonths,
          freeMonths,
          isActive: promoFormData.isActive,
        });
        toast({ title: 'Success', description: 'Promo created successfully.' });
      }
      await loadPromos();
      setPromoDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save promo.', variant: 'destructive' });
    }
  };

  const handleTogglePromoActive = async (promo: PromoRate) => {
    try {
      await updatePromo(promo.id, { isActive: !promo.isActive });
      await loadPromos();
      toast({ 
        title: 'Success', 
        description: `Promo ${!promo.isActive ? 'activated' : 'deactivated'} successfully.` 
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update promo status.', variant: 'destructive' });
    }
  };

  const handleDeletePromo = async (id: string) => {
    try {
      await deletePromo(id);
      await loadPromos();
      toast({ title: 'Success', description: 'Promo deleted successfully.' });
      setDeletePromoId(null);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete promo.', variant: 'destructive' });
    }
  };

  const handleResetActivation = async () => {
    try {
      await resetActivation();
      setActivationStatus(false);
      setShowResetActivation(false);
      toast({ 
        title: 'Activation Reset', 
        description: 'App activation has been reset. The app will require activation on next launch.',
        variant: 'destructive'
      });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to reset activation.', 
        variant: 'destructive' 
      });
    }
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
              <Label htmlFor="studentMonthlySubscriptionFee">Student Monthly Subscription Fee (₱)</Label>
              <Input id="studentMonthlySubscriptionFee" type="number" min="0" value={studentMonthlySubscriptionFee} onChange={(e) => setStudentMonthlySubscriptionFee(e.target.value)} />
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

      {/* App Activation Section */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            App Activation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border-2 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${activationStatus ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <p className="font-medium">
                  {activationStatus ? 'App is Activated' : 'App is Not Activated'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activationStatus 
                    ? 'This device has been activated and can use the app offline.' 
                    : 'This device requires activation to use the app.'
                  }
                </p>
              </div>
            </div>
            {activationStatus && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowResetActivation(true)}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Activation
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            <p><strong>Note:</strong> Resetting activation will require entering the activation code again on next app launch.</p>
          </div>
        </CardContent>
      </Card>

      {/* Promo Rate Section */}
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Promo Rate</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Create promotional offers for monthly subscriptions (e.g., "Avail 3 Months, Get 1 Month Free")
            </p>
          </div>
          <Button onClick={() => handleOpenPromoDialog()} className="bg-gradient-primary hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            Add Promo
          </Button>
        </CardHeader>
        <CardContent>
          {promos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No promos created yet. Click "Add Promo" to create your first promotional offer.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {promos.map((promo) => (
                <div key={promo.id} className={`flex items-center justify-between p-5 rounded-lg border-2 transition-all ${promo.isActive ? 'border-green-500 bg-green-50 dark:bg-green-950/40' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">{promo.name}</h4>
                      {promo.isActive && (
                        <span className="text-xs font-semibold bg-green-500 text-white px-2.5 py-1 rounded-full">Active</span>
                      )}
                    </div>
                    <p className="text-base font-medium text-gray-700 dark:text-gray-200">
                      Avail <strong className="text-gray-900 dark:text-white">{promo.minMonths}</strong> {promo.minMonths > 1 ? 'Months' : 'Month'}, Get <strong className="text-green-600 dark:text-green-400">{promo.freeMonths}</strong> {promo.freeMonths > 1 ? 'Months' : 'Month'} Free
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`promo-${promo.id}`} className="text-sm font-medium">
                        {promo.isActive ? 'Active' : 'Inactive'}
                      </Label>
                      <Switch
                        id={`promo-${promo.id}`}
                        checked={promo.isActive}
                        onCheckedChange={() => handleTogglePromoActive(promo)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPromoDialog(promo)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeletePromoId(promo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promo Dialog */}
      <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPromo ? 'Edit Promo' : 'Add New Promo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="promoName">Promo Name *</Label>
              <Input
                id="promoName"
                placeholder="e.g., 3 + 1 Promo"
                value={promoFormData.name}
                onChange={(e) => setPromoFormData({ ...promoFormData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minMonths">Minimum Months Required *</Label>
                <Input
                  id="minMonths"
                  type="number"
                  min="1"
                  value={promoFormData.minMonths}
                  onChange={(e) => setPromoFormData({ ...promoFormData, minMonths: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="freeMonths">Free Months Given *</Label>
                <Input
                  id="freeMonths"
                  type="number"
                  min="1"
                  value={promoFormData.freeMonths}
                  onChange={(e) => setPromoFormData({ ...promoFormData, freeMonths: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="promoActive"
                checked={promoFormData.isActive}
                onCheckedChange={(checked) => setPromoFormData({ ...promoFormData, isActive: checked })}
              />
              <Label htmlFor="promoActive">Set as Active</Label>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Preview:</strong> Avail {promoFormData.minMonths} {Number(promoFormData.minMonths) > 1 ? 'Months' : 'Month'}, Get {promoFormData.freeMonths} {Number(promoFormData.freeMonths) > 1 ? 'Months' : 'Month'} Free
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoDialogOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-primary hover:opacity-90" onClick={handleSavePromo}>
              {editingPromo ? 'Update' : 'Create'} Promo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletePromoId !== null} onOpenChange={(open) => !open && setDeletePromoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this promo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletePromoId && handleDeletePromo(deletePromoId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Activation Confirmation Dialog */}
      <AlertDialog open={showResetActivation} onOpenChange={setShowResetActivation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Reset App Activation
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the app activation? This will require entering the activation code again on the next app launch. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetActivation}
              className="bg-red-600 hover:bg-red-700"
            >
              Reset Activation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;


