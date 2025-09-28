import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { generateMemberId, calculateExpiryDate } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { db, initLocalDb } from '@/lib/db';
import { generateQrCodeDataUrl } from '@/lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import jsPDF from 'jspdf';
import { isNative, saveDataUrlNative } from '@/lib/native';

const AddMember = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    membershipStartDate: new Date().toISOString().split('T')[0],
    membershipDurationMonths: 1,
    photoDataUrl: null as string | null,
  });
  
  const memberId = useMemo(() => generateMemberId(), []);
  const expiryDate = useMemo(() => (
    calculateExpiryDate(formData.membershipStartDate, formData.membershipDurationMonths)
  ), [formData.membershipStartDate, formData.membershipDurationMonths]);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const qr = await generateQrCodeDataUrl(memberId);
      if (!cancelled) {
        setQrCode(qr);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await initLocalDb();
    await db.members.add({
      id: memberId,
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      membershipStartDate: formData.membershipStartDate,
      membershipExpiryDate: expiryDate,
      membershipDurationMonths: formData.membershipDurationMonths,
      photoDataUrl: formData.photoDataUrl,
      qrCodeDataUrl: qrCode,
      status: 'active',
      isActive: true,
    } as any);

    toast({
      title: 'Member Added Successfully',
      description: `${formData.fullName} has been added with ID: ${memberId}`,
    });
    setShowSuccess(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, photoDataUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const downloadDataUrl = async (dataUrl: string, filename: string) => {
    if (isNative()) {
      await saveDataUrlNative(filename, dataUrl);
      return;
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const downloadCodesPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48;
    let y = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Member QR Code', margin, y);
    y += 24;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${formData.fullName}`, margin, y); y += 16;
    doc.text(`Member ID: ${memberId}`, margin, y); y += 16;
    doc.text(`Start: ${formData.membershipStartDate}`, margin, y); y += 16;
    doc.text(`Expiry: ${expiryDate}`, margin, y); y += 16;
    doc.text(`Duration: ${formData.membershipDurationMonths} ${formData.membershipDurationMonths === 1 ? 'Month' : 'Months'}`, margin, y); y += 24;
    if (formData.photoDataUrl) {
      try { doc.addImage(formData.photoDataUrl, 'PNG', margin, y, 96, 96); } catch {}
    }
    const codesX = margin + 120;
    if (qrCode) {
      try { doc.addImage(qrCode, 'PNG', codesX, y, 144, 144); } catch {}
    }
    doc.save(`${memberId}-qr.pdf`);
  };

  // Render a membership ID card to a canvas and return it
  const renderIdCardCanvas = (): HTMLCanvasElement => {
    // Portrait ID card layout
    const width = 800; // px
    const height = 1200; // px
    const card = document.createElement('canvas');
    card.width = width;
    card.height = height;
    const ctx = card.getContext('2d')!;

    // Brand colors (from system theme)
    const brandPrimary = '#e11d2e'; // approximate hsl(0 80% 56%)
    const bgDark = '#0a0a0a';
    const surface = '#121212';
    const text = '#f6f6f6';
    const textMuted = '#cfcfcf';

    // Background
    ctx.fillStyle = bgDark;
    ctx.fillRect(0, 0, width, height);

    // White card with rounded corners
    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };
    ctx.fillStyle = surface;
    drawRoundedRect(40, 40, width - 80, height - 80, 28);
    ctx.fill();

    // Top brand header curve
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(40, 180);
    ctx.quadraticCurveTo(width / 2, 40, width - 40, 180);
    ctx.lineTo(width - 40, 40);
    ctx.lineTo(40, 40);
    ctx.closePath();
    ctx.fillStyle = brandPrimary;
    ctx.fill();
    ctx.restore();

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Helvetica';
    ctx.textAlign = 'center';
    ctx.fillText('POWERLIFT FITNESS GYM MEMBERSHIP ID', width / 2, 95);
    ctx.textAlign = 'start';

    // Photo rounded rectangle
    const photoW = 180;
    const photoH = 180;
    const photoX = width / 2 - photoW / 2;
    const photoY = 200;
    ctx.save();
    drawRoundedRect(photoX, photoY, photoW, photoH, 24);
    ctx.clip();
    if (formData.photoDataUrl) {
      const img = new Image();
      img.src = formData.photoDataUrl;
      img.onload = () => { try { ctx.drawImage(img, photoX, photoY, photoW, photoH); } catch {} };
      try { ctx.drawImage(img, photoX, photoY, photoW, photoH); } catch {}
    } else {
      ctx.fillStyle = '#222';
      ctx.fillRect(photoX, photoY, photoW, photoH);
    }
    ctx.restore();

    // Member name and info
    ctx.fillStyle = text;
    ctx.font = 'bold 40px Helvetica';
    ctx.textAlign = 'center';
    ctx.fillText((formData.fullName || 'New Member').toUpperCase(), width / 2, photoY + photoH + 60);
    ctx.fillStyle = textMuted;
    ctx.font = 'normal 22px Helvetica';
    ctx.fillText(`Member ID: ${memberId}`, width / 2, photoY + photoH + 92);
    ctx.fillText(`Start: ${formData.membershipStartDate}  •  Expiry: ${expiryDate}`, width / 2, photoY + photoH + 120);
    ctx.fillText(`Duration: ${formData.membershipDurationMonths} ${formData.membershipDurationMonths === 1 ? 'Month' : 'Months'}`, width / 2, photoY + photoH + 148);
    ctx.textAlign = 'start';

    // QR centered
    if (qrCode) {
      const qr = new Image();
      qr.src = qrCode;
      const size = 420;
      const qrX = width / 2 - size / 2;
      const qrY = photoY + photoH + 190;
      try { ctx.drawImage(qr, qrX, qrY, size, size); } catch {}
      qr.onload = () => { try { ctx.drawImage(qr, qrX, qrY, size, size); } catch {} };
    }

    // (Barcode removed)

    // Footer note
    ctx.fillStyle = textMuted;
    ctx.font = 'italic 18px Helvetica';
    ctx.textAlign = 'center';
    ctx.fillText('Scan the QR to verify membership.', width / 2, height - 60);
    ctx.textAlign = 'start';

    return card;
  };

  const downloadIdCardPng = async () => {
    const canvas = renderIdCardCanvas();
    const dataUrl = canvas.toDataURL('image/png');
    await downloadDataUrl(dataUrl, `${memberId}-id-card.png`);
  };

  const downloadIdCardPdf = async () => {
    const canvas = renderIdCardCanvas();
    const img = canvas.toDataURL('image/png');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const targetWidth = pageWidth - 80;
    const targetHeight = (canvas.height / canvas.width) * targetWidth;
    const x = 40;
    const y = Math.max(40, (pageHeight - targetHeight) / 2);
    doc.addImage(img, 'PNG', x, y, targetWidth, targetHeight);
    if (isNative()) {
      const pdfArrayBuffer = doc.output('arraybuffer');
      const base64 = (await import('@/lib/native')).then(m => m.arrayBufferToBase64(pdfArrayBuffer));
      const dataUrl = `data:application/pdf;base64,${await base64}`;
      await downloadDataUrl(dataUrl, `${memberId}-id-card.pdf`);
    } else {
      doc.save(`${memberId}-id-card.pdf`);
    }
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

            {/* Start Date, Duration, Expiry */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="membershipStartDate">Start Date *</Label>
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
                <Label htmlFor="membershipDurationMonths">Membership Duration</Label>
                <select
                  id="membershipDurationMonths"
                  name="membershipDurationMonths"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.membershipDurationMonths}
                  onChange={(e) => setFormData(prev => ({ ...prev, membershipDurationMonths: Number(e.target.value) }))}
                >
                  <option value={1}>1 Month</option>
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={12}>12 Months</option>
                  <option value={24}>24 Months</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date (Auto-calculated)</Label>
                <Input
                  value={expiryDate}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-sm text-muted-foreground">Calculated from start date and duration</p>
              </div>
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label htmlFor="photo">Member Photo</Label>
              <input id="photo" name="photo" type="file" accept="image/*" onChange={handlePhotoChange} />
              {formData.photoDataUrl && (
                <img src={formData.photoDataUrl} alt="Preview" className="h-24 w-24 object-cover rounded-md border" />
              )}
            </div>

            {/* Summary */}
            <div className="bg-muted/30 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold">Membership Summary</h3>
              <div className="text-sm space-y-1">
                <p><strong>Member ID:</strong> {memberId}</p>
                <p><strong>Duration:</strong> {formData.membershipDurationMonths} {formData.membershipDurationMonths === 1 ? 'Month' : 'Months'}</p>
                <p><strong>Start Date:</strong> {formData.membershipStartDate}</p>
                <p><strong>Expiry Date:</strong> {expiryDate}</p>
                <p><strong>Status:</strong> <span className="text-success">Active</span></p>
                {qrCode && (
                  <div className="flex items-center gap-4 pt-2">
                    <div>
                      <p className="font-semibold">QR Code</p>
                      <img src={qrCode} alt="QR" className="h-24 w-24" />
                    </div>
                  </div>
                )}
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

      {/* Success Modal */}
      <Dialog open={showSuccess} onOpenChange={(open) => {
        if (!open) {
          setShowSuccess(false);
          navigate('/members');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Member Created</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{formData.fullName} has been added successfully.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div className="space-y-1">
                <p><strong>Member ID:</strong> {memberId}</p>
                <p><strong>Start:</strong> {formData.membershipStartDate}</p>
                <p><strong>Expiry:</strong> {expiryDate}</p>
                <p><strong>Duration:</strong> {formData.membershipDurationMonths} {formData.membershipDurationMonths === 1 ? 'Month' : 'Months'}</p>
              </div>
              <div className="flex items-center gap-6">
                {qrCode && <img src={qrCode} className="h-28 w-28" alt="QR" />}
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={downloadIdCardPng}>Download ID Card (PNG)</Button>
            <Button type="button" onClick={downloadIdCardPdf}>Download ID Card (PDF)</Button>
            <Button type="button" variant="secondary" onClick={() => { setShowSuccess(false); navigate('/members'); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddMember;