// app/siswa/[uid].tsx — Ringkasan KESELAMATAN siswa untuk BK: skor, insiden, riwayat trip.
// Fokus keselamatan (bukan pelacakan lokasi); detail rute hanya sekunder via trip detail.
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { AlertTriangle, ArrowLeft, MapPin, Navigation, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { getUserTrips } from '@/services/firestore';
import { formatCoord, mapsPointUrl } from '@/services/maps';
import { klasifikasiSkor } from '@/services/scoreCalculator';
import { SPEED_LIMIT } from '@/constants/thresholds';
import type { GeoPoint, Incident, Trip } from '@/types';

function toDate(v: any): Date {
  if (!v) return new Date();
  if (typeof v.toDate === 'function') return v.toDate();
  if (v.seconds != null) return new Date(v.seconds * 1000);
  return new Date(v);
}
function formatTanggal(d: Date): string {
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatJam(d: Date): string {
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
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
const hasCoord = (p?: GeoPoint | null): p is GeoPoint => !!p && (p.lat !== 0 || p.lng !== 0);

export default function SiswaDetail() {
  const { uid, name, className } = useLocalSearchParams<{
    uid: string;
    name: string;
    className: string;
  }>();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    setLoading(true);
    getUserTrips(uid)
      .then((t) => active && setTrips(t))
      .catch(() => active && setTrips([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [uid]);

  // Agregat keselamatan.
  const totalTrips = trips.length;
  const avgScore = totalTrips
    ? Math.round(trips.reduce((s, t) => s + (t.safetyScore ?? 0), 0) / totalTrips)
    : 0;
  const totalIncidents = trips.reduce((s, t) => s + (t.incidentCount ?? 0), 0);
  const cls = klasifikasiSkor(avgScore);

  // Semua insiden lintas trip, terbaru di atas. "Jalan rusak" bukan insiden
  // keselamatan siswa (kendaraan tetap melaju), jadi tak ditampilkan di sini.
  const allIncidents: (Incident & { tripId: string })[] = trips
    .flatMap((t) => (t.incidents ?? []).map((inc) => ({ ...inc, tripId: t.id })))
    .filter((inc) => inc.type !== 'rough_road')
    .sort((a, b) => toDate(b.timestamp).getTime() - toDate(a.timestamp).getTime());

  return (
    <Screen scroll aurora>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.onSurface} strokeWidth={2} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>{name ?? 'Siswa'}</Text>
          {className ? <Text style={styles.headerSub}>{className}</Text> : null}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryContainer} style={{ marginTop: spacing.xxl }} />
      ) : (
        <>
          {/* Ringkasan keselamatan */}
          <View style={[styles.scoreCard, { borderLeftColor: cls.color }]}>
            <ScoreBadge score={avgScore} />
            <View style={{ flex: 1 }}>
              <Text style={styles.scoreLabel}>Skor Keselamatan Rata-rata</Text>
              <Text style={[styles.scoreClass, { color: cls.color }]}>{cls.label}</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Navigation size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
              <Text style={styles.statValue}>{totalTrips}</Text>
              <Text style={styles.statLabel}>perjalanan</Text>
            </View>
            <View style={styles.statCard}>
              <AlertTriangle
                size={14}
                color={totalIncidents > 0 ? colors.redSoft : colors.onSurfaceVariant}
                strokeWidth={2}
              />
              <Text style={styles.statValue}>{totalIncidents}</Text>
              <Text style={styles.statLabel}>insiden</Text>
            </View>
          </View>

          {/* Riwayat insiden */}
          <Text style={styles.sectionTitle}>Riwayat Insiden ({allIncidents.length})</Text>
          {allIncidents.length === 0 ? (
            <View style={styles.safeCard}>
              <ShieldCheck size={18} color={colors.green} strokeWidth={2} />
              <Text style={styles.safeText}>Belum ada insiden. Siswa ini berkendara aman.</Text>
            </View>
          ) : (
            allIncidents.map((inc) => {
              const valid = hasCoord(inc.location);
              return (
                <Pressable
                  key={inc.id}
                  disabled={!valid}
                  onPress={() => valid && Linking.openURL(mapsPointUrl(inc.location)).catch(() => {})}
                  style={[styles.incidentCard, { borderLeftColor: inc.sosTriggered ? colors.redSoft : colors.amber }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.incidentType}>{incidentLabel(inc.type)}</Text>
                    <Text style={styles.incidentMeta}>
                      {formatTanggal(toDate(inc.timestamp))} · {formatJam(toDate(inc.timestamp))} ·{' '}
                      {inc.sosTriggered ? 'SOS terkirim' : inc.sosCancelled ? 'Dibatalkan' : '—'}
                    </Text>
                    {valid ? (
                      <Text style={styles.incidentCoord}>{formatCoord(inc.location)}</Text>
                    ) : null}
                  </View>
                  {valid ? <MapPin size={16} color={colors.primaryContainer} strokeWidth={2} /> : null}
                </Pressable>
              );
            })
          )}

          {/* Riwayat trip (sekunder) */}
          <Text style={styles.sectionTitle}>Riwayat Perjalanan ({totalTrips})</Text>
          {totalTrips === 0 ? (
            <Text style={styles.emptyText}>Belum ada perjalanan.</Text>
          ) : (
            trips.map((trip) => {
              const start = toDate(trip.startTime);
              const tcls = klasifikasiSkor(trip.safetyScore ?? 0);
              const maxSpeed = trip.maxSpeed ?? 0;
              const overLimit = maxSpeed > (SPEED_LIMIT[trip.vehicleMode] ?? Infinity);
              return (
                <Pressable
                  key={trip.id}
                  onPress={() => router.push({ pathname: '/perjalanan/[id]', params: { id: trip.id } })}
                  style={({ pressed }) => [
                    styles.tripCard,
                    { borderLeftColor: tcls.color, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <ScoreBadge score={trip.safetyScore ?? 0} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tripTitle}>
                      Perjalanan {trip.vehicleMode === 'motor' ? 'Motor' : 'Mobil'}
                    </Text>
                    <Text style={styles.tripMeta}>{formatTanggal(start)}</Text>
                    <Text style={[styles.tripMaxSpeed, overLimit && styles.tripMaxSpeedOver]}>
                      Tertinggi {maxSpeed.toFixed(0)} km/j{overLimit ? ' · lewat batas' : ''}
                    </Text>
                  </View>
                  <Text style={styles.tripDistance}>{(trip.distance ?? 0).toFixed(1)} km</Text>
                </Pressable>
              );
            })
          )}
        </>
      )}
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
  headerSub: { ...typography.labelSm, color: colors.primaryContainer },

  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderLeftWidth: 4,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  scoreLabel: { ...typography.bodySm, color: colors.onSurfaceVariant },
  scoreClass: { ...typography.headlineSm, fontSize: 16, marginTop: 2 },

  statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { ...typography.dataLg, color: colors.primaryContainer },
  statLabel: { ...typography.labelSm, color: colors.outline, fontSize: 10 },

  sectionTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface, marginBottom: spacing.sm, marginTop: spacing.xs },
  safeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  safeText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
  incidentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderLeftWidth: 4,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  incidentType: { ...typography.bodyMd, color: colors.onSurface },
  incidentMeta: { ...typography.bodySm, color: colors.onSurfaceVariant },
  incidentCoord: { ...typography.bodySm, color: colors.outline, fontFamily: 'JetBrainsMono_500Medium' },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.lg },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderLeftWidth: 4,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  tripTitle: { ...typography.bodyMd, color: colors.onSurface },
  tripMeta: { ...typography.bodySm, color: colors.onSurfaceVariant },
  tripMaxSpeed: { ...typography.labelSm, color: colors.onSurfaceVariant },
  tripMaxSpeedOver: { color: colors.redSoft },
  tripDistance: { ...typography.dataMd, color: colors.primaryContainer },
});
