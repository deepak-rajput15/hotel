import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Header from '../../components/Header';
import { COLORS } from '../../theme/colors';
import { ChefHat, Clock, CheckCircle2, Flame, AlertCircle } from 'lucide-react-native';

export default function KitchenKdsScreen() {
  const { currentHotel } = useAuth();
  const [kots, setKots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const fetchKots = async () => {
    try {
      const res = await api.getKitchenKots();
      const kData = res.kots || res.data?.kots || res.data || res || [];
      setKots(Array.isArray(kData) ? kData : []);
    } catch (e) {
      console.warn('Error fetching KOTs', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKots();
    const interval = setInterval(fetchKots, 10000);
    return () => clearInterval(interval);
  }, [currentHotel]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchKots();
  };

  const handleUpdateKotStatus = async (kot, nextStatus) => {
    try {
      await api.updateKotStatus(kot.order_id, kot.kot_number, nextStatus);
      fetchKots();
    } catch (err) {
      Alert.alert('Status Error', err.message || 'Cannot update KOT status.');
    }
  };

  const handleUpdateItemStatus = async (itemId, nextStatus) => {
    try {
      await api.updateKitchenItemStatus(itemId, nextStatus);
      fetchKots();
    } catch (err) {
      Alert.alert('Status Error', err.message || 'Cannot update item status.');
    }
  };

  const filteredKots = kots.filter((k) => {
    if (filter === 'ALL') return k.overall_status !== 'SERVED';
    return k.overall_status === filter;
  });

  return (
    <View style={styles.container}>
      <Header
        title="Kitchen Display (KDS)"
        subtitle={`Live Kitchen Orders • ${currentHotel?.name || 'GrandStay'}`}
      />

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {['ALL', 'PENDING', 'PREPARING', 'READY'].map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.filterPill, filter === st && styles.filterPillActive]}
            onPress={() => setFilter(st)}
          >
            <Text style={[styles.filterPillText, filter === st && styles.filterPillTextActive]}>
              {st}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Syncing Kitchen Order Tickets...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />
          }
        >
          {filteredKots.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ChefHat size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Kitchen Queue Clear</Text>
              <Text style={styles.emptySub}>All active KOTs have been prepared and served.</Text>
            </View>
          ) : (
            filteredKots.map((kot) => {
              const isDelayed = kot.is_delayed;
              const isPending = kot.overall_status === 'PENDING';
              const isPreparing = kot.overall_status === 'PREPARING';
              const isReady = kot.overall_status === 'READY';

              return (
                <View
                  key={kot.group_key}
                  style={[styles.kotCard, isDelayed && styles.kotCardDelayed]}
                >
                  <View style={styles.kotTopRow}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.kotNumber}>KOT #{kot.kot_number}</Text>
                        <Text style={styles.orderNumber}>(Ord #{kot.order_number})</Text>
                      </View>
                      <Text style={styles.destinationText}>
                        {kot.order_type === 'DINE_IN'
                          ? `🍽️ Table ${kot.table_no || 'T-?'}`
                          : kot.order_type === 'ROOM_SERVICE'
                          ? `🏨 Room ${kot.room_number || 'Room'}`
                          : `🛍️ Takeaway: ${kot.customer_name || 'Guest'}`}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <View
                        style={[
                          styles.statusBadge,
                          isPending
                            ? { backgroundColor: COLORS.warningBg }
                            : isPreparing
                            ? { backgroundColor: COLORS.infoBg }
                            : { backgroundColor: COLORS.successBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isPending
                              ? { color: COLORS.warning }
                              : isPreparing
                              ? { color: COLORS.occupied }
                              : { color: COLORS.clean },
                          ]}
                        >
                          {kot.overall_status}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Clock
                          size={11}
                          color={isDelayed ? COLORS.danger : COLORS.textMuted}
                          style={{ marginRight: 3 }}
                        />
                        <Text
                          style={[
                            styles.elapsedText,
                            isDelayed && { color: COLORS.danger, fontWeight: '800' },
                          ]}
                        >
                          {kot.elapsed_minutes}m ago
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Items List */}
                  <View style={styles.itemsBox}>
                    {kot.items.map((it) => (
                      <View key={it.id} style={styles.itemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>
                            {it.food_type === 'NON_VEG' ? '🔴 ' : '🟢 '}
                            <Text style={{ fontWeight: '800' }}>{it.quantity}x</Text> {it.item_name}
                          </Text>
                          {it.special_notes ? (
                            <Text style={styles.itemNotes}>Note: {it.special_notes}</Text>
                          ) : null}
                        </View>

                        {/* Individual Item Status Toggle */}
                        <TouchableOpacity
                          style={[
                            styles.itemStatusPill,
                            it.status === 'READY'
                              ? { backgroundColor: COLORS.successBg }
                              : it.status === 'PREPARING'
                              ? { backgroundColor: COLORS.infoBg }
                              : { backgroundColor: COLORS.bg },
                          ]}
                          onPress={() => {
                            const next =
                              it.status === 'PENDING'
                                ? 'PREPARING'
                                : it.status === 'PREPARING'
                                ? 'READY'
                                : 'SERVED';
                            handleUpdateItemStatus(it.id, next);
                          }}
                        >
                          <Text style={styles.itemStatusPillText}>{it.status}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  {/* Batch KOT Action Button */}
                  <View style={styles.cardActions}>
                    {isPending && (
                      <TouchableOpacity
                        style={[styles.batchBtn, { backgroundColor: COLORS.occupied }]}
                        onPress={() => handleUpdateKotStatus(kot, 'PREPARING')}
                      >
                        <Flame size={14} color="white" style={{ marginRight: 4 }} />
                        <Text style={styles.batchBtnText}>Start Cooking (Preparing)</Text>
                      </TouchableOpacity>
                    )}

                    {isPreparing && (
                      <TouchableOpacity
                        style={[styles.batchBtn, { backgroundColor: COLORS.clean }]}
                        onPress={() => handleUpdateKotStatus(kot, 'READY')}
                      >
                        <CheckCircle2 size={14} color="white" style={{ marginRight: 4 }} />
                        <Text style={styles.batchBtnText}>Mark Entire KOT Ready</Text>
                      </TouchableOpacity>
                    )}

                    {isReady && (
                      <TouchableOpacity
                        style={[styles.batchBtn, { backgroundColor: COLORS.textPrimary }]}
                        onPress={() => handleUpdateKotStatus(kot, 'SERVED')}
                      >
                        <CheckCircle2 size={14} color="white" style={{ marginRight: 4 }} />
                        <Text style={styles.batchBtnText}>Mark Served / Dispatched</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterPillTextActive: {
    color: 'white',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  kotCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  kotCardDelayed: {
    borderColor: COLORS.danger,
    borderWidth: 1.5,
  },
  kotTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  kotNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  orderNumber: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  destinationText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brand,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  elapsedText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  itemsBox: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  itemName: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  itemNotes: {
    fontSize: 11,
    color: COLORS.warning,
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  cardActions: {
    marginTop: 10,
  },
  batchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  batchBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },
});
