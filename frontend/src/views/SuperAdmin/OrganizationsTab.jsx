import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Mail,
  Phone,
  Hotel,
  CheckCircle2,
  MoreVertical,
  Calendar,
  ExternalLink,
} from 'lucide-react';

export default function OrganizationsTab({
  organizations,
  onOpenOnboardModal,
  onSelectOrgForHotels,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredOrgs = organizations.filter((org) => {
    const matchesSearch =
      org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.org_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.billing_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.users?.[0]?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || org.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Page Header with Action */}
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
            Hotel Organizations & Owners
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--t-500)', marginTop: '2px' }}>
            Directory of all registered hotel businesses and their associated properties.
          </p>
        </div>

        <button
          onClick={onOpenOnboardModal}
          className="btn btn-primary"
          style={{ padding: '9px 18px' }}
        >
          <Plus size={16} />
          <span>Onboard New Organization</span>
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
            placeholder="Search by organization name, code, owner, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--t-500)' }}>Status:</span>
          {['ALL', 'ACTIVE', 'SUSPENDED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className="btn btn-sm"
              style={{
                background: statusFilter === status ? 'var(--brand-50)' : 'var(--white)',
                borderColor: statusFilter === status ? 'var(--brand-200)' : 'var(--border)',
                color: statusFilter === status ? 'var(--brand)' : 'var(--t-600)',
                fontWeight: statusFilter === status ? '700' : '500',
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Full-Width Organizations Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>Org Code</th>
              <th>Organization / Business</th>
              <th>Primary Owner</th>
              <th>Contact Details</th>
              <th style={{ textAlign: 'center', width: '110px' }}>Properties</th>
              <th style={{ width: '100px' }}>Status</th>
              <th style={{ textAlign: 'right', width: '140px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrgs.length > 0 ? (
              filteredOrgs.map((org) => {
                const owner = org.users?.[0];
                const hotelCount = org.hotels_count || org.hotels?.length || 0;

                return (
                  <tr key={org.id}>
                    <td>
                      <span className="badge badge-brand" style={{ fontFamily: 'monospace' }}>
                        {org.org_code}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--t-900)', fontSize: '14px' }}>
                        {org.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--t-500)', marginTop: '2px' }}>
                        Registered on {new Date(org.created_at || Date.now()).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--t-800)' }}>
                        {owner?.name || 'Primary Owner'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--t-500)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Mail size={12} /> {owner?.email || org.billing_email}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12.5px', color: 'var(--t-700)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} color="var(--t-500)" /> {org.phone || '+91 9876543210'}
                      </div>
                      {org.tax_number && (
                        <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px' }}>
                          GST/Tax: {org.tax_number}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className="badge badge-pill"
                        style={{
                          background: 'var(--surface-sub)',
                          borderColor: 'var(--border-sub)',
                          color: 'var(--t-900)',
                          fontWeight: '700',
                          padding: '3px 10px',
                        }}
                      >
                        <Hotel size={12} /> {hotelCount} {hotelCount === 1 ? 'Hotel' : 'Hotels'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${org.status === 'ACTIVE' ? 'badge-success' : 'badge-inactive'}`}>
                        {org.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => onSelectOrgForHotels(org.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '12px' }}
                        title="View hotels owned by this organization"
                      >
                        <span>View Hotels</span>
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--t-500)' }}>
                  <Building2 size={36} color="var(--t-500)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <div style={{ fontSize: '14.5px', fontWeight: '600', color: 'var(--t-900)' }}>
                    No organizations found
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--t-500)', marginTop: '4px' }}>
                    Try adjusting your search criteria or onboard a new hotel owner.
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
