// app/kelas/[id].tsx — Detail kelas: kode join + ringkasan keselamatan + daftar siswa (skor & insiden).
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, KeyRound, Trash2, UserMinus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { getUserTrips } from '@/services/firestore';
import { klasifikasiSkor } from '@/services/scoreCalculator';
import { confirmAction, notify } from '@/utils/confirm';
import { deleteClass, listClassMembers, removeAllMembers, removeMember } from '@/services/school';

interface MemberStat {
  uid: string;
  name: string;
  tripCount: number;
  avgScore: number;
  incidents: number;
}

export default function KelasDetail() {
  const { id, schoolId, name, joinCode } = useLocalSearchParams<{
    id: string;
    schoolId: string;
    name: string;
    joinCode: string;
  }>();

  const [members, setMembers] = useState<MemberStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId || !id) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const list = await listClassMembers(schoolId, id);
        const stats = await Promise.all(
          list.map(async (m) => {
            const trips = await getUserTrips(m.uid).catch(() => []);
            const avgScore = trips.length
              ? Math.round(trips.reduce((s, t) => s + (t.safetyScore ?? 0), 0) / trips.length)
              : 0;
            const incidents = trips.reduce((s, t) => s + (t.incidentCount ?? 0), 0);
            return { uid: m.uid, name: m.name, tripCount: trips.length, avgScore, incidents };
          }),
        );
        if (active) setMembers(stats);
      } catch {
        if (active) setMembers([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [schoolId, id]);

  const withTrips = members.filter((m) => m.tripCount > 0);
  const classAvg = withTrips.length
    ? Math.round(withTrips.reduce((s, m) => s + m.avgScore, 0) / withTrips.length)
    : 0;
  const classIncidents = members.reduce((s, m) => s + m.incidents, 0);
  const cls = klasifikasiSkor(classAvg);

  const handleDelete = () => {
    confirmAction(
      'Hapus Kelas',
      `Hapus kelas "${name}"? Siswa tidak lagi terhubung ke kelas ini.`,
      'Hapus',
      async () => {
        try {
          await deleteClass(schoolId!, id!, joinCode ?? '');
          router.back();
        } catch {
          notify('Gagal', 'Tidak bisa menghapus kelas. Coba lagi.');
        }
      },
    );
  };

  const handleRemoveMember = (m: MemberStat) => {
    confirmAction('Keluarkan Siswa', `Keluarkan ${m.name} dari kelas ${name}?`, 'Keluarkan', async () => {
      try {
        await removeMember(schoolId!, id!, m.uid);
        setMembers((ms) => ms.filter((x) => x.uid !== m.uid));
      } catch {
        notify('Gagal', 'Tidak bisa mengeluarkan siswa. Coba lagi.');
      }
    });
  };

  const handleRemoveAll = () => {
    confirmAction(
      'Keluarkan Semua Siswa',
      `Keluarkan SEMUA (${members.length}) siswa dari kelas ${name}? Cocok saat pergantian kelas / tahun ajaran.`,
      'Keluarkan Semua',
      async () => {
        try {
          await removeAllMembers(schoolId!, id!);
          setMembers([]);
        } catch {
          notify('Gagal', 'Tidak bisa mengeluarkan siswa. Coba lagi.');
        }
      },
    );
  };

  return (
    <Screen scroll aurora>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.onSurface} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>{name ?? 'Kelas'}</Text>
      </View>

      {/* Kode join */}
      <View style={styles.codeCard}>
        <KeyRound size={20} color={colors.primaryContainer} strokeWidth={2} />
        <Text style={styles.codeLabel}>Kode Join Kelas</Text>
        <Text style={styles.codeValue}>{joinCode ?? '—'}</Text>
        <Text style={styles.codeHint}>
          Bagikan kode ini ke siswa. Mereka memasukkannya di app SIPERKASA (menu Sekolah) untuk bergabung.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryContainer} style={{ marginTop: spacing.lg }} />
      ) : (
        <>
          {/* Ringkasan keselamatan kelas */}
          {withTrips.length > 0 ? (
            <View style={[styles.summaryCard, { borderLeftColor: cls.color }]}>
              <ScoreBadge score={classAvg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Rata-rata Skor Kelas</Text>
                <Text style={[styles.summaryClass, { color: cls.color }]}>{cls.label}</Text>
              </View>
              <View style={styles.summaryRight}>
                <Text style={styles.summaryIncident}>{classIncidents}</Text>
                <Text style={styles.summaryIncidentLabel}>insiden</Text>
              </View>
            </View>
          ) : null}

          {/* Daftar siswa */}
          <View style={styles.membersHead}>
            <Text style={styles.sectionTitle}>Siswa ({members.length})</Text>
            {members.length > 0 ? (
              <Pressable onPress={handleRemoveAll} hitSlop={8} style={styles.removeAllBtn}>
                <UserMinus size={14} color={colors.redSoft} strokeWidth={2} />
                <Text style={styles.removeAllText}>Keluarkan Semua</Text>
              </Pressable>
            ) : null}
          </View>
          {members.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Belum ada siswa yang bergabung.</Text>
            </View>
          ) : (
            members.map((m) => {
              const mcls = klasifikasiSkor(m.avgScore);
              return (
                <View key={m.uid} style={styles.memberCard}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/siswa/[uid]',
                        params: { uid: m.uid, name: m.name, className: name ?? '' },
                      })
                    }
                    style={({ pressed }) => [styles.memberMain, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    {m.tripCount > 0 ? (
                      <ScoreBadge score={m.avgScore} />
                    ) : (
                      <View style={styles.noData}>
                        <Text style={styles.noDataText}>–</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{m.name}</Text>
                      <Text style={[styles.memberMeta, m.incidents > 0 && { color: colors.redSoft }]}>
                        {m.tripCount > 0
                          ? `${m.tripCount} perjalanan · ${m.incidents} insiden`
                          : 'Belum ada perjalanan'}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => handleRemoveMember(m)} hitSlop={8} style={styles.removeBtn}>
                    <UserMinus size={18} color={colors.redSoft} strokeWidth={2} />
                  </Pressable>
                </View>
              );
            })
          )}
        </>
      )}

      <Pressable onPress={handleDelete} style={styles.deleteBtn}>
        <Trash2 size={16} color={colors.redSoft} strokeWidth={2} />
        <Text style={styles.deleteText}>Hapus Kelas</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.card,
    backgroundColor: colors.surfaceContainerHigh,
  },
  headerTitle: { ...typography.headlineSm, fontSize: 18, color: colors.onSurface },
  codeCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  codeLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  codeValue: {
    ...typography.displayMobile,
    fontSize: 40,
    color: colors.primaryContainer,
    letterSpacing: 8,
    fontFamily: 'JetBrainsMono_700Bold',
  },
  codeHint: { ...typography.bodySm, color: colors.outline, textAlign: 'center', marginTop: spacing.xs },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderLeftWidth: 4,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryLabel: { ...typography.bodySm, color: colors.onSurfaceVariant },
  summaryClass: { ...typography.headlineSm, fontSize: 15, marginTop: 2 },
  summaryRight: { alignItems: 'center' },
  summaryIncident: { ...typography.dataLg, color: colors.redSoft },
  summaryIncidentLabel: { ...typography.labelSm, color: colors.outline, fontSize: 10 },

  membersHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface },
  removeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeAllText: { ...typography.labelMd, color: colors.redSoft },
  memberMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  removeBtn: { padding: spacing.xs },
  empty: { alignItems: 'center', marginTop: spacing.lg },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  noData: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: { ...typography.headlineSm, color: colors.outline },
  memberName: { ...typography.bodyLg, fontSize: 16, color: colors.onSurface },
  memberMeta: { ...typography.bodySm, color: colors.onSurfaceVariant },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  deleteText: { ...typography.labelMd, color: colors.redSoft },
});
