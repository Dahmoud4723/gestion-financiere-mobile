import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return 'granted';
}

export async function sendLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}

export async function notifyBudgetAlert(categorie: string, pourcentage: number) {
  const emoji = pourcentage >= 100 ? '🚨' : '⚠️';
  const titre = pourcentage >= 100
    ? `${emoji} Budget ${categorie} dépassé !`
    : `${emoji} Budget ${categorie} à ${pourcentage}%`;
  const message = pourcentage >= 100
    ? `Vous avez dépassé votre budget ${categorie}.`
    : `Vous avez utilisé ${pourcentage}% de votre budget ${categorie}.`;

  await sendLocalNotification(titre, message);
}