import React, { useState } from 'react';
import {
  Hotel,
  Plus,
  Search,
  MapPin,
  Building2,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export default function HotelsTab({
  hotels,
  organizations,
  onOpenHotelModal,
  onManageModules,
  filterOrgId,
  onClearOrgFilter,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState(filterOrgId || 'ALL');

  const filteredHotels = hotels.filter((h) => {
    const matchesSearch =
      h.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.hotel_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.organization?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOrg =
      selectedOrgFilter === 'ALL' || h.organization_id === selectedOrgFilter;

    return matchesSearch && matchesOrg;
  });

  return (
    <div>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
            Hotel Properties Directory
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--t-500)', marginTop: '2px' }}>
            All active operational hotels, their assigned organizations, and modular subscriptions.
          </p>
        </div>

        <button
          onClick={onOpenHotelModal}
          className="btn btn-primary"
          style={{ padding: '9px 18px' }}
        >
          <Plus size={16} />
          <span>Register New Hotel Property</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '280px', maxWidth: '420px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '12px',
              color: 'var(--t-500)',
            }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search by hotel name, code (HTL-XXXX), city, org..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>

        {/* Filter by Organization */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--t-500)' }}>Organization:</span>
          <select
            className="form-select"
            value={selectedOrgFilter}
            onChange={(e) => setSelectedOrgFilter(e.target.value)}
            style={{ width: '220px', padding: '7px 12px', fontSize: '13px' }}
          >
            <option value="ALL">All Organizations</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.org_code})
              </option>
            ))}
          </select>

          {selectedOrgFilter !== 'ALL' && (
            <button
              onClick={() => {
                setSelectedOrgFilter('ALL');
                if (onClearOrgFilter) onClearOrgFilter();
              }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11.5px' }}
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Full-Width Hotels Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>Hotel ID</th>
              <th>Property Name</th>
              <th>Parent Organization</th>
              <th>Location</th>
              <th>Subscribed Modules</th>
              <th style={{ width: '90px' }}>Status</th>
              <th style={{ textAlign: 'right', width: '160px' }}>Module Access</th>
            </tr>
          </thead>
          <tbody>
            {filteredHotels.length > 0 ? (
              filteredHotels.map((h) => {
                const activeSubs = (h.subscriptions || []).filter(
                  (s) => s.status === 'ACTIVE'
                );

                return (
                  <tr key={h.id}>
                    <td>
                      <span
                        className="badge badge-brand"
                        style={{ fontFamily: 'monospace', fontWeight: '700' }}
                      >
                        {h.hotel_code}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--t-900)', fontSize: '14px' }}>
                        {h.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--t-500)', marginTop: '2px' }}>
                        Slug: /{h.slug}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={13} color="var(--brand)" />
                        <span style={{ fontWeight: '600', color: 'var(--t-800)', fontSize: '13px' }}>
                          {h.organization?.name || 'Apex Hospitality Group'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px', marginLeft: '19px' }}>
                        {h.organization?.org_code || 'ORG-1001'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--t-700)' }}>
                        <MapPin size={13} color="var(--t-500)" />
                        <span>{h.city || 'Delhi'}, {h.state || 'India'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '360px' }}>
                        {activeSubs.length > 0 ? (
                          activeSubs.map((s) => (
                            <span
                              key={s.id || s.module?.code}
                              className="badge badge-success"
                              style={{ fontSize: '10.5px', padding: '2px 7px' }}
                            >
                              <CheckCircle2 size={10} />
                              {s.module?.name || s.module?.code}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--t-500)', fontStyle: 'italic' }}>
                            No modules enabled
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${h.status === 'ACTIVE' ? 'badge-success' : 'badge-inactive'}`}>
                        {h.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => onManageModules(h)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '12px', borderColor: 'var(--brand-200)', color: 'var(--brand)' }}
                        title="Configure module entitlements & toggles"
                      >
                        <ShieldCheck size={13} />
                        <span>Configure Modules</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--t-500)' }}>
                  <Hotel size={36} color="var(--t-500)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <div style={{ fontSize: '14.5px', fontWeight: '600', color: 'var(--t-900)' }}>
                    No hotels found
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--t-500)', marginTop: '4px' }}>
                    Try searching with another keyword or register a new hotel under an organization.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
