// services/auth.ts — register/login/logout untuk SIPERKASA SEKOLAH (akun BK/admin sekolah).
// Firebase project SAMA dengan app Driver; domain email `@sigapsekolah.app` agar
// akun sekolah tidak bentrok dengan driver (`@sigap.app`) maupun keluarga (`@sigapfamily.app`).
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const EMAIL_DOMAIN = '@sigapsekolah.app';

const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}${EMAIL_DOMAIN}`;

export const registerUser = async (username: string, password: string) => {
  const email = usernameToEmail(username);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: username.trim() });
  await setDoc(doc(db, 'schoolAccounts', cred.user.uid), {
    username: username.trim(),
    email,
    createdAt: serverTimestamp(),
  });
  return cred.user;
};

export const loginUser = async (username: string, password: string) => {
  const email = usernameToEmail(username);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
};

export const logout = () => signOut(auth);

export const authErrorMessage = (code: string): string => {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Username atau password salah.';
    case 'auth/email-already-in-use':
      return 'Username sudah terdaftar. Coba username lain.';
    case 'auth/weak-password':
      return 'Password terlalu lemah (minimal 6 karakter).';
    case 'auth/network-request-failed':
      return 'Gagal terhubung. Periksa koneksi internet.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan. Coba lagi nanti.';
    default:
      return 'Terjadi kesalahan. Coba lagi.';
  }
};
