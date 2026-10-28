import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { reportsApi } from '../../api';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Bed,
  Users,
  Boxes,
  FileText,
  Download,
  Printer,
  RefreshCw,
  CreditCard,
  ArrowUpRight,
  PieChart,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Building,
  Phone,
  Search,
} from 'lucide-react';

const RANGE_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'custom', label: 'Custom Range' },
];

export default function ReportsWorkspace() {
  const { currentHotel, user } = useAuth();

  const [activeReportTab, setActiveReportTab] = useState('financial'); // 'financial', 'occupancy', 'guest_ledger', 'inventory'
  const [rangePreset, setRangePreset] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState('ALL');
  const [ledgerPaymentFilter, setLedgerPaymentFilter] = useState('ALL');
  const [inventoryData, setInventoryData] = useState(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fetch overview report data
  const fetchOverview = async () => {
    try {
      setLoading(true);
      const params = { range: rangePreset };
      if (rangePreset === 'custom') {
        params.start_date = customStartDate;
        params.end_date = customEndDate;
      }
      const res = await reportsApi.getOverview(params);
      setOverviewData(res);
    } catch (err) {
      console.error('Failed to load reports overview:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch guest ledger
  const fetchGuestLedger = async () => {
    try {
      setLedgerLoading(true);
      const params = {
        range: rangePreset,
        status: ledgerStatusFilter,
        payment_status: ledgerPaymentFilter,
      };
      if (rangePreset === 'custom') {
        params.start_date = customStartDate;
        params.end_date = customEndDate;
      }
      const res = await reportsApi.getGuestLedger(params);
      setLedgerData(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load guest ledger:', err);
    } finally {
      setLedgerLoading(false);
    }
  };

  // Fetch inventory valuation
  const fetchInventory = async () => {
    try {
      setInventoryLoading(true);
      const res = await reportsApi.getInventoryReport();
      setInventoryData(res);
    } catch (err) {
      console.error('Failed to load inventory valuation report:', err);
    } finally {
      setInventoryLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [currentHotel?.id, rangePreset, customStartDate, customEndDate]);

  useEffect(() => {
    if (activeReportTab === 'guest_ledger') {
      fetchGuestLedger();
    } else if (activeReportTab === 'inventory') {
      fetchInventory();
    }
  }, [activeReportTab, rangePreset, ledgerStatusFilter, ledgerPaymentFilter]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params = { range: rangePreset };
      if (rangePreset === 'custom') {
        params.start_date = customStartDate;
        params.end_date = customEndDate;
      }
      await reportsApi.downloadExport(params);
    } catch (err) {
      alert('Failed to export CSV: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const kpis = overviewData?.kpis || {};
  const filter = overviewData?.filter || {};
  const scope = overviewData?.scope || {};

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt || 0);
  };

  return (
    <div className="reports-workspace" style={{ paddingBottom: '40px' }}>
      {/* 1. Filter & Actions Header */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-brand">
              {scope.is_consolidated ? 'Group Consolidated' : (currentHotel?.hotel_code || 'HTL')}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--t-500)' }}>
              Period: <strong>{filter.start_date}</strong> to <strong>{filter.end_date}</strong> ({filter.days_count || 1} Days)
            </span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
            Financial & Operational Night Audit Reports
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--t-600)', marginTop: '2px' }}>
            Daily revenue realization, RevPAR/ADR occupancy matrix, GST tax breakdown, and inventory valuation.
          </p>
        </div>

        {/* Action Buttons: Export & Print */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="btn btn-outline"
            style={{ fontSize: '12.5px', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="btn btn-outline"
            style={{ fontSize: '12.5px', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>

          <button
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ fontSize: '12.5px', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={14} />
            Print Audit Flash
          </button>
        </div>
      </div>

      {/* 2. Date Range Selector Bar */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          marginBottom: '20px',
          background: 'var(--surface-sub)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase', marginRight: '6px' }}>
            Date Range:
          </span>
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setRangePreset(opt.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--r-sm)',
                fontSize: '12.5px',
                fontWeight: rangePreset === opt.id ? '700' : '500',
                background: rangePreset === opt.id ? 'var(--brand)' : 'var(--white)',
                color: rangePreset === opt.id ? 'white' : 'var(--t-700)',
                border: '1px solid',
                borderColor: rangePreset === opt.id ? 'var(--brand)' : 'var(--border)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Custom Range Date Pickers */}
        {rangePreset === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--t-600)' }}>From:</span>
            <input
              type="date"
              className="form-input"
              style={{ padding: '4px 8px', fontSize: '12px', width: '130px' }}
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
            />
            <span style={{ fontSize: '12px', color: 'var(--t-600)' }}>To:</span>
            <input
              type="date"
              className="form-input"
              style={{ padding: '4px 8px', fontSize: '12px', width: '130px' }}
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* 3. Executive KPI Cards (Row 1: Financial & Occupancy) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <KpiCard
          label="Total Gross Billed"
          value={formatCurrency(kpis.total_revenue)}
          subtext={`Room + F&B + Extra - Dis`}
          icon={TrendingUp}
          color="var(--brand)"
          highlight
        />

        <KpiCard
          label="Realized Collections"
          value={formatCurrency(kpis.total_collections)}
          subtext="Actual cash & UPI deposited"
          icon={DollarSign}
          color="var(--success)"
        />

        <KpiCard
          label="Guest Outstanding"
          value={formatCurrency(kpis.outstanding_balances)}
          subtext="Unsettled ledger balances"
          icon={AlertTriangle}
          color={kpis.outstanding_balances > 0 ? '#ef4444' : 'var(--t-500)'}
        />

        <KpiCard
          label="Occupancy Rate"
          value={`${kpis.occupancy_rate_pct || 0}%`}
          subtext={`${kpis.occupied_rooms || 0} / ${kpis.total_rooms || 0} Rooms Occupied`}
          icon={Bed}
          color="#0284c7"
        />

        <KpiCard
          label="Average Daily Rate (ADR)"
          value={formatCurrency(kpis.adr)}
          subtext={`${kpis.total_nights_sold || 0} Room nights sold`}
          icon={BarChart3}
          color="#9333ea"
        />

        <KpiCard
          label="RevPAR"
          value={formatCurrency(kpis.revpar)}
          subtext="Revenue per available room"
          icon={ArrowUpRight}
          color="#d97706"
        />
      </div>

      {/* 4. Sub-Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '20px',
        }}
      >
        <TabButton
          active={activeReportTab === 'financial'}
          onClick={() => setActiveReportTab('financial')}
          icon={DollarSign}
          label="Revenue & Tax Financials"
        />
        <TabButton
          active={activeReportTab === 'occupancy'}
          onClick={() => setActiveReportTab('occupancy')}
          icon={Bed}
          label="Occupancy & Room Matrix"
        />
        <TabButton
          active={activeReportTab === 'guest_ledger'}
          onClick={() => setActiveReportTab('guest_ledger')}
          icon={FileText}
          label="Guest Ledger & Night Audit"
        />
        <TabButton
          active={activeReportTab === 'inventory'}
          onClick={() => setActiveReportTab('inventory')}
          icon={Boxes}
          label="Store Inventory Valuation"
        />
      </div>

      {/* 5. TAB 1: Financial & Revenue Report */}
      {activeReportTab === 'financial' && (
        <div>
          {/* Revenue Component Breakdown & Payment Tender Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            {/* Breakdown by Revenue Streams */}
            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--t-900)', marginBottom: '4px' }}>
                Revenue Stream Composition
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--t-500)', marginBottom: '16px' }}>
                Itemized distribution across room tariffs, dining F&B, and amenities.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <BreakdownRow
                  label="Room Tariff Charges"
                  amount={formatCurrency(kpis.total_room_charges)}
                  percentage={kpis.total_revenue > 0 ? round((kpis.total_room_charges / kpis.total_revenue) * 100) : 0}
                  color="var(--brand)"
                />
                <BreakdownRow
                  label="Food & Beverage / Restaurant"
                  amount={formatCurrency(
                    overviewData?.folio_breakdown?.find((f) => f.type === 'FOOD_BEVERAGE')?.amount || 0
                  )}
                  percentage={
                    overviewData?.folio_breakdown?.find((f) => f.type === 'FOOD_BEVERAGE')?.percentage || 0
                  }
                  color="#10b981"
                />
                <BreakdownRow
                  label="Extra Bedding & Misc Services"
                  amount={formatCurrency(kpis.total_extra_charges)}
                  percentage={kpis.total_revenue > 0 ? round((kpis.total_extra_charges / kpis.total_revenue) * 100) : 0}
                  color="#f59e0b"
                />
                <BreakdownRow
                  label="GST Output Tax Collected"
                  amount={formatCurrency(kpis.total_tax)}
                  percentage={kpis.total_revenue > 0 ? round((kpis.total_tax / kpis.total_revenue) * 100) : 0}
                  color="#06b6d4"
                />
                {kpis.total_discounts > 0 && (
                  <BreakdownRow
                    label="Discounts Allowed"
                    amount={`- ${formatCurrency(kpis.total_discounts)}`}
                    percentage={kpis.total_revenue > 0 ? round((kpis.total_discounts / kpis.total_revenue) * 100) : 0}
                    color="#ef4444"
                  />
                )}
              </div>

              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <strong style={{ fontSize: '14px', color: 'var(--t-900)' }}>Net Gross Revenue</strong>
                <strong style={{ fontSize: '18px', color: 'var(--brand)', fontWeight: '800' }}>
                  {formatCurrency(kpis.total_revenue)}
                </strong>
              </div>
            </div>

            {/* Payment Tender Methods Breakdown */}
            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--t-900)', marginBottom: '4px' }}>
                Payment Tender Realization
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--t-500)', marginBottom: '16px' }}>
                Deposits and settlements by payment instrument.
              </p>

              {overviewData?.payment_methods?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--t-500)' }}>
                  No collections recorded for this period.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {overviewData?.payment_methods?.map((pm) => (
                    <div key={pm.method}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', color: 'var(--t-800)' }}>
                          {pm.label} ({pm.count} txns)
                        </span>
                        <span style={{ fontWeight: '700', color: 'var(--t-900)' }}>
                          {formatCurrency(pm.amount)} ({pm.percentage}%)
                        </span>
                      </div>
                      <div style={{ height: '7px', background: 'var(--surface-sub)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, pm.percentage)}%`,
                            background:
                              pm.method === 'UPI_QR'
                                ? '#10b981'
                                : pm.method === 'CASH'
                                ? '#f59e0b'
                                : pm.method === 'CARD'
                                ? '#6366f1'
                                : '#0284c7',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div
                style={{
                  marginTop: '20px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <strong style={{ fontSize: '14px', color: 'var(--t-900)' }}>Total Settled Collections</strong>
                <strong style={{ fontSize: '18px', color: 'var(--success)', fontWeight: '800' }}>
                  {formatCurrency(kpis.total_collections)}
                </strong>
              </div>
            </div>
          </div>

          {/* Daily Trend Table */}
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--t-900)', marginBottom: '4px' }}>
              Day-by-Day Financial Trend ({filter.start_date} to {filter.end_date})
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--t-500)', marginBottom: '16px' }}>
              Daily billed revenue vs cash/UPI collections.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '10px 12px' }}>Date</th>
                    <th style={{ padding: '10px 12px' }}>Day</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Revenue Billed</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Collections</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Check-ins</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Check-outs</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewData?.daily_trends?.map((day) => (
                    <tr key={day.date} style={{ borderBottom: '1px solid var(--border-sub)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: '600' }}>{day.date}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--t-600)' }}>{day.day}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--brand)' }}>
                        {formatCurrency(day.revenue)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--success)' }}>
                        {formatCurrency(day.collections)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span className="badge badge-brand" style={{ fontSize: '10px', padding: '1px 6px' }}>
                          {day.arrivals}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span className="badge badge-inactive" style={{ fontSize: '10px', padding: '1px 6px' }}>
                          {day.departures}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 2: Occupancy & Room Matrix */}
      {activeReportTab === 'occupancy' && (
        <div>
          {/* Room Rack Status Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <StatusMetricCard label="Available Clean" count={kpis.available_rooms} total={kpis.total_rooms} color="#10b981" />
            <StatusMetricCard label="Occupied Stays" count={kpis.occupied_rooms} total={kpis.total_rooms} color="#6366f1" />
            <StatusMetricCard label="Needs Housekeeping" count={kpis.dirty_rooms} total={kpis.total_rooms} color="#f59e0b" />
            <StatusMetricCard label="Under Maintenance" count={kpis.maintenance_rooms} total={kpis.total_rooms} color="#ef4444" />
          </div>

          {/* Room Type Utilization Table */}
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--t-900)', marginBottom: '4px' }}>
              Room Category Performance & Rack Utilization
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--t-500)', marginBottom: '16px' }}>
              Category-wise room inventory, occupancy percentage, and base tariffs.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '10px 12px' }}>Room Type / Category</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Total Inventory</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Occupied</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Available</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Occupancy %</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Avg Tariff</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewData?.room_types?.map((rt) => (
                    <tr key={rt.room_type} style={{ borderBottom: '1px solid var(--border-sub)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--t-900)' }}>
                        {rt.room_type}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600' }}>{rt.total}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--brand)', fontWeight: '700' }}>
                        {rt.occupied}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--success)', fontWeight: '700' }}>
                        {rt.available}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <span
                          className={`badge ${
                            rt.occupancy_pct > 75
                              ? 'badge-success'
                              : rt.occupancy_pct > 40
                              ? 'badge-brand'
                              : 'badge-inactive'
                          }`}
                        >
                          {rt.occupancy_pct}%
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>
                        {formatCurrency(rt.avg_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 3: Guest Ledger & Night Audit Table */}
      {activeReportTab === 'guest_ledger' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--t-900)' }}>
                Guest Folio Ledger & Night Audit Registry
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--t-500)' }}>
                Itemized invoice records, advance deposits, and settlement status.
              </p>
            </div>

            {/* Ledger Filters */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                className="form-select"
                value={ledgerStatusFilter}
                onChange={(e) => setLedgerStatusFilter(e.target.value)}
                style={{ fontSize: '12px', padding: '6px 10px' }}
              >
                <option value="ALL">All Stay Statuses</option>
                <option value="CHECKED_IN">In-House (Checked In)</option>
                <option value="CHECKED_OUT">Settled (Checked Out)</option>
                <option value="RESERVED">Reserved</option>
              </select>

              <select
                className="form-select"
                value={ledgerPaymentFilter}
                onChange={(e) => setLedgerPaymentFilter(e.target.value)}
                style={{ fontSize: '12px', padding: '6px 10px' }}
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PAID">Fully Paid</option>
                <option value="PARTIAL">Partial Balance</option>
                <option value="PENDING">Pending Payment</option>
              </select>
            </div>
          </div>

          {ledgerLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--t-500)' }}>
              Loading guest ledger...
            </div>
          ) : ledgerData.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--t-500)' }}>
              No guest bookings match the selected period and criteria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '10px 10px' }}>Booking #</th>
                    <th style={{ padding: '10px 10px' }}>Guest Details</th>
                    <th style={{ padding: '10px 10px' }}>Room</th>
                    <th style={{ padding: '10px 10px' }}>Stay Dates</th>
                    <th style={{ padding: '10px 10px', textAlign: 'right' }}>Total Bill</th>
                    <th style={{ padding: '10px 10px', textAlign: 'right' }}>Paid</th>
                    <th style={{ padding: '10px 10px', textAlign: 'right' }}>Balance</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center' }}>Stay Status</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center' }}>Settlement</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-sub)' }}>
                      <td style={{ padding: '10px 10px', fontWeight: '700', color: 'var(--brand)' }}>
                        {b.booking_number}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--t-900)' }}>
                          {b.guest?.first_name} {b.guest?.last_name || ''}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--t-500)' }}>{b.guest?.phone}</div>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <span className="badge badge-brand" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          Room {b.room?.room_number}
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px' }}>
                          {b.room?.room_type}
                        </div>
                      </td>
                      <td style={{ padding: '10px 10px', fontSize: '11.5px', color: 'var(--t-700)' }}>
                        <div>In: {new Date(b.check_in_at).toLocaleDateString()}</div>
                        <div>Out: {new Date(b.expected_check_out_at).toLocaleDateString()}</div>
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: '700', color: 'var(--t-900)' }}>
                        {formatCurrency(b.grand_total)}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: '700', color: 'var(--success)' }}>
                        {formatCurrency(b.paid_amount)}
                      </td>
                      <td
                        style={{
                          padding: '10px 10px',
                          textAlign: 'right',
                          fontWeight: '800',
                          color: b.balance_amount > 0 ? '#ef4444' : 'var(--t-500)',
                        }}
                      >
                        {formatCurrency(b.balance_amount)}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <span
                          className={`badge ${
                            b.status === 'CHECKED_IN'
                              ? 'badge-brand'
                              : b.status === 'CHECKED_OUT'
                              ? 'badge-success'
                              : 'badge-inactive'
                          }`}
                          style={{ fontSize: '10.5px' }}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <span
                          className={`badge ${
                            b.payment_status === 'PAID'
                              ? 'badge-success'
                              : b.payment_status === 'PARTIAL'
                              ? 'badge-brand'
                              : 'badge-inactive'
                          }`}
                          style={{ fontSize: '10.5px' }}
                        >
                          {b.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 8. TAB 4: Store Inventory Valuation */}
      {activeReportTab === 'inventory' && (
        <div>
          {/* Inventory Valuation Header Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--brand)' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
                Total Store Asset Valuation
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--t-900)', marginTop: '4px' }}>
                {formatCurrency(inventoryData?.total_valuation || 0)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--t-500)', marginTop: '2px' }}>
                Based on current warehouse stock & rates
              </div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
                Low Stock Reorder Alerts
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444', marginTop: '4px' }}>
                {inventoryData?.total_low_stock_items || 0} Items
              </div>
              <div style={{ fontSize: '12px', color: 'var(--t-500)', marginTop: '2px' }}>
                Items below minimum safety threshold
              </div>
            </div>
          </div>

          {/* Category-wise Valuation Table */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--t-900)', marginBottom: '4px' }}>
              Category-Wise Stock Asset Valuation
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--t-500)', marginBottom: '16px' }}>
              Standard categories mapped from Book1.xlsx specification.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '10px 12px' }}>Inventory Category</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>SKU Count</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Asset Value</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Low Stock Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryData?.categories?.map((cat) => (
                    <tr key={cat.category} style={{ borderBottom: '1px solid var(--border-sub)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--t-900)' }}>
                        {cat.category}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600' }}>
                        {cat.item_count} items
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--brand)' }}>
                        {formatCurrency(cat.total_value)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {cat.low_stock_count > 0 ? (
                          <span className="badge badge-inactive" style={{ color: '#ef4444', background: '#fee2e2' }}>
                            {cat.low_stock_count} Low Stock
                          </span>
                        ) : (
                          <span className="badge badge-success">Sufficient</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Critical Low Stock Reorder List */}
          {inventoryData?.low_stock_items?.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#b91c1c', marginBottom: '4px' }}>
                Critical Stock Reorder Requirements
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--t-500)', marginBottom: '16px' }}>
                Items that need immediate Purchase Order generation.
              </p>

              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '8px 10px' }}>Item Code</th>
                      <th style={{ padding: '8px 10px' }}>Product Name</th>
                      <th style={{ padding: '8px 10px' }}>Category</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Current Stock</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Min Required</th>
                      <th style={{ padding: '8px 10px' }}>Assigned Vendor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryData?.low_stock_items?.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-sub)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: '700', color: 'var(--brand)' }}>
                          {item.product_code}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: '600' }}>{item.name}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--t-600)' }}>{item.category}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '800', color: '#ef4444' }}>
                          {item.current_stock} {item.unit}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--t-500)' }}>
                          {item.minimum_stock_qty} {item.unit}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '11.5px' }}>
                          {item.supplier?.firm_name || 'No vendor linked'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, subtext, icon: Icon, color, highlight }) {
  return (
    <div
      className="card"
      style={{
        padding: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        borderTop: highlight ? '3px solid var(--brand)' : '1px solid var(--border)',
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--r-sm)',
          background: 'var(--surface-sub)',
          border: '1px solid var(--border-sub)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {label}
        </div>
        <div style={{ fontSize: '19px', fontWeight: '800', color: 'var(--t-900)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subtext}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid var(--brand)' : '2px solid transparent',
        color: active ? 'var(--brand)' : 'var(--t-600)',
        fontWeight: active ? '700' : '500',
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '-1px',
        transition: 'all 0.15s ease',
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function BreakdownRow({ label, amount, percentage, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '3px' }}>
        <span style={{ color: 'var(--t-700)', fontWeight: '500' }}>{label}</span>
        <span style={{ fontWeight: '700', color: 'var(--t-900)' }}>
          {amount} ({percentage}%)
        </span>
      </div>
      <div style={{ height: '6px', background: 'var(--surface-sub)', borderRadius: '3px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, percentage)}%`,
            background: color,
            borderRadius: '3px',
          }}
        />
      </div>
    </div>
  );
}

function StatusMetricCard({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="card" style={{ padding: '14px', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
        <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--t-900)' }}>{count}</span>
        <span style={{ fontSize: '12px', color: 'var(--t-500)' }}>/ {total} rooms</span>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--t-600)', marginTop: '2px' }}>
        {pct}% of room inventory
      </div>
    </div>
  );
}

function round(val) {
  return Math.round(val * 10) / 10;
}

