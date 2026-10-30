import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import FrontDeskScreen from '../screens/frontoffice/FrontDeskScreen';
import RoomRackScreen from '../screens/frontoffice/RoomRackScreen';
import QuickCheckInScreen from '../screens/frontoffice/QuickCheckInScreen';
import MobilePosScreen from '../screens/restaurant/MobilePosScreen';
import KitchenKdsScreen from '../screens/kitchen/KitchenKdsScreen';
import HousekeepingScreen from '../screens/housekeeping/HousekeepingScreen';

// Icons
import {
  TrendingUp,
  UserCheck,
  Bed,
  Utensils,
  ChefHat,
  Sparkles,
} from 'lucide-react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  const { role } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 5,
        },
        tabBarActiveTintColor: COLORS.brand,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      {/* 1. Owner & Manager Tabs */}
      {(role === 'owner' || role === 'manager' || role === 'super_admin') && (
        <>
          <Tab.Screen
            name="ExecutivePulse"
            component={OwnerDashboardScreen}
            options={{
              tabBarLabel: 'Pulse',
              tabBarIcon: ({ color, size }) => <TrendingUp size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="FrontDesk"
            component={FrontDeskScreen}
            options={{
              tabBarLabel: 'Front Desk',
              tabBarIcon: ({ color, size }) => <UserCheck size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="RoomRack"
            component={RoomRackScreen}
            options={{
              tabBarLabel: 'Rooms',
              tabBarIcon: ({ color, size }) => <Bed size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="MobilePos"
            component={MobilePosScreen}
            options={{
              tabBarLabel: 'POS',
              tabBarIcon: ({ color, size }) => <Utensils size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="Housekeeping"
            component={HousekeepingScreen}
            options={{
              tabBarLabel: 'Clean',
              tabBarIcon: ({ color, size }) => <Sparkles size={size} color={color} />,
            }}
          />
        </>
      )}

      {/* 2. Front Desk Staff Tabs */}
      {role === 'front_desk' && (
        <>
          <Tab.Screen
            name="FrontDesk"
            component={FrontDeskScreen}
            options={{
              tabBarLabel: 'Front Desk',
              tabBarIcon: ({ color, size }) => <UserCheck size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="RoomRack"
            component={RoomRackScreen}
            options={{
              tabBarLabel: 'Room Rack',
              tabBarIcon: ({ color, size }) => <Bed size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="Housekeeping"
            component={HousekeepingScreen}
            options={{
              tabBarLabel: 'Turnover',
              tabBarIcon: ({ color, size }) => <Sparkles size={size} color={color} />,
            }}
          />
        </>
      )}

      {/* 3. Restaurant / Dining Waiter Tabs */}
      {role === 'waiter' && (
        <>
          <Tab.Screen
            name="MobilePos"
            component={MobilePosScreen}
            options={{
              tabBarLabel: 'Punch Order',
              tabBarIcon: ({ color, size }) => <Utensils size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="KitchenKds"
            component={KitchenKdsScreen}
            options={{
              tabBarLabel: 'Live KDS',
              tabBarIcon: ({ color, size }) => <ChefHat size={size} color={color} />,
            }}
          />
        </>
      )}

      {/* 4. Head Chef (Kitchen) Tabs */}
      {role === 'chef' && (
        <Tab.Screen
          name="KitchenKds"
          component={KitchenKdsScreen}
          options={{
            tabBarLabel: 'KDS Queue',
            tabBarIcon: ({ color, size }) => <ChefHat size={size} color={color} />,
          }}
        />
      )}

      {/* 5. Housekeeping / Maintenance Tabs */}
      {role === 'housekeeping' && (
        <>
          <Tab.Screen
            name="Housekeeping"
            component={HousekeepingScreen}
            options={{
              tabBarLabel: 'Turnover',
              tabBarIcon: ({ color, size }) => <Sparkles size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="RoomRack"
            component={RoomRackScreen}
            options={{
              tabBarLabel: 'Room Grid',
              tabBarIcon: ({ color, size }) => <Bed size={size} color={color} />,
            }}
          />
        </>
      )}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen
              name="QuickCheckIn"
              component={QuickCheckInScreen}
              options={{ presentation: 'modal' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

