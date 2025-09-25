import Dexie, { type Table } from "dexie";
import {
  type Member,
  type AttendanceRecord,
  type RenewalRecord,
} from "@/data/mockData";

export class PowerLiftDatabase extends Dexie {
  members!: Table<Member, string>;
  attendance!: Table<AttendanceRecord, string>;
  renewals!: Table<RenewalRecord, string>;

  constructor() {
    super("powerlift-fitness-db");
    // v4: add checkOutTime to attendance schema
    this.version(4).stores({
      members: "id, fullName, email, phone, status, isActive, membershipStartDate, membershipExpiryDate, membershipDurationMonths",
      attendance: "id, memberId, memberName, date, checkInTime, checkOutTime",
      renewals: "id, memberId, renewalDate",
    });
  }
}

export const db = new PowerLiftDatabase();

export async function clearAllData(): Promise<void> {
  await db.transaction("rw", [db.members, db.attendance, db.renewals], async () => {
    await db.members.clear();
    await db.attendance.clear();
    await db.renewals.clear();
  });
  
  // Clear the seeded flag so it won't auto-seed again
  localStorage.removeItem("powerlift-db-seeded-v1");
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
  localStorage.setItem(seededKey, "true");
}

export async function initLocalDb(): Promise<void> {
  await db.open();
  await seedDatabaseIfEmpty();
}

// Simple query helpers for future use
export const getAllMembers = () => db.members.toArray();
export const getAttendanceByDate = (date: string) =>
  db.attendance.where("date").equals(date).toArray();
export const getRenewals = () => db.renewals.toArray();


