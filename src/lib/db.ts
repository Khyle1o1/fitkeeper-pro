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
    this.version(3).stores({
      members: "id, fullName, email, phone, status, isActive, membershipStartDate, membershipExpiryDate, membershipDurationMonths",
      attendance: "id, memberId, memberName, date, checkInTime",
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
  // No-op: remove mock auto-seeding so app starts with an empty database
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


