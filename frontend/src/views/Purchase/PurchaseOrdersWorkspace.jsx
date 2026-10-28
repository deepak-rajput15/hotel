import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { purchaseApi, storeApi } from '../../api';
import {
  ShoppingCart,
  Plus,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  Printer,
  Package,
  Calendar,
  DollarSign,
  AlertTriangle,
  FileText,
  Trash2,
  X,
  ChevronRight,
  TrendingUp,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';

export default function PurchaseOrdersWorkspace() {
  const { currentHotel, user } = useAuth();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'grn_history'
  const [loading, setLoading] = useState(true);

  // 1. PO List & Summary
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({});
  const [statusFilter, setStatusFilter] = useState('ALL');

  // 2. Suppliers & Products Master for Forms
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  // 3. Modals
  const [showCreatePoModal, setShowCreatePoModal] = useState(false);
  const [showReceiveGrnModal, setShowReceiveGrnModal] = useState(null); // PO object
  const [showViewPoModal, setShowViewPoModal] = useState(null); // PO object
  const [submitting, setSubmitting] = useState(false);

  // 4. Create PO Form State
  const [poForm, setPoForm] = useState({
    supplier_id: '',
    expected_delivery_date: '',
    payment_terms: 'Net 30 Days',
    notes: '',
    items: [{ product_id: '', quantity: 10, unit_price: 100 }],
  });

  // 5. Receive GRN Form State
  const [grnForm, setGrnForm] = useState({
    delivery_challan_no: '',
    invoice_no: '',
    received_date: new Date().toISOString().slice(0, 10),
    remarks: '',
    items: [], // [{ purchase_order_item_id, quantity_received }]
  });

  // 6. GRN List
  const [grns, setGrns] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [poRes, suppRes, prodRes, grnRes] = await Promise.all([
        purchaseApi.getOrders({ status: statusFilter }),
        storeApi.getSuppliers(),
        storeApi.getProducts(),
        purchaseApi.getGrns(),
      ]);

      setOrders(poRes.orders?.data || []);
      setSummary(poRes.summary || {});
      setSuppliers(suppRes.suppliers || []);
      setProducts(prodRes.products || []);
      setGrns(grnRes.grns?.data || []);
    } catch (err) {
      console.error('Failed to load purchase data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentHotel?.id, statusFilter]);

  // Handle Dynamic Items in PO Form
  const handleAddItemRow = () => {
    setPoForm((prev) => ({
      ...prev,
      items: [...prev.items, { product_id: '', quantity: 10, unit_price: 100 }],
    }));
  };

  const handleRemoveItemRow = (index) => {
    setPoForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setPoForm((prev) => {
      const items = [...prev.items];
      items[index][field] = value;

      // Auto fill price from product
      if (field === 'product_id') {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          items[index].unit_price = Number(prod.rate) || 100;
        }
      }
      return { ...prev, items };
    });
  };

  // Submit Create PO
  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (poForm.items.length === 0 || !poForm.items[0].product_id) {
      alert('Please add at least one product to the purchase order.');
      return;
    }

    try {
      setSubmitting(true);
      await purchaseApi.createOrder(poForm);
      alert('Purchase Order created and issued to supplier!');
      setShowCreatePoModal(false);
      setPoForm({
        supplier_id: '',
        expected_delivery_date: '',
        payment_terms: 'Net 30 Days',
        notes: '',
        items: [{ product_id: '', quantity: 10, unit_price: 100 }],
      });
      fetchData();
    } catch (err) {
      alert('Failed to create PO: ' + (err.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Open Receive GRN Modal
  const openReceiveModal = (po) => {
    setShowReceiveGrnModal(po);
    setGrnForm({
      delivery_challan_no: '',
      invoice_no: '',
      received_date: new Date().toISOString().slice(0, 10),
      remarks: '',
      items: po.items.map((i) => ({
        purchase_order_item_id: i.id,
        product_name: i.product_name,
        unit: i.unit,
        ordered: Number(i.quantity_ordered),
        already_received: Number(i.quantity_received),
        quantity_received: Math.max(0, Number(i.quantity_ordered) - Number(i.quantity_received)),
      })),
    });
  };

  // Submit Receive Goods / GRN
  const handleReceiveGoods = async (e) => {
    e.preventDefault();
    if (!showReceiveGrnModal) return;

    try {
      setSubmitting(true);
      const payload = {
        delivery_challan_no: grnForm.delivery_challan_no,
        invoice_no: grnForm.invoice_no,
        received_date: grnForm.received_date,
        remarks: grnForm.remarks,
        items: grnForm.items
          .filter((i) => Number(i.quantity_received) > 0)
          .map((i) => ({
            purchase_order_item_id: i.purchase_order_item_id,
            quantity_received: Number(i.quantity_received),
          })),
      };

      if (payload.items.length === 0) {
        alert('Please specify quantity received for at least one item.');
        return;
      }

      const res = await purchaseApi.receiveGoods(showReceiveGrnModal.id, payload);
      alert(res.message || 'GRN generated and store stock updated successfully!');
      setShowReceiveGrnModal(null);
      fetchData();
    } catch (err) {
      alert('Failed to receive goods: ' + (err.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt || 0);
  };

  return (
    <div className="purchase-orders-workspace" style={{ paddingBottom: '50px' }}>
      {/* 1. Header */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          borderLeft: '4px solid #7c3aed',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-brand">{currentHotel?.hotel_code || 'HTL-1003'}</span>
            <span style={{ fontSize: '12px', color: 'var(--t-500)' }}>
              Procurement Desk &bull; <strong>{currentHotel?.name}</strong>
            </span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
            Purchase Orders & Goods Receipt Note (GRN)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--t-600)', marginTop: '2px' }}>
            Vendor procurement, Purchase Orders (PO), delivery verification, and automatic Store Stock synchronization.
          </p>
        </div>

        {/* Tab Buttons & Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--surface-sub)', padding: '3px', borderRadius: 'var(--r-sm)' }}>
            <button
              onClick={() => setActiveTab('orders')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--r-sm)',
                fontSize: '12.5px',
                fontWeight: activeTab === 'orders' ? '700' : '500',
                background: activeTab === 'orders' ? 'var(--white)' : 'transparent',
                color: activeTab === 'orders' ? 'var(--brand)' : 'var(--t-700)',
                border: activeTab === 'orders' ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
              }}
            >
              Purchase Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('grn_history')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--r-sm)',
                fontSize: '12.5px',
                fontWeight: activeTab === 'grn_history' ? '700' : '500',
                background: activeTab === 'grn_history' ? 'var(--white)' : 'transparent',
                color: activeTab === 'grn_history' ? 'var(--brand)' : 'var(--t-700)',
                border: activeTab === 'grn_history' ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
              }}
            >
              GRN History ({grns.length})
            </button>
          </div>

          <button
            onClick={() => setShowCreatePoModal(true)}
            className="btn btn-primary"
            style={{ fontSize: '12.5px', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            + New Purchase Order
          </button>
        </div>
      </div>

      {/* 2. Procurement Metric Counters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <MetricCard
          label="Total Purchase Orders"
          value={summary.total_pos || 0}
          subtext="Lifetime procurement count"
          icon={ShoppingCart}
          color="#7c3aed"
        />

        <MetricCard
          label="Procurement Value"
          value={formatCurrency(summary.total_procurement_value || 0)}
          subtext="Total goods purchased"
          icon={TrendingUp}
          color="var(--brand)"
          highlight
        />

        <MetricCard
          label="Pending Deliveries"
          value={summary.pending_deliveries || 0}
          subtext="POs awaiting vendor delivery"
          icon={Truck}
          color="#f59e0b"
        />

        <MetricCard
          label="Completed Orders"
          value={summary.completed_pos || 0}
          subtext="Fully received into store"
          icon={CheckCircle2}
          color="var(--success)"
        />
      </div>

      {/* 3. TAB 1: Purchase Orders Table */}
      {activeTab === 'orders' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--t-900)' }}>
                Purchase Orders Directory
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--t-500)' }}>
                Issued purchase orders, vendor delivery status, and GRN receipts.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ fontSize: '12px', padding: '6px 10px' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ISSUED">Issued (Pending Delivery)</option>
                <option value="PARTIALLY_RECEIVED">Partially Received</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {orders.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--t-500)', fontSize: '13px' }}>
              No purchase orders found matching the filter criteria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '10px 12px' }}>PO Number</th>
                    <th style={{ padding: '10px 12px' }}>Vendor / Supplier</th>
                    <th style={{ padding: '10px 12px' }}>Expected Date</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>SKU Count</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Amount</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((po) => (
                    <tr key={po.id} style={{ borderBottom: '1px solid var(--border-sub)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--brand)' }}>
                        {po.po_number}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <strong style={{ color: 'var(--t-900)' }}>{po.supplier?.firm_name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--t-500)' }}>
                          {po.supplier?.contact_person} &bull; {po.supplier?.mobile}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '12.5px', color: 'var(--t-700)' }}>
                        {po.expected_delivery_date || 'N/A'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {po.items?.length || 0} items
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: 'var(--t-900)' }}>
                        {formatCurrency(po.grand_total)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span
                          className={`badge ${
                            po.status === 'COMPLETED'
                              ? 'badge-success'
                              : po.status === 'PARTIALLY_RECEIVED'
                              ? 'badge-brand'
                              : 'badge-inactive'
                          }`}
                          style={{
                            background: po.status === 'ISSUED' ? '#fef3c7' : undefined,
                            color: po.status === 'ISSUED' ? '#92400e' : undefined,
                          }}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setShowViewPoModal(po)}
                            className="btn btn-outline"
                            style={{ padding: '4px 8px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '3px' }}
                          >
                            <FileText size={12} />
                            View
                          </button>
                          {po.status !== 'COMPLETED' && po.status !== 'CANCELLED' && (
                            <button
                              onClick={() => openReceiveModal(po)}
                              className="btn btn-primary"
                              style={{ padding: '4px 10px', fontSize: '11.5px', background: 'var(--success)', borderColor: 'var(--success)' }}
                            >
                              Receive (GRN)
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 2: GRN History */}
      {activeTab === 'grn_history' && (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--t-900)', marginBottom: '4px' }}>
            Goods Receipt Notes (GRN) Audit
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--t-500)', marginBottom: '16px' }}>
            Verified warehouse inward deliveries and stock additions.
          </p>

          {grns.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--t-500)', fontSize: '13px' }}>
              No Goods Receipt Notes generated yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '10px 12px' }}>GRN Number</th>
                    <th style={{ padding: '10px 12px' }}>Linked PO #</th>
                    <th style={{ padding: '10px 12px' }}>Vendor Firm</th>
                    <th style={{ padding: '10px 12px' }}>Delivery Challan / Invoice</th>
                    <th style={{ padding: '10px 12px' }}>Received Date</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Inward Value</th>
                  </tr>
                </thead>
                <tbody>
                  {grns.map((grn) => (
                    <tr key={grn.id} style={{ borderBottom: '1px solid var(--border-sub)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--brand)' }}>
                        {grn.grn_number}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: '600' }}>
                        {grn.purchase_order?.po_number || 'Direct Delivery'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{grn.supplier?.firm_name}</td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--t-700)' }}>
                        <div>DC: {grn.delivery_challan_no || 'N/A'}</div>
                        <div>Inv: {grn.invoice_no || 'N/A'}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>{grn.received_date}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: 'var(--success)' }}>
                        {formatCurrency(grn.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. MODAL: Create Purchase Order */}
      {showCreatePoModal && (
        <div className="modal-overlay" onClick={() => setShowCreatePoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                Issue New Purchase Order (PO)
              </h3>
              <button onClick={() => setShowCreatePoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePo}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">Vendor / Supplier *</label>
                  <select
                    required
                    className="form-select"
                    value={poForm.supplier_id}
                    onChange={(e) => setPoForm({ ...poForm, supplier_id: e.target.value })}
                  >
                    <option value="">-- Select Registered Vendor --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firm_name} ({s.contact_person})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Expected Delivery Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={poForm.expected_delivery_date}
                    onChange={(e) => setPoForm({ ...poForm, expected_delivery_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Dynamic Product Items */}
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Items to Order:
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {poForm.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr auto',
                      gap: '8px',
                      alignItems: 'center',
                      background: 'var(--surface-sub)',
                      padding: '8px 10px',
                      borderRadius: 'var(--r-sm)',
                    }}
                  >
                    <select
                      required
                      className="form-select"
                      value={item.product_id}
                      onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                      style={{ fontSize: '12px' }}
                    >
                      <option value="">-- Choose Item from Inventory --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.product_code} - {p.name} ({p.unit})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      required
                      placeholder="Qty"
                      className="form-input"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      style={{ fontSize: '12px' }}
                    />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="Rate ₹"
                      className="form-input"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                      style={{ fontSize: '12px' }}
                    />

                    {poForm.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddItemRow}
                className="btn btn-outline"
                style={{ fontSize: '11.5px', padding: '4px 10px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={13} /> Add Another Item
              </button>

              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Payment Terms</label>
                <input
                  type="text"
                  className="form-input"
                  value={poForm.payment_terms}
                  onChange={(e) => setPoForm({ ...poForm, payment_terms: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: '700' }}
              >
                {submitting ? 'Issuing PO...' : 'Issue Purchase Order to Supplier'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: Receive Goods / GRN */}
      {showReceiveGrnModal && (
        <div className="modal-overlay" onClick={() => setShowReceiveGrnModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                Receive Delivery (GRN) for {showReceiveGrnModal.po_number}
              </h3>
              <button onClick={() => setShowReceiveGrnModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReceiveGoods}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">Delivery Challan #</label>
                  <input
                    type="text"
                    placeholder="DC-1002"
                    className="form-input"
                    value={grnForm.delivery_challan_no}
                    onChange={(e) => setGrnForm({ ...grnForm, delivery_challan_no: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Vendor Invoice #</label>
                  <input
                    type="text"
                    placeholder="INV-5544"
                    className="form-input"
                    value={grnForm.invoice_no}
                    onChange={(e) => setGrnForm({ ...grnForm, invoice_no: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Received Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={grnForm.received_date}
                    onChange={(e) => setGrnForm({ ...grnForm, received_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Items Verification Table */}
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Verify Received Quantities:
              </label>

              <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                <table className="table" style={{ width: '100%', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th>Item</th>
                      <th style={{ textAlign: 'center' }}>Ordered</th>
                      <th style={{ textAlign: 'center' }}>Prev Received</th>
                      <th style={{ textAlign: 'right' }}>Receiving Now</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grnForm.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-sub)' }}>
                        <td style={{ fontWeight: '600' }}>{item.product_name}</td>
                        <td style={{ textAlign: 'center' }}>{item.ordered} {item.unit}</td>
                        <td style={{ textAlign: 'center', color: 'var(--t-500)' }}>{item.already_received} {item.unit}</td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity_received}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setGrnForm((prev) => {
                                const newItems = [...prev.items];
                                newItems[idx].quantity_received = val;
                                return { ...prev, items: newItems };
                              });
                            }}
                            className="form-input"
                            style={{ width: '85px', textAlign: 'right', padding: '3px 6px', fontSize: '12px' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: 'var(--r-sm)', marginBottom: '16px', fontSize: '12px', color: '#166534' }}>
                ✅ Receiving these items will <strong>automatically increment current stock</strong> in your store inventory!
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: '700', background: 'var(--success)', borderColor: 'var(--success)' }}
              >
                {submitting ? 'Generating GRN...' : 'Confirm Delivery & Update Store Stock'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: View / Print PO Document */}
      {showViewPoModal && (
        <div className="modal-overlay" onClick={() => setShowViewPoModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0 }}>{currentHotel?.name}</h3>
                <div style={{ fontSize: '12px', color: 'var(--t-500)' }}>Purchase Order Document</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: '15px', color: 'var(--brand)' }}>{showViewPoModal.po_number}</strong>
                <div style={{ fontSize: '11px', color: 'var(--t-500)' }}>Status: {showViewPoModal.status}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', marginBottom: '14px' }}>
              <div>
                <strong style={{ color: 'var(--t-500)', textTransform: 'uppercase' }}>Vendor Details:</strong>
                <div style={{ fontWeight: '700', color: 'var(--t-900)' }}>{showViewPoModal.supplier?.firm_name}</div>
                <div>{showViewPoModal.supplier?.contact_person} &bull; {showViewPoModal.supplier?.mobile}</div>
                <div>GSTIN: {showViewPoModal.supplier?.gst_no || 'N/A'}</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div>Delivery Date: <strong>{showViewPoModal.expected_delivery_date}</strong></div>
                <div>Payment Terms: <strong>{showViewPoModal.payment_terms}</strong></div>
              </div>
            </div>

            {/* Itemized Table */}
            <div style={{ overflowX: 'auto', marginBottom: '14px' }}>
              <table className="table" style={{ width: '100%', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th>Product</th>
                    <th style={{ textAlign: 'center' }}>Ordered</th>
                    <th style={{ textAlign: 'center' }}>Received</th>
                    <th style={{ textAlign: 'right' }}>Unit Rate</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {showViewPoModal.items?.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-sub)' }}>
                      <td style={{ fontWeight: '600' }}>{item.product_name}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity_ordered} {item.unit}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity_received} {item.unit}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700' }}>{formatCurrency(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ textAlign: 'right', borderTop: '1px solid var(--border)', paddingTop: '8px', fontSize: '14px', fontWeight: '800' }}>
              Grand Total: <span style={{ color: 'var(--brand)' }}>{formatCurrency(showViewPoModal.grand_total)}</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={() => window.print()}
                className="btn btn-outline"
                style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={14} /> Print PO
              </button>
              <button
                onClick={() => setShowViewPoModal(null)}
                className="btn btn-primary"
                style={{ flex: 1, padding: '8px', fontSize: '12px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, subtext, icon: Icon, color, highlight }) {
  return (
    <div
      className="card"
      style={{
        padding: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderLeft: highlight ? `4px solid ${color}` : undefined,
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--r-sm)',
          background: 'var(--surface-sub)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
        }}
      >
        <Icon size={18} />
      </div>
      <div>
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)', marginTop: '1px' }}>
          {value}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '1px' }}>
          {subtext}
        </div>
      </div>
    </div>
  );
}

