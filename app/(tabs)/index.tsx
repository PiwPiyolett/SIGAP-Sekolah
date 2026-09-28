// app/(tabs)/index.tsx — Dashboard sekolah: buat & kelola kelas (tiap kelas punya kode join).
import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, KeyRound, Plus, School as SchoolIcon, Search } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import {
  createClass,
  ensureSchool,
  listClasses,
  type School,
  type SchoolClass,
} from '@/services/school';
import { notify } from '@/utils/confirm';

export default function Dashboard() {
  const { user } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClass, setNewClass] = useState('');
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const s = await ensureSchool(user.uid, `Sekolah ${user.displayName ?? ''}`.trim());
      setSchool(s);
      setClasses(await listClasses(s.id));
    } catch {
      notify('Gagal memuat', 'Periksa koneksi internet lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (active) await load();
      })();
      return () => {
        active = false;
      };
    }, [load]),
  );

  const handleAdd = async () => {
    if (!school || !newClass.trim()) return;
    setAdding(true);
    try {
      await createClass(school.id, school.schoolName, newClass);
      setNewClass('');
      setClasses(await listClasses(school.id));
    } catch {
      notify('Gagal', 'Tidak bisa membuat kelas. Coba lagi.');
    } finally {
      setAdding(false);
    }
  };

  const filtered = classes.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Screen scroll aurora>
      <Text style={styles.title}>Kelola Kelas</Text>

      {loading ? (
        <ActivityIndicator color={colors.primaryContainer} style={{ marginTop: spacing.xxl }} />
      ) : (
        <>
          <View style={styles.schoolCard}>
            <SchoolIcon size={18} color={colors.primaryContainer} strokeWidth={2} />
            <Text style={styles.schoolName}>{school?.schoolName ?? 'Sekolah Saya'}</Text>
          </View>

          {/* Buat kelas */}
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>Tambah Kelas</Text>
            <Input
              icon={Plus}
              placeholder="Nama kelas (mis. XII IPA 1)"
              value={newClass}
              onChangeText={setNewClass}
              autoCapitalize="characters"
            />
            <Button label="Buat Kelas" onPress={handleAdd} loading={adding} />
          </View>

          {/* Daftar kelas */}
          <Text style={styles.sectionTitle}>Daftar Kelas ({classes.length})</Text>
          {classes.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Belum ada kelas.</Text>
              <Text style={styles.emptySub}>Buat kelas pertama di atas — siswa gabung pakai kodenya.</Text>
            </View>
          ) : (
            <>
              <View style={styles.searchWrap}>
                <Input
                  icon={Search}
                  placeholder="Cari nama kelas…"
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="characters"
                />
              </View>
              {filtered.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Kelas tidak ditemukan.</Text>
                  <Text style={styles.emptySub}>Coba kata kunci lain.</Text>
                </View>
              ) : (
                filtered.map((c, i) => (
                  <Animated.View key={c.id} entering={FadeInDown.duration(350).delay(Math.min(i, 8) * 60)}>
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/kelas/[id]',
                          params: {
                            id: c.id,
                            schoolId: school!.id,
                            name: c.name,
                            joinCode: c.joinCode,
                          },
                        })
                      }
                      style={({ pressed }) => [styles.classCard, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.className}>{c.name}</Text>
                        <View style={styles.codeRow}>
                          <KeyRound size={13} color={colors.onSurfaceVariant} strokeWidth={2} />
                          <Text style={styles.codeLabel}>Kode:</Text>
                          <Text style={styles.codeValue}>{c.joinCode}</Text>
                        </View>
                      </View>
                      <ChevronRight size={20} color={colors.outline} strokeWidth={2} />
                    </Pressable>
                  </Animated.View>
                ))
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.headlineLg, color: colors.onSurface, marginBottom: spacing.lg },
  schoolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  schoolName: { ...typography.headlineSm, fontSize: 18, color: colors.onSurface },
  addCard: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  addTitle: { ...typography.labelMd, color: colors.onSurfaceVariant },
  sectionTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface, marginBottom: spacing.sm },
  searchWrap: { marginBottom: spacing.md },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  className: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 },
  codeLabel: { ...typography.bodySm, color: colors.onSurfaceVariant },
  codeValue: {
    ...typography.dataMd,
    color: colors.primaryContainer,
    letterSpacing: 2,
    fontFamily: 'JetBrainsMono_700Bold',
  },
  empty: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.xs },
  emptyText: { ...typography.bodyLg, color: colors.onSurfaceVariant },
  emptySub: { ...typography.bodySm, color: colors.outline, textAlign: 'center' },
});
