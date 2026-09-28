// app/panduan.tsx — Panduan penggunaan SIPERKASA Sekolah (BK).
import { router } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  KeyRound,
  Plus,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

interface Section {
  Icon: LucideIcon;
  title: string;
  steps: string[];
}

const SECTIONS: Section[] = [
  {
    Icon: Plus,
    title: 'Membuat Kelas',
    steps: [
      'Di tab "Kelas", ketik nama kelas (mis. XII IPA 1) lalu tekan "Buat Kelas".',
      'Tiap kelas otomatis mendapat kode join unik.',
      'Gunakan kotak pencarian untuk menemukan kelas dengan cepat bila sudah banyak.',
    ],
  },
  {
    Icon: KeyRound,
    title: 'Mengundang Siswa',
    steps: [
      'Ketuk kelas untuk melihat kode join-nya.',
      'Bagikan kode itu ke siswa. Mereka memasukkannya di app SIPERKASA (menu Sekolah) untuk bergabung.',
    ],
  },
  {
    Icon: ShieldCheck,
    title: 'Memantau Keselamatan',
    steps: [
      'Ketuk kelas untuk melihat ringkasan skor keselamatan & jumlah insiden.',
      'Ketuk seorang siswa untuk melihat skor, riwayat insiden, dan detail perjalanannya.',
    ],
  },
  {
    Icon: Bell,
    title: 'Notifikasi Insiden',
    steps: [
      'Buka tab "Notif". Alert muncul OTOMATIS & real-time saat ada siswa mengalami insiden.',
      'Tiap alert menampilkan nama siswa, kelas, waktu, status SOS, dan link lokasi (Maps).',
      'Tekan "Tandai dilihat" setelah ditangani, atau "Bersihkan" untuk merapikan feed.',
    ],
  },
  {
    Icon: Users,
    title: 'Kelola Anggota & Akses Laptop',
    steps: [
      'Di detail kelas, keluarkan siswa satu per satu atau "Keluarkan Semua" saat pergantian kelas.',
      'Panel ini juga bisa dibuka di laptop lewat browser: sigap-sekolah.expo.app',
    ],
  },
];

export default function Panduan() {
  return (
    <Screen scroll aurora>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.onSurface} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Panduan Penggunaan</Text>
      </View>

      <Text style={styles.intro}>
        Panduan singkat memakai panel BK SIPERKASA Sekolah untuk memantau keselamatan siswa.
      </Text>

      {SECTIONS.map((s, idx) => {
        const Icon = s.Icon;
        return (
          <View key={idx} style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.iconWrap}>
                <Icon size={18} color={colors.primaryContainer} strokeWidth={2} />
              </View>
              <Text style={styles.cardTitle}>{s.title}</Text>
            </View>
            {s.steps.map((step, n) => (
              <View key={n} style={styles.stepRow}>
                <Text style={styles.stepNum}>{n + 1}</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.card,
    backgroundColor: colors.surfaceContainerHigh,
  },
  headerTitle: { ...typography.headlineSm, fontSize: 18, color: colors.onSurface },
  intro: { ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.lg, lineHeight: 20 },
  card: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface, flex: 1 },
  stepRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  stepNum: {
    ...typography.labelSm,
    color: colors.primaryContainer,
    backgroundColor: colors.surfaceContainer,
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    lineHeight: 20,
    overflow: 'hidden',
  },
  stepText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1, lineHeight: 20 },
});
