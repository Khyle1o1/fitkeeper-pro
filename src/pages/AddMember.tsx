import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { generateMemberId, calculateExpiryDate } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const AddMember = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    membershipStartDate: new Date().toISOString().split('T')[0],
  });
  
  const memberId = generateMemberId();
  const expiryDate = calculateExpiryDate(formData.membershipStartDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('members').insert({
      id: memberId,
      full_name: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      membership_start_date: formData.membershipStartDate,
      membership_expiry_date: expiryDate,
      status: 'active',
      is_active: true,
    });

    if (error) {
      toast({ title: 'Failed to add member', description: error.message, variant: 'destructive' });
      return;
    }

    toast({
      title: 'Member Added Successfully',
      description: `${formData.fullName} has been added with ID: ${memberId}`,
    });

    navigate('/members');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/members')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Members
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Member</h1>
          <p className="text-muted-foreground">Create a new gym membership</p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-0 shadow-md w-full">
        <CardHeader>
          <CardTitle>Member Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Auto-generated Member ID */}
            <div className="space-y-2">
              <Label>Member ID (Auto-generated)</Label>
              <Input
                value={memberId}
                disabled
                className="bg-muted/50"
              />
              <p className="text-sm text-muted-foreground">This ID will be automatically assigned to the member</p>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter member's full name"
                required
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="member@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1234567890"
                  required
                />
              </div>
            </div>

            {/* Membership Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="membershipStartDate">Membership Start Date *</Label>
                <Input
                  id="membershipStartDate"
                  name="membershipStartDate"
                  type="date"
                  value={formData.membershipStartDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Membership Expiry Date (Auto-calculated)</Label>
                <Input
                  value={expiryDate}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-sm text-muted-foreground">Automatically set to 1 month from start date</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/30 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold">Membership Summary</h3>
              <div className="text-sm space-y-1">
                <p><strong>Member ID:</strong> {memberId}</p>
                <p><strong>Duration:</strong> 1 Month</p>
                <p><strong>Start Date:</strong> {formData.membershipStartDate}</p>
                <p><strong>Expiry Date:</strong> {expiryDate}</p>
                <p><strong>Status:</strong> <span className="text-success">Active</span></p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/members')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-primary hover:opacity-90"
              >
                Add Member
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddMember;