import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
}

export async function authenticateWithBiometrics(): Promise<boolean> {
    const available = await isBiometricAvailable();
    if (!available) return false;

    const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Connectez-vous avec Face ID / Touch ID',
        fallbackLabel: 'Utiliser le mot de passe',
        cancelLabel: 'Annuler',
        disableDeviceFallback: false,
    });

    return result.success;
}