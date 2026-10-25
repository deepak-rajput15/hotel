import React, { useState } from 'react';
import {
  Hotel,
  TrendingUp,
  Bed,
  Users,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export default function ConsolidatedPortfolioView({
  organization,
  hotels,
  onSelectSpecificHotel,
}) {
  // Sample consolidated metrics aggregated across Hotel A + B + C
  const totalHotels = hotels.length;
  const portfolioRooms = 145;
  const portfolioOccupancy = '81.4%';
  const portfolioRevenue = '₹ 4,85,000';
  const portfolioArrivals = 42;

  // Property wise sample breakdown
  const propertyStats = [
    {
      code: 'HTL-1001',
      name: 'Apex Grand Palace',
      city: 'Mumbai',
      rooms: 48,
      occupancy: '82%',
      revenue: '₹ 1,42,800',
      activeModules: ['Front Office', 'Rooms Management'],
      status: 'ACTIVE',
    },
    {
      code: 'HTL-1002',
      name: 'Apex Sea Breeze Resort',
      city: 'Goa',
      rooms: 65,
      occupancy: '91%',
      revenue: '₹ 2,90,000',
      activeModules: ['Front Office', 'Rooms', 'Restaurant POS', 'Kitchen (KOT)'],
      status: 'ACTIVE',
    },
    {
      code: 'HTL-1003',
      name: 'Apex Express Inn',
      city: 'Delhi',
      rooms: 32,
      occupancy: '65%',
      revenue: '₹ 52,200',
      activeModules: ['Store / Inventory', 'Purchase & Vendors'],
      status: 'ACTIVE',
    },
  ];

  return (
    <div>
      {/* Portfolio Header Card */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          background: 'linear-gradient(135deg, var(--brand-50) 0%, var(--white) 100%)',
          border: '1px solid var(--brand-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-brand" style={{ fontWeight: '700' }}>
              {organization?.org_code || 'ORG-1001'}
            </span>
            <span className="badge badge-success">Consolidated Portfolio Active</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--t-900)' }}>
            {organization?.name || 'Apex Hospitality Group'} &bull; Group Portfolio
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--t-600)', marginTop: '2px' }}>
            Consolidated operational and financial reports aggregated across all <strong>{totalHotels} properties</strong>.
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '11px', color: 'var(--t-500)', textTransform: 'uppercase', fontWeight: '700' }}>
            Properties Under Management
          </span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--brand)', marginTop: '1px' }}>
            {totalHotels} Hotel Units
          </div>
        </div>
      </div>

      {/* Consolidated KPI Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--r-card)', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
              Total Group Revenue
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
              {portfolioRevenue}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--success)', fontWeight: '600' }}>
              Combined today across all hotels
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--r-card)', background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
            <Bed size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
              Combined Room Capacity
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
              {portfolioRooms} Rooms
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--t-600)' }}>
              Total keys in portfolio
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--r-card)', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891b2' }}>
            <ArrowUpRight size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
              Average Group Occupancy
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
              {portfolioOccupancy}
            </div>
            <div style={{ fontSize: '11.5px', color: '#0891b2', fontWeight: '600' }}>
              High occupancy in Goa & Mumbai
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--r-card)', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
              Total Expected Arrivals
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
              {portfolioArrivals} Check-ins
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--t-600)' }}>
              Today's front desk volume
            </div>
          </div>
        </div>
      </div>

      {/* Property-Wise Consolidated Performance Comparison Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-sub)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--t-900)' }}>
              Hotel Properties Breakdown & Comparison
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--t-500)' }}>
              Compare revenue, room capacity, and active subscribed modules across your properties.
            </p>
          </div>

          <span className="badge badge-brand">{hotels.length} Properties Tracked</span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '120px' }}>Hotel Code</th>
              <th>Property Name</th>
              <th>Location</th>
              <th>Keys</th>
              <th>Today's Occupancy</th>
              <th>Today's Revenue</th>
              <th>Subscribed Modules</th>
              <th style={{ textAlign: 'right', width: '150px' }}>Drilldown</th>
            </tr>
          </thead>
          <tbody>
            {hotels.map((h, idx) => {
              const stat = propertyStats.find(p => p.code === h.hotel_code) || {
                rooms: 40,
                occupancy: '75%',
                revenue: '₹ 1,00,000',
              };

              const activeSubs = (h.subscriptions || []).filter(s => s.status === 'ACTIVE');

              return (
                <tr key={h.id}>
                  <td>
                    <span className="badge badge-brand" style={{ fontFamily: 'monospace' }}>
                      {h.hotel_code}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: '700', color: 'var(--t-900)', fontSize: '14px' }}>
                      {h.name}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', color: 'var(--t-700)' }}>
                      <MapPin size={12} color="var(--t-500)" />
                      <span>{h.city || 'India'}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: '600', color: 'var(--t-800)' }}>{stat.rooms} Rooms</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '48px', height: '6px', background: 'var(--tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: stat.occupancy, height: '100%', background: 'var(--success)' }} />
                      </div>
                      <strong style={{ fontSize: '12.5px', color: 'var(--t-900)' }}>{stat.occupancy}</strong>
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--success)', fontSize: '13.5px' }}>{stat.revenue}</strong>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '300px' }}>
                      {activeSubs.map(s => (
                        <span key={s.id || s.module?.code} className="badge badge-success" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          <CheckCircle2 size={9} />
                          {s.module?.name || s.module?.code}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => onSelectSpecificHotel(h)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11.5px' }}
                    >
                      <span>Open Desk</span>
                      <ExternalLink size={11} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--surface-sub)', fontWeight: '700' }}>
              <td colSpan={3} style={{ color: 'var(--t-900)', padding: '14px 16px' }}>
                TOTAL (Consolidated Portfolio Across All Hotels)
              </td>
              <td style={{ color: 'var(--t-900)' }}>{portfolioRooms} Rooms</td>
              <td style={{ color: 'var(--t-900)' }}>{portfolioOccupancy} Avg</td>
              <td style={{ color: 'var(--success)', fontSize: '14px' }}>{portfolioRevenue}</td>
              <td colSpan={2} style={{ textAlign: 'right', color: 'var(--t-500)', fontSize: '12px' }}>
                Automated PostgreSQL Tenancy Scope
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
