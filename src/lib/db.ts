import Dexie, { type Table } from "dexie";
import {
  mockMembers,
  mockAttendanceRecords,
  mockRenewalRecords,
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
  const seededFlagKey = "powerlift-db-seeded-v1";
  if (localStorage.getItem(seededFlagKey)) return;

  const memberCount = await db.members.count();
  if (memberCount === 0) {
    await db.transaction("rw", [db.members, db.attendance, db.renewals], async () => {
      await db.members.bulkPut(mockMembers);
      await db.attendance.bulkPut(mockAttendanceRecords);
      await db.renewals.bulkPut(mockRenewalRecords);
    });
  }

  localStorage.setItem(seededFlagKey, "1");
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


