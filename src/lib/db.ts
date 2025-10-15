import Dexie, { type Table } from "dexie";
import {
  type Member,
  type AttendanceRecord,
  type RenewalRecord,
  type User,
  type WalkInPricingSettings,
  type AppPricingSettings,
  type PaymentRecord,
} from "@/data/mockData";

export class PowerLiftDatabase extends Dexie {
  members!: Table<Member, string>;
  attendance!: Table<AttendanceRecord, string>;
  renewals!: Table<RenewalRecord, string>;
  users!: Table<User, string>;
  settings!: Table<(WalkInPricingSettings & AppPricingSettings & { id: string }), string>;
  payments!: Table<PaymentRecord, string>;

  constructor() {
    super("powerlift-fitness-db");
    // v8: extend settings with pricing fields and member fields
    this.version(8).stores({
      members: "id, fullName, email, phone, status, isActive, membershipStartDate, membershipExpiryDate, membershipDurationMonths",
      attendance: "id, memberId, memberName, date, checkInTime, checkOutTime, is_walk_in, session_type, payment_method, price",
      renewals: "id, memberId, renewalDate",
      users: "id, username, email, role, isActive, createdAt",
      settings: "id",
      payments: "id, date, category, amount, memberId",
    });
  }
}

export const db = new PowerLiftDatabase();

export async function clearAllData(): Promise<void> {
  await db.transaction("rw", [db.members, db.attendance, db.renewals, db.users], async () => {
    await db.members.clear();
    await db.attendance.clear();
    await db.renewals.clear();
    await db.users.clear();
  });
  
  // Clear the seeded flags so it won't auto-seed again
  localStorage.removeItem("powerlift-db-seeded-v1");
  localStorage.removeItem("powerlift-admin-seeded-v1");
}

export async function resetDatabase(): Promise<void> {
  // Close and delete the database to force recreation with new schema
  await db.close();
  await db.delete();
  await db.open();
}

export async function seedDatabaseIfEmpty(): Promise<void> {
  const seededKey = "powerlift-db-seeded-v1";
  if (localStorage.getItem(seededKey)) return;

  const memberCount = await db.members.count();
  if (memberCount > 0) return;

  const toIso = (d: Date) => d.toISOString().split("T")[0];
  const today = new Date();

  // Helpers to create date offsets
  const daysFromToday = (delta: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + delta);
    return d;
  };

  // Seed 6 members: 2 active, 2 expired (<30d), 2 archived (>=30d)
  const seedMembers = [
    // Active: expires in 20 days
    {
      id: "GMTEST001",
      fullName: "Alice Active",
      email: "alice.active@example.com",
      phone: "+10000000001",
      membershipStartDate: toIso(daysFromToday(-10)),
      membershipExpiryDate: toIso(daysFromToday(20)),
      membershipDurationMonths: 1,
      status: "active" as const,
      isActive: true,
    },
    // Active: expires in 5 days (soon-to-expire but still active)
    {
      id: "GMTEST002",
      fullName: "Bob Nearly",
      email: "bob.nearly@example.com",
      phone: "+10000000002",
      membershipStartDate: toIso(daysFromToday(-25)),
      membershipExpiryDate: toIso(daysFromToday(5)),
      membershipDurationMonths: 1,
      status: "active" as const,
      isActive: true,
    },
    // Expired: expired 3 days ago
    {
      id: "GMTEST003",
      fullName: "Cathy Expired",
      email: "cathy.expired@example.com",
      phone: "+10000000003",
      membershipStartDate: toIso(daysFromToday(-40)),
      membershipExpiryDate: toIso(daysFromToday(-3)),
      membershipDurationMonths: 1,
      status: "expired" as const,
      isActive: true,
    },
    // Expired: expired 15 days ago
    {
      id: "GMTEST004",
      fullName: "Dan Overdue",
      email: "dan.overdue@example.com",
      phone: "+10000000004",
      membershipStartDate: toIso(daysFromToday(-50)),
      membershipExpiryDate: toIso(daysFromToday(-15)),
      membershipDurationMonths: 1,
      status: "expired" as const,
      isActive: true,
    },
    // Archived: expired 35 days ago
    {
      id: "GMTEST005",
      fullName: "Eve Archived",
      email: "eve.archived@example.com",
      phone: "+10000000005",
      membershipStartDate: toIso(daysFromToday(-80)),
      membershipExpiryDate: toIso(daysFromToday(-35)),
      membershipDurationMonths: 1,
      status: "archived" as const,
      isActive: false,
    },
    // Archived: expired 60 days ago
    {
      id: "GMTEST006",
      fullName: "Frank Longgone",
      email: "frank.longgone@example.com",
      phone: "+10000000006",
      membershipStartDate: toIso(daysFromToday(-120)),
      membershipExpiryDate: toIso(daysFromToday(-60)),
      membershipDurationMonths: 1,
      status: "archived" as const,
      isActive: false,
    },
  ];

  await db.members.bulkAdd(seedMembers as any);

  // Seed default walk-in pricing settings
  await db.settings.add({
    id: 'walkin_pricing',
    oneHour: 80,
    twoHours: 120,
    wholeDay: 200,
  });
  // Seed default app pricing
  await db.settings.put({
    id: 'app_pricing',
    membershipFee: 200,
    monthlySubscriptionFee: 500,
    perSessionMemberFee: 80,
    perSessionWalkInFee: 100,
  } as any);
  localStorage.setItem(seededKey, "true");
}

