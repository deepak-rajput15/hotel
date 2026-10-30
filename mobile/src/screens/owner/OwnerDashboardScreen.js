import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Header from '../../components/Header';
import ShiftRegisterModal from '../../components/ShiftRegisterModal';
import { COLORS } from '../../theme/colors';
import {
  TrendingUp,
  Users,
  Bed,
  IndianRupee,
  Clock,
  ArrowRight,
  UserPlus,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Building2,
  Layers,
} from 'lucide-react-native';

export default function OwnerDashboardScreen({ navigation }) {
  const { currentHotel, user, selectHotel } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState(null);
  const [shiftData, setShiftData] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);

  const accessibleHotels = user?.accessible_hotels || [];

  const fetchData = async () => {
    try {
      const [ovRes, shiftRes] = await Promise.allSettled([
        api.getFrontOfficeOverview(),
        api.getCurrentShift('FRONT_DESK'),
      ]);

      if (ovRes.status === 'fulfilled') {
        const data = ovRes.value?.data || ovRes.value;
        setOverview(data);
      }
      if (shiftRes.status === 'fulfilled') {
        const sData = shiftRes.value?.data || shiftRes.value;
        setShiftData(sData);
      } else {
        setShiftData(null);
      }
    } catch (e) {
      console.warn('Failed to load owner dashboard', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentHotel]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userName = user?.name ? user.name.split(' ')[0] : 'Owner';

  // Parse metrics reliably from backend API structure
  const metrics = overview?.metrics || overview?.data?.metrics || overview?.data || overview || {};
  const todayCollections = Number(metrics.today_collections || 0);
  const occupancyRate = typeof metrics.occupancy_rate === 'string'
    ? metrics.occupancy_rate
    : `${metrics.occupancy_rate || 0}%`;
  const totalRooms = metrics.total_rooms || 0;
  const occupiedRooms = metrics.occupied_rooms || 0;
  const inHouseGuests = metrics.in_house_guests || 0;
  const availableRooms = metrics.available_rooms ?? metrics.available_clean_rooms ?? 0;
  const dirtyRooms = metrics.dirty_rooms ?? metrics.needs_cleaning_rooms ?? 0;
  const maintenanceRooms = metrics.maintenance_rooms ?? 0;
  const roomTypes = metrics.room_types || [];

  const activeShift = shiftData?.shift;
  const isShiftOpen = !!activeShift;

  return (
    <View style={styles.container}>
      <Header />

      {/* Portfolio Properties Horizontal Bar */}
      {accessibleHotels.length > 0 && (
        <View style={styles.portfolioBar}>
          <Text style={styles.portfolioTitle}>PORTFOLIO PROPERTIES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hotelPillsScroll}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {accessibleHotels.map((h) => {
                const isSelected = currentHotel?.id === h.id || currentHotel?.hotel_code === h.hotel_code;
                return (
                  <TouchableOpacity
                    key={h.id}
                    style={[styles.propPill, isSelected && styles.propPillActive]}
                    onPress={() => selectHotel(h)}
                    activeOpacity={0.7}
                  >
                    <Building2
                      size={13}
                      color={isSelected ? 'white' : COLORS.brand}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.propPillText, isSelected && styles.propPillTextActive]}>
                      {h.name}
                    </Text>
                    <View
                      style={[
                        styles.propPillCode,
                        isSelected && { backgroundColor: 'rgba(255,255,255,0.2)' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.propPillCodeText,
                          isSelected && { color: 'white' },
                        ]}
                      >
                        {h.hotel_code}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Syncing live property console...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />
          }
        >
          {/* Executive Hero Briefing Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View>
                <Text style={styles.greetingText}>
                  {getGreeting()}, {userName} 👋
                </Text>
                <Text style={styles.hotelScopeText}>
                  {currentHotel?.name} ({currentHotel?.hotel_code})
                </Text>
              </View>
              <View style={styles.liveBadge}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveBadgeText}>OPERATIONS LIVE</Text>
              </View>
            </View>

            {/* Primary Revenue Display */}
            <View style={styles.revenueBox}>
              <Text style={styles.revenueLabel}>Today's Total Collections</Text>
              <View style={styles.revenueRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <Text style={styles.revenueAmount}>
                  {todayCollections.toLocaleString('en-IN')}
                </Text>
              </View>
              <Text style={styles.revenueSub}>Advance Deposits + Settle Payments</Text>
            </View>

            {/* Secondary KPI Triad */}
            <View style={styles.kpiTriad}>
              <View style={styles.kpiCol}>
                <Text style={styles.kpiValue}>{occupancyRate}</Text>
                <Text style={styles.kpiTitle}>Occupancy</Text>
                <Text style={styles.kpiMeta}>
                  {occupiedRooms}/{totalRooms} Rooms
                </Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpiCol}>
                <Text style={[styles.kpiValue, { color: COLORS.brand }]}>
                  {inHouseGuests}
                </Text>
                <Text style={styles.kpiTitle}>In-House</Text>
                <Text style={styles.kpiMeta}>Active Stays</Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpiCol}>
                <Text style={[styles.kpiValue, { color: COLORS.clean }]}>
                  {availableRooms}
                </Text>
                <Text style={styles.kpiTitle}>Clean Ready</Text>
                <Text style={styles.kpiMeta}>Available</Text>
              </View>
            </View>
          </View>

          {/* Quick Operational Actions Bar */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={() => navigation.navigate('QuickCheckIn', { onCheckInSuccess: fetchData })}
              activeOpacity={0.8}
            >
              <UserPlus size={16} color="white" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnPrimaryText}>+ Walk-In Check-In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={() => navigation.navigate('RoomRack')}
              activeOpacity={0.8}
            >
              <Bed size={15} color={COLORS.textPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnSecondaryText}>Room Rack</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnIcon}
              onPress={onRefresh}
              activeOpacity={0.8}
            >
              <RefreshCw size={15} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Front Desk Cash Drawer Status */}
          <TouchableOpacity
            style={styles.sectionCard}
            onPress={() => setShowShiftModal(true)}
            activeOpacity={0.85}
          >
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Clock
                  size={16}
                  color={isShiftOpen ? COLORS.clean : COLORS.warning}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.sectionTitle}>Front Desk Cash Drawer</Text>
              </View>
              <View
                style={[
                  styles.shiftStatusPill,
                  isShiftOpen ? { backgroundColor: COLORS.successBg } : { backgroundColor: COLORS.dangerBg },
                ]}
              >
                <Text
                  style={[
                    styles.shiftStatusText,
                    isShiftOpen ? { color: COLORS.clean } : { color: COLORS.danger },
                  ]}
                >
                  {isShiftOpen ? 'SHIFT ACTIVE' : 'NO ACTIVE SHIFT'}
                </Text>
              </View>
            </View>

            {isShiftOpen ? (
              <View style={styles.shiftCardContent}>
                <View style={styles.shiftDataRow}>
                  <Text style={styles.shiftDataLabel}>Current Cashier:</Text>
                  <Text style={styles.shiftDataValue}>
                    {activeShift.user?.name || activeShift.opened_by?.name || 'Staff In-Charge'}
                  </Text>
                </View>
                <View style={styles.shiftDataRow}>
                  <Text style={styles.shiftDataLabel}>Opening Float Balance:</Text>
                  <Text style={styles.shiftDataValue}>
                    ₹{Number(activeShift.opening_float || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={[styles.shiftDataRow, styles.shiftTotalRow]}>
                  <Text style={styles.shiftTotalLabel}>Physical Drawer Cash:</Text>
                  <Text style={styles.shiftTotalValue}>
                    ₹{Number(activeShift.expected_cash || activeShift.cash_balance || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <Text style={styles.tapToManageText}>Tap to manage cash movements or close shift →</Text>
              </View>
            ) : (
              <View style={{ paddingVertical: 4 }}>
                <Text style={styles.emptyNote}>
                  No cashier has an active shift open for this property currently.
                </Text>
                <Text style={styles.tapToManageText}>Tap here to open shift register →</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Room Turnover Distribution */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Sparkles size={16} color={COLORS.brand} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Room Inventory Breakdown</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('RoomRack')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
              >
                <Text style={styles.viewGridText}>View Grid</Text>
                <ArrowRight size={13} color={COLORS.brand} />
              </TouchableOpacity>
            </View>

            <View style={styles.turnoverGrid}>
              <View style={[styles.turnoverBox, { backgroundColor: COLORS.successBg, borderColor: COLORS.successBorder }]}>
                <Text style={[styles.turnoverCount, { color: COLORS.clean }]}>
                  {availableRooms}
                </Text>
                <Text style={[styles.turnoverLabel, { color: COLORS.clean }]}>Clean Ready</Text>
              </View>

              <View style={[styles.turnoverBox, { backgroundColor: COLORS.infoBg, borderColor: COLORS.infoBorder }]}>
                <Text style={[styles.turnoverCount, { color: COLORS.occupied }]}>
                  {occupiedRooms}
                </Text>
                <Text style={[styles.turnoverLabel, { color: COLORS.occupied }]}>Occupied</Text>
              </View>

              <View style={[styles.turnoverBox, { backgroundColor: COLORS.warningBg, borderColor: COLORS.warningBorder }]}>
                <Text style={[styles.turnoverCount, { color: COLORS.warning }]}>
                  {dirtyRooms}
                </Text>
                <Text style={[styles.turnoverLabel, { color: COLORS.warning }]}>Turnover Due</Text>
              </View>

              <View style={[styles.turnoverBox, { backgroundColor: COLORS.dangerBg, borderColor: COLORS.dangerBorder }]}>
                <Text style={[styles.turnoverCount, { color: COLORS.danger }]}>
                  {maintenanceRooms}
                </Text>
                <Text style={[styles.turnoverLabel, { color: COLORS.danger }]}>Maintenance</Text>
              </View>
            </View>
          </View>

          {/* Room Category Distribution (Web Parity) */}
          {roomTypes.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Layers size={16} color={COLORS.brand} style={{ marginRight: 6 }} />
                  <Text style={styles.sectionTitle}>Room Category Distribution</Text>
                </View>
              </View>

              <View style={styles.roomTypesList}>
                {roomTypes.map((rt, idx) => {
                  const readyPct = rt.total > 0 ? Math.round((rt.available / rt.total) * 100) : 0;
                  return (
                    <View key={rt.room_type || idx} style={styles.roomTypeRow}>
                      <View style={styles.roomTypeHeaderRow}>
                        <Text style={styles.roomTypeName}>{rt.room_type}</Text>
                        <Text style={styles.roomTypeStat}>
                          <Text style={{ color: COLORS.clean, fontWeight: '800' }}>{rt.available} Ready</Text> / {rt.total} Total
                        </Text>
                      </View>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${Math.max(readyPct, 8)}%`,
                              backgroundColor: readyPct > 0 ? COLORS.clean : COLORS.textMuted,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Shift Register Management Modal */}
      <ShiftRegisterModal
        visible={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        defaultDepartment="FRONT_DESK"
        onShiftUpdated={fetchData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  portfolioBar: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  portfolioTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  hotelPillsScroll: {
    flexDirection: 'row',
  },
  propPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  propPillActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  propPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  propPillTextActive: {
    color: 'white',
  },
  propPillCode: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  propPillCodeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 10,
    fontSize: 13,
    fontWeight: '500',
  },

  // Hero Card Styles
  heroCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  hotelScopeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.clean,
    marginRight: 5,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.clean,
    letterSpacing: 0.4,
  },

  // Revenue Box
  revenueBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  revenueLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.clean,
    marginRight: 4,
  },
  revenueAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  revenueSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Secondary KPI Triad
  kpiTriad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  kpiCol: {
    flex: 1,
    alignItems: 'center',
  },
  kpiDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  kpiMeta: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  actionBtnPrimary: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brand,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBtnPrimaryText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },
  actionBtnSecondary: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnSecondaryText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section Card
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  shiftStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  shiftStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  shiftCardContent: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 12,
  },
  shiftDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  shiftDataLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  shiftDataValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  shiftTotalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginTop: 4,
  },
  shiftTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  shiftTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.clean,
  },
  emptyNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  tapToManageText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brand,
    marginTop: 6,
  },
  viewGridText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brand,
  },

  // Turnover Grid
  turnoverGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  turnoverBox: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  turnoverCount: {
    fontSize: 18,
    fontWeight: '900',
  },
  turnoverLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },

  // Room Types
  roomTypesList: {
    gap: 10,
  },
  roomTypeRow: {
    paddingVertical: 2,
  },
  roomTypeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  roomTypeName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  roomTypeStat: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
