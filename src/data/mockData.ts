// Mock data for Gym Management System

export interface Member {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  membershipStartDate: string;
  membershipExpiryDate: string;
  membershipDurationMonths?: number;
  photoDataUrl?: string | null;
  qrCodeDataUrl?: string | null;
  barcodeDataUrl?: string | null;
  status: 'active' | 'expired' | 'soon-to-expire';
  isActive: boolean;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  checkInTime: string;
  checkOutTime?: string;
  date: string;
}

export interface RenewalRecord {
  id: string;
  memberId: string;
  memberName: string;
  oldExpiryDate: string;
  newExpiryDate: string;
  renewalDate: string;
  fee: number;
}

// Generate member ID helper
export const generateMemberId = (): string => {
  return `GM${Date.now().toString().slice(-6)}`;
};

// Calculate expiry date based on duration in months (defaults to 1 month)
export const calculateExpiryDate = (startDate: string, months: number = 1): string => {
  const date = new Date(startDate);
  const startDay = date.getDate();
  date.setMonth(date.getMonth() + months);
  // Handle month overflow to keep end-of-month consistent
  if (date.getDate() !== startDay) {
    date.setDate(0);
  }
  return date.toISOString().split('T')[0];
};

// Determine membership status
export const getMembershipStatus = (expiryDate: string): Member['status'] => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 7) return 'soon-to-expire';
  return 'active';
};

// Mock Members Data
export const mockMembers: Member[] = [
  {
    id: 'GM001234',
    fullName: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1234567890',
    membershipStartDate: '2024-08-15',
    membershipExpiryDate: '2024-10-15',
    status: 'active',
    isActive: true,
  },
  {
    id: 'GM001235',
    fullName: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+1234567891',
    membershipStartDate: '2024-07-10',
    membershipExpiryDate: '2024-09-10',
    status: 'expired',
    isActive: true,
  },
  {
    id: 'GM001236',
    fullName: 'Mike Davis',
    email: 'mike.davis@email.com',
    phone: '+1234567892',
    membershipStartDate: '2024-08-20',
    membershipExpiryDate: '2024-09-20',
    status: 'soon-to-expire',
    isActive: true,
  },
  {
    id: 'GM001237',
    fullName: 'Emily Brown',
    email: 'emily.brown@email.com',
    phone: '+1234567893',
    membershipStartDate: '2024-08-01',
    membershipExpiryDate: '2024-10-01',
    status: 'active',
    isActive: true,
  },
  {
    id: 'GM001238',
    fullName: 'Chris Wilson',
    email: 'chris.wilson@email.com',
    phone: '+1234567894',
    membershipStartDate: '2024-06-15',
    membershipExpiryDate: '2024-08-15',
    status: 'expired',
    isActive: false,
  },
];

// Mock Attendance Data
export const mockAttendanceRecords: AttendanceRecord[] = [
  {
    id: 'ATT001',
    memberId: 'GM001234',
    memberName: 'John Smith',
    checkInTime: '09:30 AM',
    date: '2024-09-16',
  },
  {
    id: 'ATT002',
    memberId: 'GM001237',
    memberName: 'Emily Brown',
    checkInTime: '10:15 AM',
    date: '2024-09-16',
  },
  {
    id: 'ATT003',
    memberId: 'GM001236',
    memberName: 'Mike Davis',
    checkInTime: '11:00 AM',
    date: '2024-09-16',
  },
  {
    id: 'ATT004',
    memberId: 'GM001234',
    memberName: 'John Smith',
    checkInTime: '08:45 AM',
    date: '2024-09-15',
  },
  {
    id: 'ATT005',
    memberId: 'GM001235',
    memberName: 'Sarah Johnson',
    checkInTime: '07:30 AM',
    date: '2024-09-15',
  },
];

// Mock Renewal Records
export const mockRenewalRecords: RenewalRecord[] = [
  {
    id: 'REN001',
    memberId: 'GM001234',
    memberName: 'John Smith',
    oldExpiryDate: '2024-09-15',
    newExpiryDate: '2024-10-15',
    renewalDate: '2024-09-10',
    fee: 50,
  },
  {
    id: 'REN002',
    memberId: 'GM001237',
    memberName: 'Emily Brown',
    oldExpiryDate: '2024-09-01',
    newExpiryDate: '2024-10-01',
    renewalDate: '2024-08-28',
    fee: 50,
  },
];

// Dashboard Statistics
export const getDashboardStats = () => {
  const activeMembers = mockMembers.filter(m => m.isActive && m.status === 'active').length;
  const todayAttendance = mockAttendanceRecords.filter(r => r.date === '2024-09-16').length;
  const expiringMembers = mockMembers.filter(m => m.status === 'soon-to-expire').length;
  
  return {
    totalActiveMembers: activeMembers,
    dailyAttendance: todayAttendance,
    expiringMemberships: expiringMembers,
  };
};