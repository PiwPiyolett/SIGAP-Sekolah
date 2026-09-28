// utils/confirm.ts — konfirmasi destruktif lintas-platform.
// `Alert.alert` dari react-native TIDAK berfungsi andal di react-native-web (dialog tak
// muncul / callback tak terpicu), sehingga aksi hapus diam di web. Di web pakai window.confirm.
import { Alert, Platform } from 'react-native';

export function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
) {
  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : true;
    if (ok) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Batal', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ]);
  }
}

// Pesan info/error sederhana (Alert.alert juga tak andal di web).
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message ?? '');
  }
}
