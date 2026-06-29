import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import NouvelleTransactionScreen from '../screens/NouvelleTransactionScreen';
import ComptesScreen from '../screens/ComptesScreen';
import AlertesScreen from '../screens/AlertesScreen';
import BudgetsScreen from '../screens/BudgetsScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import ProfilScreen from '../screens/ProfilScreen';

// ─── Types des stacks ─────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type TransactionsStackParamList = {
  TransactionsList: undefined;
  NouvelleTransaction: undefined;
};

export type BudgetsStackParamList = {
  BudgetsList: undefined;
  CategoriesList: undefined;
};

// ─── Navigateurs ──────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const TxStack = createNativeStackNavigator<TransactionsStackParamList>();
const BgStack = createNativeStackNavigator<BudgetsStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function TransactionsNavigator() {
  return (
    <TxStack.Navigator screenOptions={{ headerShown: false }}>
      <TxStack.Screen name="TransactionsList" component={TransactionsScreen} />
      <TxStack.Screen name="NouvelleTransaction" component={NouvelleTransactionScreen} />
    </TxStack.Navigator>
  );
}

function BudgetsNavigator() {
  return (
    <BgStack.Navigator screenOptions={{ headerShown: false }}>
      <BgStack.Screen name="BudgetsList" component={BudgetsScreen} />
      <BgStack.Screen name="CategoriesList" component={CategoriesScreen} />
    </BgStack.Navigator>
  );
}

// ─── Icônes des tabs ──────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, [string, string]> = {
  Dashboard: ['grid', 'grid-outline'],
  Transactions: ['swap-horizontal', 'swap-horizontal-outline'],
  Budgets: ['pie-chart', 'pie-chart-outline'],
  Comptes: ['wallet', 'wallet-outline'],
  Alertes: ['notifications', 'notifications-outline'],
  Profil: ['person', 'person-outline'],
};

// ─── Onglets principaux ───────────────────────────────────────────────────────

function MainTabs() {
  const { t } = useLanguage();
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
        tabBarLabelStyle: { fontSize: 10 },
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
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: t.nav.dashboard }} />
      <Tab.Screen name="Transactions" component={TransactionsNavigator} options={{ tabBarLabel: t.nav.transactions }} />
      <Tab.Screen name="Budgets" component={BudgetsNavigator} options={{ tabBarLabel: t.nav.budgets }} />
      <Tab.Screen name="Comptes" component={ComptesScreen} options={{ tabBarLabel: t.nav.comptes }} />
      <Tab.Screen name="Alertes" component={AlertesScreen} options={{ tabBarLabel: t.nav.alertes }} />
      <Tab.Screen name="Profil" component={ProfilScreen} options={{ tabBarLabel: t.nav.profil }} />
    </Tab.Navigator>
  );
}

// ─── Navigateur racine ────────────────────────────────────────────────────────

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
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}