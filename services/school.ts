// services/school.ts (app Sekolah) — kelola sekolah, kelas (kode join), & feed alert insiden.
// Firebase project SAMA dengan app Driver.
//
// Skema Firestore:
//   schoolAccounts/{uid}                              akun BK
//   schools/{schoolId}                                { adminUid, schoolName }
//   schools/{schoolId}/classes/{classId}              { name, joinCode, createdAt }
//   schools/{schoolId}/classes/{classId}/members/{uid}{ name, joinedAt }
//   schools/{schoolId}/alerts/{alertId}               alert insiden (ditulis app Driver)
//   classCodes/{CODE}                                 { schoolId, classId, className, schoolName }  (lookup join)
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

export interface School {
  id: string;
  adminUid: string;
  schoolName: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  joinCode: string;
}

export interface ClassMember {
  uid: string;
  name: string;
}

export interface IncidentAlert {
  id: string;
  studentUid: string;
  studentName: string;
  className: string;
  type: string;
  lat: number;
  lng: number;
  sosTriggered: boolean;
  acknowledged: boolean;
  createdAt: any; // Firestore Timestamp
}

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// === Sekolah ===

export async function ensureSchool(adminUid: string, defaultName: string): Promise<School> {
  const existing = await getSchoolByAdmin(adminUid);
  if (existing) return existing;
  const ref = await addDoc(collection(db, 'schools'), {
    adminUid,
    schoolName: defaultName,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, adminUid, schoolName: defaultName };
}

export async function getSchoolByAdmin(adminUid: string): Promise<School | null> {
  const q = query(collection(db, 'schools'), where('adminUid', '==', adminUid), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, adminUid, schoolName: (d.data().schoolName as string) ?? 'Sekolah Saya' };
}

export async function renameSchool(schoolId: string, schoolName: string): Promise<void> {
  await setDoc(doc(db, 'schools', schoolId), { schoolName }, { merge: true });
}

// === Kelas ===

export async function createClass(
  schoolId: string,
  schoolName: string,
  name: string,
): Promise<SchoolClass> {
  const joinCode = genCode();
  const ref = await addDoc(collection(db, 'schools', schoolId, 'classes'), {
    name: name.trim(),
    joinCode,
    createdAt: serverTimestamp(),
  });
  // Lookup datar agar siswa bisa gabung hanya dengan kode (tanpa tahu schoolId).
  await setDoc(doc(db, 'classCodes', joinCode), {
    schoolId,
    classId: ref.id,
    className: name.trim(),
    schoolName,
  });
  return { id: ref.id, name: name.trim(), joinCode };
}

export async function listClasses(schoolId: string): Promise<SchoolClass[]> {
  const snap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
  return snap.docs.map((d) => ({
    id: d.id,
    name: (d.data().name as string) ?? 'Kelas',
    joinCode: (d.data().joinCode as string) ?? '',
  }));
}

export async function deleteClass(
  schoolId: string,
  classId: string,
  joinCode: string,
): Promise<void> {
  await deleteDoc(doc(db, 'schools', schoolId, 'classes', classId));
  if (joinCode) await deleteDoc(doc(db, 'classCodes', joinCode));
}

export async function listClassMembers(
  schoolId: string,
  classId: string,
): Promise<ClassMember[]> {
  const snap = await getDocs(
    collection(db, 'schools', schoolId, 'classes', classId, 'members'),
  );
  return snap.docs.map((d) => ({ uid: d.id, name: (d.data().name as string) ?? d.id }));
}

// === Feed alert insiden (real-time) ===

// Dengarkan alert terbaru. Mengembalikan fungsi unsubscribe.
export function listenAlerts(
  schoolId: string,
  cb: (alerts: IncidentAlert[]) => void,
  onError?: (e: unknown) => void,
): () => void {
  const q = query(
    collection(db, 'schools', schoolId, 'alerts'),
    orderBy('createdAt', 'desc'),
    limit(100),
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            studentUid: x.studentUid ?? '',
            studentName: x.studentName ?? 'Siswa',
            className: x.className ?? '-',
            type: x.type ?? 'combined',
            lat: typeof x.lat === 'number' ? x.lat : 0,
            lng: typeof x.lng === 'number' ? x.lng : 0,
            sosTriggered: !!x.sosTriggered,
            acknowledged: !!x.acknowledged,
            createdAt: x.createdAt,
          };
        }),
      );
    },
    (e) => onError?.(e),
  );
}

export async function acknowledgeAlert(schoolId: string, alertId: string): Promise<void> {
  await setDoc(
    doc(db, 'schools', schoolId, 'alerts', alertId),
    { acknowledged: true },
    { merge: true },
  );
}

export async function deleteAlert(schoolId: string, alertId: string): Promise<void> {
  await deleteDoc(doc(db, 'schools', schoolId, 'alerts', alertId));
}

// Hapus SEMUA alert (bersihkan feed). Mengembalikan jumlah yang dihapus.
export async function deleteAllAlerts(schoolId: string): Promise<number> {
  const snap = await getDocs(collection(db, 'schools', schoolId, 'alerts'));
  if (snap.empty) return 0;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

// === Keluarkan anggota kelas ===
// Saat siswa dikeluarkan, tautan sekolah di dokumen user-nya dibersihkan agar
// app Driver siswa berhenti mengirim alert ke kelas ini.
const CLEAR_LINK = { schoolId: null, classId: null, className: null, schoolName: null };

export async function removeMember(
  schoolId: string,
  classId: string,
  studentUid: string,
): Promise<void> {
  await deleteDoc(doc(db, 'schools', schoolId, 'classes', classId, 'members', studentUid));
  await setDoc(doc(db, 'users', studentUid), CLEAR_LINK, { merge: true });
}

// Keluarkan SEMUA siswa dari kelas sekaligus. Mengembalikan jumlah yang dikeluarkan.
export async function removeAllMembers(schoolId: string, classId: string): Promise<number> {
  const snap = await getDocs(collection(db, 'schools', schoolId, 'classes', classId, 'members'));
  if (snap.empty) return 0;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.delete(d.ref);
    batch.set(doc(db, 'users', d.id), CLEAR_LINK, { merge: true });
  });
  await batch.commit();
  return snap.size;
}
