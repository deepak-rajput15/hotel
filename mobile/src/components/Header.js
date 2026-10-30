import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';
import {
  Hotel,
  ChevronDown,
  LogOut,
  X,
  Check,
  Building2,
  MapPin,
  Sparkles,
} from 'lucide-react-native';

export default function Header({ title, subtitle, showHotelPicker = true }) {
  const insets = useSafeAreaInsets();
  const { currentHotel, user, logout, selectHotel, role } = useAuth();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [hotelPickerVisible, setHotelPickerVisible] = useState(false);

  const accessibleHotels = user?.accessible_hotels || [];

  // User initials (e.g., "RS" for Rajesh Sharma)
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleTitle = () => {
    switch (role) {
      case 'owner': return 'Hotel Owner';
      case 'manager': return 'General Manager';
      case 'front_desk': return 'Front Desk Reception';
      case 'waiter': return 'Restaurant Staff';
      case 'chef': return 'Head Chef';
      case 'housekeeping': return 'Housekeeping';
      default: return 'Hotel Staff';
    }
  };

  return (
    <>
      <View style={[styles.container, { paddingTop: Math.max(insets.top + 8, 20) }]}>
        {/* Top Navbar Row */}
        <View style={styles.navRow}>
          {/* Brand & Property Selector */}
          <View style={styles.brandGroup}>
            <View style={styles.logoBadge}>
              <Hotel size={18} color="white" />
            </View>
            <View>
              <Text style={styles.brandName}>
                GrandStay<Text style={{ color: COLORS.brand }}>.</Text>
              </Text>

              {/* Property Dropdown Button */}
              <TouchableOpacity
                style={styles.propertyPill}
                onPress={() => setHotelPickerVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.propertyPillText} numberOfLines={1}>
                  {currentHotel?.name || 'GrandStay Property'}
                </Text>
                <View style={styles.codePill}>
                  <Text style={styles.codePillText}>{currentHotel?.hotel_code || 'HTL'}</Text>
                </View>
                {accessibleHotels.length > 1 && (
                  <ChevronDown size={13} color={COLORS.textSecondary} style={{ marginLeft: 2 }} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* User Profile Avatar */}
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => setProfileModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </View>
            <View style={styles.onlineDot} />
          </TouchableOpacity>
        </View>

        {/* Optional Page Subtitle / Section Heading */}
        {title && (
          <View style={styles.titleSection}>
            <Text style={styles.titleText}>{title}</Text>
            {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
          </View>
        )}
      </View>

      {/* Property Switcher Bottom Sheet / Modal */}
      <Modal
        visible={hotelPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHotelPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setHotelPickerVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Select Hotel Property</Text>
                <Text style={styles.sheetSubtitle}>
                  {user?.organization?.name || 'Apex Hospitality Group'} Portfolio
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setHotelPickerVisible(false)}
                style={styles.sheetCloseBtn}
              >
                <X size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.hotelList}>
              {accessibleHotels.map((h) => {
                const isSelected = currentHotel?.id === h.id;
                return (
                  <TouchableOpacity
                    key={h.id}
                    style={[styles.hotelItem, isSelected && styles.hotelItemActive]}
                    onPress={() => {
                      selectHotel(h);
                      setHotelPickerVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.hotelItemLeft}>
                      <View style={[styles.hotelIconBox, isSelected && styles.hotelIconBoxActive]}>
                        <Building2 size={18} color={isSelected ? 'white' : COLORS.brand} />
                      </View>
                      <View>
                        <Text style={[styles.hotelItemName, isSelected && styles.hotelItemNameActive]}>
                          {h.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <MapPin size={11} color={COLORS.textMuted} style={{ marginRight: 3 }} />
                          <Text style={styles.hotelItemCity}>{h.city || 'India'} • {h.hotel_code}</Text>
                        </View>
                      </View>
                    </View>

                    {isSelected && (
                      <View style={styles.checkCircle}>
                        <Check size={14} color="white" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* User Profile & Account Modal */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setProfileModalVisible(false)}
        >
          <View style={styles.profileCard} onStartShouldSetResponder={() => true}>
            {/* User Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatarLarge}>
                <Text style={styles.profileAvatarTextLarge}>{getInitials(user?.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{user?.name || 'Rajesh Sharma'}</Text>
                <Text style={styles.profileEmail}>{user?.email || 'owner@hotel.com'}</Text>
                <View style={styles.roleTag}>
                  <Sparkles size={11} color={COLORS.brand} style={{ marginRight: 4 }} />
                  <Text style={styles.roleTagText}>{getRoleTitle()}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <X size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Current Active Property Info */}
            <View style={styles.activePropertyBox}>
              <Text style={styles.activePropertyLabel}>Current Active Console:</Text>
              <Text style={styles.activePropertyName}>
                {currentHotel?.name} ({currentHotel?.hotel_code})
              </Text>
              <Text style={styles.activePropertyCity}>📍 {currentHotel?.city}, {currentHotel?.country || 'India'}</Text>
            </View>

            {/* Sign Out Action */}
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={() => {
                setProfileModalVisible(false);
                logout();
              }}
              activeOpacity={0.8}
            >
              <LogOut size={16} color={COLORS.danger} style={{ marginRight: 8 }} />
              <Text style={styles.signOutText}>Sign Out from Terminal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  propertyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSub,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 220,
  },
  propertyPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    maxWidth: 130,
  },
  codePill: {
    backgroundColor: COLORS.brandFaded,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 4,
  },
  codePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.brand,
  },
  avatarButton: {
    position: 'relative',
    marginLeft: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.brandFaded,
    borderWidth: 2,
    borderColor: COLORS.brandBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brand,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.clean,
    borderWidth: 2,
    borderColor: 'white',
  },
  titleSection: {
    marginTop: 14,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },

  // Modal / Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSub,
  },
  hotelList: {
    marginBottom: 10,
  },
  hotelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  hotelItemActive: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandFaded,
  },
  hotelItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hotelIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.brandFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  hotelIconBoxActive: {
    backgroundColor: COLORS.brand,
  },
  hotelItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  hotelItemNameActive: {
    color: COLORS.brand,
  },
  hotelItemCity: {
    fontSize: 11.5,
    color: COLORS.textMuted,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile Modal Card
  profileCard: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignSelf: 'center',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 16,
  },
  profileAvatarLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.brandFaded,
    borderWidth: 2,
    borderColor: COLORS.brandBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarTextLarge: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.brand,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  profileEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandFaded,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  roleTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.brand,
  },
  activePropertyBox: {
    backgroundColor: COLORS.surfaceSub,
    borderRadius: 10,
    padding: 12,
    marginVertical: 14,
  },
  activePropertyLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  activePropertyName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  activePropertyCity: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dangerBg,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  signOutText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.danger,
  },
});
