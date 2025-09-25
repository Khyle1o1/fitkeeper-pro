import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { type Member } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { db, initLocalDb } from '@/lib/db';

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
    </div>
  );
};

export default EditMember;