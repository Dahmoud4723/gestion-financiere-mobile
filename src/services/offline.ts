import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const KEYS = {
    comptes: 'offline_comptes',
    transactions: 'offline_transactions',
    budgets: 'offline_budgets',
    alertes: 'offline_alertes',
    categories: 'offline_categories',
};

// Vérifier connexion internet
export async function isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
}

// Sauvegarder données en local
export async function saveOffline(key: keyof typeof KEYS, data: any) {
    try {
        await AsyncStorage.setItem(KEYS[key], JSON.stringify({
            data,
            savedAt: new Date().toISOString(),
        }));
    } catch (e) {
        console.error('Erreur sauvegarde offline:', e);
    }
}

// Charger données locales
export async function loadOffline(key: keyof typeof KEYS): Promise<any | null> {
    try {
        const raw = await AsyncStorage.getItem(KEYS[key]);
        if (!raw) return null;
        const { data } = JSON.parse(raw);
        return data;
    } catch (e) {
        console.error('Erreur chargement offline:', e);
        return null;
    }
}

// Date de dernière synchronisation
export async function getLastSync(key: keyof typeof KEYS): Promise<string | null> {
    try {
        const raw = await AsyncStorage.getItem(KEYS[key]);
        if (!raw) return null;
        const { savedAt } = JSON.parse(raw);
        return savedAt;
    } catch {
        return null;
    }
}