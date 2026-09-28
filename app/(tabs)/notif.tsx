// app/(tabs)/notif.tsx — Feed alert insiden siswa (real-time via Firestore onSnapshot).
import * as Linking from 'expo-linking';
import { AlertTriangle, CheckCircle2, MapPin, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import {
  acknowledgeAlert,
  deleteAlert,
  deleteAllAlerts,
  ensureSchool,
  listenAlerts,
  type IncidentAlert,
} from '@/services/school';
import { confirmAction } from '@/utils/confirm';

function toDate(v: any): Date {
  if (!v) return new Date();
  if (typeof v.toDate === 'function') return v.toDate();
  if (v.seconds != null) return new Date(v.seconds * 1000);
  return new Date(v);
}
function formatWaktu(d: Date): string {
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
function incidentLabel(type: string): string {
  switch (type) {
    case 'freefall_impact':
      return 'Jatuh + Benturan';
    case 'gyro_spike':
      return 'Putaran Mendadak';
    case 'combined':
      return 'Benturan + Putaran';
    default:
      return 'Insiden';
  }
}
const mapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export default function Notif() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<IncidentAlert[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    let unsub = () => {};
    (async () => {
      try {
        const s = await ensureSchool(user.uid, `Sekolah ${user.displayName ?? ''}`.trim());
        if (!active) return;
        setSchoolId(s.id);
        unsub = listenAlerts(
          s.id,
          (a) => {
            setAlerts(a);
            setLoading(false);
          },
          () => setLoading(false),
        );
      } catch {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      unsub();
    };
  }, [user]);

  const unreadCount = alerts.filter((a) => !a.acknowledged).length;

  const handleAck = (id: string) => {
    if (schoolId) acknowledgeAlert(schoolId, id).catch(() => {});
  };

  const handleDelete = (id: string) => {
    if (!schoolId) return;
    confirmAction('Hapus Notifikasi', 'Hapus alert ini dari feed?', 'Hapus', () =>
      deleteAlert(schoolId, id).catch(() => {}),
    );
  };

  const handleClearAll = () => {
    if (!schoolId) return;
    confirmAction(
      'Bersihkan Semua',
      `Hapus SEMUA (${alerts.length}) notifikasi dari feed?`,
      'Hapus Semua',
      () => deleteAllAlerts(schoolId).catch(() => {}),
    );
  };

  return (
    <Screen scroll aurora>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Notifikasi Insiden</Text>
        {alerts.length > 0 ? (
          <Pressable onPress={handleClearAll} hitSlop={8} style={styles.clearAllBtn}>
            <Trash2 size={14} color={colors.redSoft} strokeWidth={2} />
            <Text style={styles.clearAllText}>Bersihkan</Text>
          </Pressable>
        ) : null}
      </View>
      {unreadCount > 0 ? (
        <Text style={styles.unread}>{unreadCount} alert belum ditandai</Text>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primaryContainer} style={{ marginTop: spacing.xxl }} />
      ) : alerts.length === 0 ? (
        <View style={styles.empty}>
          <CheckCircle2 size={40} color={colors.green} strokeWidth={1.8} />
          <Text style={styles.emptyText}>Belum ada insiden.</Text>
          <Text style={styles.emptySub}>Semua siswa aman. Alert akan muncul di sini secara otomatis.</Text>
        </View>
      ) : (
        alerts.map((a) => {
          const valid = a.lat !== 0 || a.lng !== 0;
          return (
            <View
              key={a.id}
              style={[
                styles.alertCard,
                {
                  borderLeftColor: a.acknowledged
                    ? colors.outline
                    : a.sosTriggered
                      ? colors.redSoft
                      : colors.amber,
                  opacity: a.acknowledged ? 0.6 : 1,
                },
              ]}
            >
              <View style={styles.alertHead}>
                <AlertTriangle
                  size={18}
                  color={a.sosTriggered ? colors.redSoft : colors.amber}
                  strokeWidth={2}
                />
                <Text style={styles.studentName}>{a.studentName}</Text>
                <Text style={styles.className}>{a.className}</Text>
                <Pressable onPress={() => handleDelete(a.id)} hitSlop={8} style={styles.delBtn}>
                  <Trash2 size={16} color={colors.outline} strokeWidth={2} />
                </Pressable>
              </View>
              <Text style={styles.alertMeta}>
                {incidentLabel(a.type)} · {a.sosTriggered ? 'SOS TERKIRIM' : 'Terdeteksi'} ·{' '}
                {formatWaktu(toDate(a.createdAt))}
              </Text>
              <View style={styles.alertActions}>
                {valid ? (
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => Linking.openURL(mapsUrl(a.lat, a.lng)).catch(() => {})}
                  >
                    <MapPin size={14} color={colors.primaryContainer} strokeWidth={2} />
                    <Text style={styles.actionText}>Lihat Lokasi</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.noLoc}>Lokasi tidak tersedia</Text>
                )}
                {!a.acknowledged ? (
                  <Pressable style={styles.ackBtn} onPress={() => handleAck(a.id)}>
                    <CheckCircle2 size={14} color={colors.green} strokeWidth={2} />
                    <Text style={styles.ackText}>Tandai dilihat</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.ackedText}>✓ Sudah dilihat</Text>
                )}
              </View>
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: { ...typography.headlineLg, color: colors.onSurface },
  clearAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearAllText: { ...typography.labelMd, color: colors.redSoft },
  delBtn: { padding: 2 },
  unread: { ...typography.labelMd, color: colors.redSoft, marginBottom: spacing.md },
  empty: { alignItems: 'center', marginTop: spacing.xxl, gap: spacing.xs },
  emptyText: { ...typography.bodyLg, color: colors.onSurfaceVariant, marginTop: spacing.sm },
  emptySub: { ...typography.bodySm, color: colors.outline, textAlign: 'center' },
  alertCard: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderLeftWidth: 4,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  alertHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  studentName: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface, flex: 1 },
  className: { ...typography.labelSm, color: colors.primaryContainer },
  alertMeta: { ...typography.bodySm, color: colors.onSurfaceVariant },
  alertActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { ...typography.labelMd, color: colors.primaryContainer },
  noLoc: { ...typography.bodySm, color: colors.outline },
  ackBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ackText: { ...typography.labelMd, color: colors.green },
  ackedText: { ...typography.labelSm, color: colors.outline },
});