export async function seedDefaultAdminIfNeeded(): Promise<void> {
  const adminSeededKey = "powerlift-admin-seeded-v1";
  if (localStorage.getItem(adminSeededKey)) return;

  const userCount = await db.users.count();
  if (userCount > 0) return;

  // Create a default admin user
  const { hashPassword } = await import('./auth');
  const passwordHash = await hashPassword('Admin@123');
  
  const defaultAdmin = {
    id: 'USER000001',
    username: 'admin',
    email: 'admin@gym.com',
    passwordHash,
    role: 'admin' as const,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  await db.users.add(defaultAdmin);
  localStorage.setItem(adminSeededKey, "true");
}

export async function initLocalDb(): Promise<void> {
  await db.open();
  await seedDatabaseIfEmpty();
  await seedDefaultAdminIfNeeded();
}

// Simple query helpers for future use
export const getAllMembers = () => db.members.toArray();
export const getAttendanceByDate = (date: string) =>
  db.attendance.where("date").equals(date).toArray();
export const getRenewals = () => db.renewals.toArray();
export const getWalkInPricing = async (): Promise<WalkInPricingSettings> => {
  const rec = await db.settings.get('walkin_pricing');
  return rec ? { oneHour: rec.oneHour, twoHours: rec.twoHours, wholeDay: rec.wholeDay } : { oneHour: 0, twoHours: 0, wholeDay: 0 };
};
export const setWalkInPricing = async (pricing: WalkInPricingSettings): Promise<void> => {
  await db.settings.put({ id: 'walkin_pricing', ...pricing });
};

// App pricing helpers (membership fee + monthly + per-session fees)
export const getAppPricing = async (): Promise<AppPricingSettings> => {
  const rec = await db.settings.get('app_pricing');
  return rec ? {
    membershipFee: Number(rec.membershipFee) || 200,
    monthlySubscriptionFee: Number(rec.monthlySubscriptionFee) || 500,
    perSessionMemberFee: Number(rec.perSessionMemberFee) || 80,
    perSessionWalkInFee: Number(rec.perSessionWalkInFee) || 100,
  } : {
    membershipFee: 200,
    monthlySubscriptionFee: 500,
    perSessionMemberFee: 80,
    perSessionWalkInFee: 100,
  };
};
export const setAppPricing = async (pricing: AppPricingSettings): Promise<void> => {
  await db.settings.put({ id: 'app_pricing', ...pricing } as any);
};

// Payments helpers
export const addPayment = async (payment: Omit<PaymentRecord, 'id'>): Promise<string> => {
  const id = `${Date.now()}`;
  await db.payments.add({ ...payment, id });
  return id;
};
export const getPaymentsByMonth = async (ym: string): Promise<PaymentRecord[]> => {
  const all = await db.payments.toArray();
  return all.filter(p => (p.date || '').startsWith(ym));
};
export const getAllPayments = (): Promise<PaymentRecord[]> => db.payments.toArray();

// User management functions
export const getAllUsers = () => db.users.toArray();
export const getUserByUsername = (username: string) => 
  db.users.where("username").equals(username).first();
export const getUserByEmail = (email: string) => 
  db.users.where("email").equals(email).first();
export const createUser = (user: Omit<User, 'id'>) => {
  const id = `USER${Date.now().toString().slice(-6)}`;
  return db.users.add({ ...user, id });
};
export const updateUser = (id: string, updates: Partial<User>) => 
  db.users.update(id, updates);
export const deleteUser = (id: string) => db.users.delete(id);


