import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import NouvelleTransactionScreen from '../screens/NouvelleTransactionScreen';
import ComptesScreen from '../screens/ComptesScreen';
import AlertesScreen from '../screens/AlertesScreen';

export type TransactionsStackParamList = {
  TransactionsList: undefined;
  NouvelleTransaction: undefined;
};

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();
const TxStack = createNativeStackNavigator<TransactionsStackParamList>();

function TransactionsNavigator() {
  return (
    <TxStack.Navigator screenOptions={{ headerShown: false }}>
      <TxStack.Screen name="TransactionsList" component={TransactionsScreen} />
      <TxStack.Screen name="NouvelleTransaction" component={NouvelleTransactionScreen} />
    </TxStack.Navigator>
  );
}

const TAB_ICONS: Record<string, [string, string]> = {
  Dashboard:    ['grid',            'grid-outline'],
  Transactions: ['swap-horizontal', 'swap-horizontal-outline'],
  Comptes:      ['wallet',          'wallet-outline'],
  Alertes:      ['notifications',   'notifications-outline'],
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = TAB_ICONS[route.name] ?? ['help', 'help-outline'];
          return (
            <Ionicons
              name={(focused ? active : inactive) as keyof typeof Ionicons.glyphMap}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard"    component={DashboardScreen}       options={{ tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="Transactions" component={TransactionsNavigator} options={{ tabBarLabel: 'Transactions' }} />
      <Tab.Screen name="Comptes"      component={ComptesScreen}         options={{ tabBarLabel: 'Comptes' }} />
      <Tab.Screen name="Alertes"      component={AlertesScreen}         options={{ tabBarLabel: 'Alertes' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : (
          <RootStack.Screen name="Login" component={LoginScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
