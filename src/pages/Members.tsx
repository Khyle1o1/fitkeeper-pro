import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Archive } from 'lucide-react';
import { Member } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { db, initLocalDb } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { generateBarcodeDataUrl, generateQrCodeDataUrl } from '@/lib/utils';

const Members = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [barcodePreview, setBarcodePreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      await initLocalDb();
      const all = await db.members.toArray();
      // Sort by full name
      all.sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));
      setMembers(all as any);
    };

    fetchMembers();
  }, [toast]);

  const filteredMembers = members.filter(member =>
    member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleArchiveMember = async (memberId: string) => {
    await db.members.update(memberId, { isActive: false } as any);
    setMembers(prev => prev.map(member => member.id === memberId ? { ...member, isActive: false } : member));
    toast({ title: 'Member Archived', description: 'Member has been successfully archived.' });
  };

  const getStatusBadge = (status: Member['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'soon-to-expire':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Expiring Soon</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
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

      {/* Members List */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>All Members ({filteredMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
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
                    {getStatusBadge(member.status)}
                    <div className="flex gap-2">
                      {member.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleArchiveMember(member.id); }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No members found matching your search.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
};

export default Members;