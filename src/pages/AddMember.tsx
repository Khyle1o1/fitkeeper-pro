import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Camera, Upload } from 'lucide-react';
import { generateMemberId } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { db, initLocalDb, getAppPricing, addPayment, checkAndApplyPromo } from '@/lib/db';
import { generateQrCodeDataUrl } from '@/lib/utils';
import { PromoRate } from '@/data/mockData';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';
import { isNative, saveDataUrlNative } from '@/lib/native';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

const AddMember = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    membershipStartDate: new Date().toISOString().split('T')[0],
    membershipDuration: 'Lifetime' as 'Lifetime' | '1 Year' | '2 Years' | '3 Years' | '4 Years' | '5 Years',
    photoDataUrl: null as string | null,
    referralCode: '', // Optional referral code
  });
  const [paymentType, setPaymentType] = useState<'monthly' | 'per_session'>('monthly');
  const [subscriptionMonths, setSubscriptionMonths] = useState<number>(1);
  const [appPricing, setAppPricingState] = useState<{ membershipFee: number; monthlySubscriptionFee?: number; perSessionMemberFee?: number }>({ membershipFee: 200, monthlySubscriptionFee: 500, perSessionMemberFee: 80 });
  
  // Promo state
  const [appliedPromo, setAppliedPromo] = useState<PromoRate | null>(null);
  const [totalMonthsWithPromo, setTotalMonthsWithPromo] = useState<number>(1);
  const [freeMonths, setFreeMonths] = useState<number>(0);
  
  const memberId = useMemo(() => generateMemberId(), []);
  const LIFETIME_EXPIRY = '2099-12-31';
  
  // Calculate membership expiry based on duration (NOT subscription)
  const calculateMembershipExpiry = (duration: typeof formData.membershipDuration, startDate: string): string => {
    if (duration === 'Lifetime') return LIFETIME_EXPIRY;
    const years = parseInt(duration.split(' ')[0]);
    const date = new Date(startDate);
    date.setFullYear(date.getFullYear() + years);
    return date.toISOString().split('T')[0];
  };
  
  const membershipExpiryDate = useMemo(() => 
    calculateMembershipExpiry(formData.membershipDuration, formData.membershipStartDate),
    [formData.membershipDuration, formData.membershipStartDate]
  );

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [totalDue, setTotalDue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'GCash' | 'Card'>('Cash');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Local helper: add months to a YYYY-MM-DD start date (handles end-of-month)
  const addMonths = (startIso: string, months: number): string => {
    const date = new Date(startIso);
    const startDay = date.getDate();
    date.setMonth(date.getMonth() + months);
    if (date.getDate() !== startDay) {
      date.setDate(0);
    }
    return date.toISOString().split('T')[0];
  };

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

  useEffect(() => {
    (async () => {
      await initLocalDb();
      const pricing = await getAppPricing();
      setAppPricingState(pricing as any);
    })();
  }, []);

  // Check and apply promo whenever subscription months change
  useEffect(() => {
    (async () => {
      if (paymentType === 'monthly' && subscriptionMonths > 0) {
        const promoResult = await checkAndApplyPromo(subscriptionMonths);
        setAppliedPromo(promoResult.appliedPromo);
        setTotalMonthsWithPromo(promoResult.totalMonths);
        setFreeMonths(promoResult.freeMonths);
      } else {
        setAppliedPromo(null);
        setTotalMonthsWithPromo(subscriptionMonths);
        setFreeMonths(0);
      }
    })();
  }, [subscriptionMonths, paymentType]);

  useEffect(() => {
    const lifetime = Number(appPricing.membershipFee) || 200;
    const monthly = Number(appPricing.monthlySubscriptionFee) || 500;
    const firstCharge = paymentType === 'monthly' ? (monthly * (subscriptionMonths || 1)) : 0;
    setTotalDue(lifetime + firstCharge);
  }, [appPricing, paymentType, subscriptionMonths]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    await initLocalDb();
    // Use totalMonthsWithPromo for expiry calculation (includes free months from promo)
    const subscriptionExpiryDate = paymentType === 'monthly'
      ? addMonths(formData.membershipStartDate, totalMonthsWithPromo || 1)
      : '';

    // Validate and process referral code
    let referrer = null;
    if (formData.referralCode && formData.referralCode.trim()) {
      // Check if referral code exists
      referrer = await db.members.where('invite_code').equals(formData.referralCode.trim()).first();
      if (!referrer) {
        toast({
          title: 'Invalid Referral Code',
          description: 'The referral code you entered does not exist.',
          variant: 'destructive',
        });
        return;
      }
    }

    await db.members.add({
      id: memberId,
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      membershipStartDate: formData.membershipStartDate,
      membershipExpiryDate: membershipExpiryDate,
      membershipDuration: formData.membershipDuration,
      membershipDurationMonths: undefined, // Legacy field
      photoDataUrl: formData.photoDataUrl,
      qrCodeDataUrl: qrCode,
      status: 'active',
      isActive: true,
      membershipFeePaid: true,
      paymentType,
      subscriptionExpiryDate,
      sessionCount: 0,
      lastSessionDate: undefined,
      invite_code: memberId, // Auto-generate invite code from member ID
      referred_by: referrer ? formData.referralCode.trim() : null,
      invite_count: 0,
      // Promo fields
      appliedPromoId: appliedPromo?.id || null,
      paidMonths: paymentType === 'monthly' ? subscriptionMonths : undefined,
      freeMonths: paymentType === 'monthly' ? freeMonths : undefined,
    } as any);

    // If referred by someone, increment their invite count
    if (referrer) {
      const currentInviteCount = referrer.invite_count || 0;
      const newInviteCount = currentInviteCount + 1;
      
      // Update referrer's invite count
      await db.members.update(referrer.id, { 
        invite_count: newInviteCount 
      } as any);

      // Check if referrer reached 4 invites
      if (newInviteCount === 4) {
        // Extend membership by 1 month
        const currentExpiry = new Date(referrer.subscriptionExpiryDate || referrer.membershipExpiryDate);
        const newExpiry = new Date(currentExpiry);
        newExpiry.setMonth(newExpiry.getMonth() + 1);
        const newExpiryIso = newExpiry.toISOString().split('T')[0];

        // Update the appropriate expiry date based on payment type
        if (referrer.paymentType === 'monthly' && referrer.subscriptionExpiryDate) {
          await db.members.update(referrer.id, {
            subscriptionExpiryDate: newExpiryIso,
            invite_count: 0, // Reset count
          } as any);
        } else {
          await db.members.update(referrer.id, {
            membershipExpiryDate: newExpiryIso,
            invite_count: 0, // Reset count
          } as any);
        }

        toast({
          title: '🎉 Referral Reward Earned!',
          description: `${referrer.fullName} has earned 1 free month for inviting 4 members!`,
        });
      } else {
        toast({
          title: 'Referral Recorded',
          description: `${referrer.fullName} now has ${newInviteCount}/4 successful referrals.`,
        });
      }
    }

    // Record membership fee and initial selection (month or session)
    const pricing = await getAppPricing();
    const dateStr = new Date().toISOString().split('T')[0];
    await addPayment({
      date: dateStr,
      amount: Number(pricing.membershipFee) || 200,
      method: paymentMethod,
      category: 'Membership Fee',
      description: `Lifetime membership fee for ${formData.fullName} (${memberId})`,
      memberId,
    });
    if (paymentType === 'monthly') {
      const promoNote = appliedPromo && freeMonths > 0 
        ? ` [Promo: ${appliedPromo.name} - ${freeMonths} free month(s), total ${totalMonthsWithPromo} months]`
        : '';
      await addPayment({
        date: dateStr,
        amount: (Number(pricing.monthlySubscriptionFee) || 500) * (subscriptionMonths || 1),
        method: paymentMethod,
        category: 'Monthly Subscription',
        description: `Prepaid ${subscriptionMonths || 1} month(s) subscription for ${formData.fullName} (${memberId})${promoNote}`,
        memberId,
      });
    }

    const promoMessage = appliedPromo && freeMonths > 0
      ? ` 🎉 ${appliedPromo.name} applied: +${freeMonths} free month(s)!`
      : '';
    toast({
      title: 'Member Added Successfully',
      description: `Total paid: ₱${totalDue} (${paymentType === 'monthly' ? `lifetime + ${subscriptionMonths || 1} month(s)` : 'lifetime; per session will be paid at attendance'})${promoMessage}`,
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

  const handleTakePicture = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (image.dataUrl) {
        setFormData(prev => ({ ...prev, photoDataUrl: image.dataUrl as string }));
        toast({
          title: 'Photo Captured',
          description: 'Member photo has been captured successfully.',
        });
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      toast({
        title: 'Error',
        description: 'Failed to capture photo. Please try again.',
        variant: 'destructive',
      });
    }
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
    doc.text(`Membership: ${formData.membershipDuration}`, margin, y); y += 16;
    doc.text(`Expiry: ${formData.membershipDuration === 'Lifetime' ? 'Lifetime' : membershipExpiryDate}`, margin, y); y += 16;
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
    ctx.fillText(`Membership: ${formData.membershipDuration}`, width / 2, photoY + photoH + 120);
    ctx.fillText(`Valid: ${formData.membershipStartDate} to ${formData.membershipDuration === 'Lifetime' ? 'Lifetime' : membershipExpiryDate}`, width / 2, photoY + photoH + 148);
    ctx.textAlign = 'start';

    // QR centered
    if (qrCode) {
      const qr = new Image();
      qr.src = qrCode;
      const size = 420;
      const qrX = width / 2 - size / 2;
      const qrY = photoY + photoH + 210; // Adjusted for extra line
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
      const { arrayBufferToBase64 } = await import('@/lib/native');
      const base64 = arrayBufferToBase64(pdfArrayBuffer);
      const dataUrl = `data:application/pdf;base64,${base64}`;
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

            {/* Invite/Referral Code */}
            <div className="space-y-2">
              <Label htmlFor="referralCode">Invite Code (Optional)</Label>
              <Input
                id="referralCode"
                name="referralCode"
                value={formData.referralCode}
                onChange={handleInputChange}
                placeholder="Enter invite code from another member"
              />
              <p className="text-sm text-muted-foreground">
                If this member was invited by another member, enter their invite code here. 
                Members who invite 4 people earn 1 free month!
              </p>
            </div>

            {/* Start Date and Membership Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <Label htmlFor="membershipDuration">Membership Duration *</Label>
                <Select 
                  value={formData.membershipDuration} 
                  onValueChange={(v: any) => setFormData(prev => ({ ...prev, membershipDuration: v }))}
                >
                  <SelectTrigger id="membershipDuration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lifetime">Lifetime</SelectItem>
                    <SelectItem value="1 Year">1 Year</SelectItem>
                    <SelectItem value="2 Years">2 Years</SelectItem>
                    <SelectItem value="3 Years">3 Years</SelectItem>
                    <SelectItem value="4 Years">4 Years</SelectItem>
                    <SelectItem value="5 Years">5 Years</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">How long is this membership valid?</p>
              </div>
              <div className="space-y-2">
                <Label>Membership Expiry</Label>
                <Input 
                  value={formData.membershipDuration === 'Lifetime' ? 'Lifetime' : membershipExpiryDate} 
                  disabled 
                  className="bg-muted/50" 
                />
                <p className="text-xs text-muted-foreground">Membership access validity</p>
              </div>
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label htmlFor="photo">Member Photo</Label>
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTakePicture}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Take Picture
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('photo')?.click()}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
                <input
                  id="photo"
                  name="photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                {formData.photoDataUrl && (
                  <div className="flex items-center gap-3">
                    <img src={formData.photoDataUrl} alt="Preview" className="h-24 w-24 object-cover rounded-md border" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, photoDataUrl: null }))}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/30 p-4 rounded-lg space-y-3">
              <h3 className="font-bold text-xl text-white">Registration Summary</h3>
              
              {/* Membership Information */}
              <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-md border-2 border-blue-300 dark:border-blue-700">
                <h4 className="font-bold text-base text-blue-700 dark:text-blue-300 mb-3">🧍 Membership (One-Time Fee)</h4>
                <div className="text-sm space-y-2 text-gray-800 dark:text-gray-200">
                  <p className="flex justify-between"><strong className="text-gray-900 dark:text-gray-100">Member ID:</strong> <span className="font-medium">{memberId}</span></p>
                  <p className="flex justify-between"><strong className="text-gray-900 dark:text-gray-100">Membership Duration:</strong> <span className="font-medium">{formData.membershipDuration}</span></p>
                  <p className="flex justify-between"><strong className="text-gray-900 dark:text-gray-100">Valid Until:</strong> <span className="font-medium">{formData.membershipDuration === 'Lifetime' ? 'Lifetime' : membershipExpiryDate}</span></p>
                  <p className="flex justify-between"><strong className="text-gray-900 dark:text-gray-100">Membership Fee:</strong> <span className="font-bold text-blue-700 dark:text-blue-300">₱{Number(appPricing.membershipFee) || 200}</span></p>
                </div>
              </div>

              {/* Subscription/Payment Type */}
              <div className="bg-green-50 dark:bg-green-950/40 p-4 rounded-md border-2 border-green-300 dark:border-green-700">
                <h4 className="font-bold text-base text-green-700 dark:text-green-300 mb-3">💳 Gym Access Type</h4>
                <div className="space-y-3">
                  <div className="flex gap-4 text-sm font-medium text-gray-800 dark:text-gray-200">
                    <label className="inline-flex items-center gap-2 cursor-pointer hover:text-green-700 dark:hover:text-green-300 transition-colors">
                      <input type="radio" name="paymentType" checked={paymentType === 'monthly'} onChange={() => setPaymentType('monthly')} className="w-4 h-4" />
                      📅 Monthly Subscription
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer hover:text-green-700 dark:hover:text-green-300 transition-colors">
                      <input type="radio" name="paymentType" checked={paymentType === 'per_session'} onChange={() => setPaymentType('per_session')} className="w-4 h-4" />
                      ⏱️ Per Session
                    </label>
                  </div>
                  {paymentType === 'monthly' && (
                    <div className="pt-2">
                      <Label htmlFor="months" className="text-gray-900 dark:text-gray-100 font-semibold">Prepay Months (Optional)</Label>
                      <select
                        id="months"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium mt-1"
                        value={subscriptionMonths}
                        onChange={(e) => setSubscriptionMonths(Number(e.target.value))}
                      >
                        <option value={1}>1 Month</option>
                        <option value={2}>2 Months</option>
                        <option value={3}>3 Months</option>
                        <option value={4}>4 Months</option>
                        <option value={5}>5 Months</option>
                        <option value={6}>6 Months</option>
                        <option value={7}>7 Months</option>
                        <option value={8}>8 Months</option>
                        <option value={9}>9 Months</option>
                        <option value={10}>10 Months</option>
                        <option value={11}>11 Months</option>
                        <option value={12}>12 Months</option>
                      </select>
                      {appliedPromo && freeMonths > 0 ? (
                        <div className="mt-2 p-3 bg-green-100 dark:bg-green-950/50 border-2 border-green-400 dark:border-green-600 rounded-md">
                          <p className="text-sm font-bold text-green-800 dark:text-green-200">
                            🎉 Promo Applied: {appliedPromo.name}
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1 font-medium">
                            You're paying for {subscriptionMonths} {subscriptionMonths > 1 ? 'months' : 'month'} and getting {freeMonths} {freeMonths > 1 ? 'months' : 'month'} free!
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1 font-medium">
                            Total subscription: <strong className="text-green-900 dark:text-green-100">{totalMonthsWithPromo} months</strong>
                          </p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 mt-2 font-medium">
                            Subscription expires: <strong>{addMonths(formData.membershipStartDate, totalMonthsWithPromo || 1)}</strong>
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 font-medium">
                          Subscription expires: <strong>{addMonths(formData.membershipStartDate, subscriptionMonths || 1)}</strong>
                        </p>
                      )}
                    </div>
                  )}
                  {paymentType === 'per_session' && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Member will pay <strong className="text-green-700 dark:text-green-300">₱{Number(appPricing.perSessionMemberFee) || 80}</strong> per visit</p>
                  )}
                </div>
              </div>

              {/* Total Charges */}
              <div className="bg-orange-50 dark:bg-orange-950/40 p-4 rounded-md border-2 border-orange-300 dark:border-orange-700">
                <h4 className="font-bold text-base text-orange-700 dark:text-orange-300 mb-3">💰 Total Due Today</h4>
                <div className="text-sm space-y-2 text-gray-800 dark:text-gray-200">
                  <div className="flex justify-between font-medium">
                    <span>Membership Fee:</span>
                    <span className="font-semibold">₱{Number(appPricing.membershipFee) || 200}</span>
                  </div>
                  {paymentType === 'monthly' && (
                    <div className="flex justify-between font-medium">
                      <span>Subscription ({subscriptionMonths} month{subscriptionMonths > 1 ? 's' : ''}):</span>
                      <span className="font-semibold">₱{(Number(appPricing.monthlySubscriptionFee) || 500) * (subscriptionMonths || 1)}</span>
                    </div>
                  )}
                  {paymentType === 'per_session' && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400 font-medium">
                      <span>Per-session fees:</span>
                      <span>Charged at check-in</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t-2 border-orange-300 dark:border-orange-700 pt-2 mt-2 text-orange-700 dark:text-orange-300">
                    <span>Total:</span>
                    <span>₱{totalDue}</span>
                  </div>
                </div>
              </div>

              {qrCode && (
                <div className="flex items-center gap-4 pt-2">
                  <div>
                    <p className="font-semibold text-sm">QR Code Preview</p>
                    <img src={qrCode} alt="QR" className="h-24 w-24 mt-1" />
                  </div>
                </div>
              )}
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
              type="button"
                className="flex-1 bg-gradient-primary hover:opacity-90"
              onClick={() => setConfirmOpen(true)}
              >
                Add Member
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Confirm Charges & Payment Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Registration & Charges</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Membership Duration</span><span className="font-medium">{formData.membershipDuration}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Membership Fee</span><span className="font-medium">₱{Number(appPricing.membershipFee) || 200}</span></div>
            {paymentType === 'monthly' && (
              <div className="flex justify-between"><span className="text-muted-foreground">Monthly Subscription</span><span className="font-medium">₱{(Number(appPricing.monthlySubscriptionFee) || 500) * (subscriptionMonths || 1)} ({subscriptionMonths} month{subscriptionMonths > 1 ? 's' : ''})</span></div>
            )}
            {paymentType === 'per_session' && (
              <div className="flex justify-between"><span className="text-muted-foreground">Access Type</span><span className="font-medium">Per Session (₱{Number(appPricing.perSessionMemberFee) || 80}/visit)</span></div>
            )}
            <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Total Due Today</span><span className="font-semibold">₱{totalDue}</span></div>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Back</Button>
            <Button className="bg-gradient-primary hover:opacity-90" onClick={async () => { setConfirmOpen(false); await handleSubmit(); }}>
              Confirm & Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <div className="space-y-1 text-sm">
                <p><strong>Member ID:</strong> {memberId}</p>
                <p><strong>Start:</strong> {formData.membershipStartDate}</p>
                <p><strong>Membership:</strong> {formData.membershipDuration}</p>
                <p><strong>Expiry:</strong> {formData.membershipDuration === 'Lifetime' ? 'Lifetime' : membershipExpiryDate}</p>
                <p><strong>Access Type:</strong> {paymentType === 'monthly' ? 'Monthly Subscription' : 'Per Session'}</p>
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