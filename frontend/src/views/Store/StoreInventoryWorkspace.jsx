import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storeApi } from '../../api';
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Package,
  Layers,
  Truck,
  RotateCcw,
  Edit2,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Building,
  Phone,
  FileText,
  DollarSign,
  AlertCircle,
  X,
} from 'lucide-react';

const STANDARD_CATEGORIES = [
  'Grocery & Grains',
  'Vegetables & Fruits',
  'Dairy Products',
  'Meat & Seafood',
  'Beverages',
  'Spices & Masalas',
  'Crockery',
  'Other / Restaurant Supplies',
];

export default function StoreInventoryWorkspace() {
  const { currentHotel } = useAuth();

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'suppliers'
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [metrics, setMetrics] = useState({
    total_products: 0,
    low_stock_count: 0,
    total_stock_value: 0,
    active_suppliers: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [expiryFilter, setExpiryFilter] = useState('ALL'); // 'ALL', 'EXPIRED', 'EXPIRING_SOON'

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(null); // product object
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(null); // product object for inspecting all batches
  const [editingBatchNo, setEditingBatchNo] = useState(null);
  const [editingBatchExpiry, setEditingBatchExpiry] = useState('');
  const [savingBatch, setSavingBatch] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  // Form states
  const [productForm, setProductForm] = useState({
    category: 'Grocery & Grains',
    name: '',
    product_code: '',
    description: '',
    unit: 'Kg',
    expiry_period: '',
    rate: '',
    gst_percentage: '5.00',
    opening_stock: '0',
    minimum_stock_qty: '10',
    status: 'Active',
    supplier_id: '',
  });

  const [stockForm, setStockForm] = useState({
    type: 'ADD',
    quantity: '',
    reason: 'Vendor Delivery GRN',
    notes: '',
    batch_no: '',
    expiry_period: '',
  });

  const [supplierForm, setSupplierForm] = useState({
    firm_name: '',
    address: '',
    contact_person: '',
    mobile: '',
    email: '',
    gst_no: '',
    pan_no: '',
    aadhar_no: '',
    status: 'Active',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  useEffect(() => {
    fetchData();
  }, [categoryFilter, lowStockOnly, expiryFilter, currentHotel?.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const params = {};
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (lowStockOnly) params.low_stock = true;
      if (expiryFilter !== 'ALL') params.expiry_status = expiryFilter;
      if (searchTerm) params.search = searchTerm;

      const [prodRes, suppRes] = await Promise.all([
        storeApi.getProducts(params),
        storeApi.getSuppliers(),
      ]);

      if (prodRes.success) {
        setProducts(prodRes.products || []);
        if (prodRes.metrics) setMetrics(prodRes.metrics);
      }
      if (suppRes.success) {
        setSuppliers(suppRes.suppliers || []);
      }
    } catch (err) {
      console.error('Failed to load store data:', err);
      setErrorMsg(err.data?.message || err.message || 'Could not load store data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      if (editProduct) {
        const res = await storeApi.updateProduct(editProduct.id, productForm);
        if (res.success) {
          setSuccessBanner(`Product '${productForm.name}' updated successfully!`);
          setShowAddProductModal(false);
          setEditProduct(null);
          fetchData();
        }
      } else {
        const res = await storeApi.createProduct(productForm);
        if (res.success) {
          setSuccessBanner(`Product '${productForm.name}' created with code ${productForm.product_code}!`);
          setShowAddProductModal(false);
          fetchData();
        }
      }
    } catch (err) {
      setErrorMsg(err.data?.message || err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!showStockModal) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await storeApi.adjustStock(showStockModal.id, stockForm);
      if (res.success) {
        setSuccessBanner(res.message);
        setShowStockModal(null);
        setStockForm({
          type: 'ADD',
          quantity: '',
          reason: 'Vendor Delivery GRN',
          notes: '',
        });
        fetchData();
      }
    } catch (err) {
      setErrorMsg(err.data?.message || err.message || 'Stock adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await storeApi.createSupplier(supplierForm);
      if (res.success) {
        setSuccessBanner(`Supplier '${supplierForm.firm_name}' added successfully!`);
        setShowSupplierModal(false);
        setSupplierForm({
          firm_name: '',
          address: '',
          contact_person: '',
          mobile: '',
          email: '',
          gst_no: '',
          pan_no: '',
          aadhar_no: '',
          status: 'Active',
        });
        fetchData();
      }
    } catch (err) {
      setErrorMsg(err.data?.message || err.message || 'Failed to add supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBatchExpiry = async (productId, batchNo) => {
    try {
      setSavingBatch(true);
      setErrorMsg('');
      const res = await storeApi.updateBatch(productId, batchNo, { expiry_period: editingBatchExpiry });
      if (res.success) {
        setSuccessBanner(`Batch '${batchNo}' expiry updated to ${editingBatchExpiry}!`);
        setEditingBatchNo(null);
        if (showBatchModal && showBatchModal.id === productId) {
          setShowBatchModal(res.product);
        }
        fetchData();
      }
    } catch (err) {
      setErrorMsg(err.data?.message || err.message || 'Failed to update batch expiry');
    } finally {
      setSavingBatch(false);
    }
  };

  const openEditModal = (p) => {
    setEditProduct(p);
    setProductForm({
      category: p.category,
      name: p.name,
      product_code: p.product_code,
      description: p.description || '',
      unit: p.unit,
      expiry_period: p.expiry_period || '',
      rate: p.rate,
      gst_percentage: p.gst_percentage,
      opening_stock: p.opening_stock,
      minimum_stock_qty: p.minimum_stock_qty,
      status: p.status,
      supplier_id: p.supplier_id || '',
    });
    setShowAddProductModal(true);
  };

  return (
    <div>
      {/* Top Notification / Success Banner */}
      {successBanner && (
        <div
          className="card"
          style={{
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#065f46', fontSize: '13px', fontWeight: '600' }}>
            <CheckCircle2 size={18} color="var(--success)" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner('')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#065f46', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
        <div
          className="card"
          onClick={() => { setCategoryFilter('ALL'); setExpiryFilter('ALL'); setLowStockOnly(false); }}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}
          title="Reset all filters and view all products"
        >
          <div style={{ width: '38px', height: '38px', borderRadius: 'var(--r-card)', background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', flexShrink: 0 }}>
            <Package size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
              Total Products
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
              {metrics.total_products}
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--t-500)' }}>Active in catalog</div>
          </div>
        </div>

        <div
          className="card"
          onClick={() => { setLowStockOnly(!lowStockOnly); if (!lowStockOnly) setExpiryFilter('ALL'); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            border: lowStockOnly ? '2px solid #ef4444' : undefined,
            background: metrics.low_stock_count > 0 ? '#fef2f2' : 'white',
          }}
        >
          <div style={{ width: '38px', height: '38px', borderRadius: 'var(--r-card)', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase' }}>
              Low Stock Alerts
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#dc2626' }}>
              {metrics.low_stock_count} Items
            </div>
            <div style={{ fontSize: '10.5px', color: '#b91c1c' }}>
              {lowStockOnly ? 'Filtering active (reset)' : 'Click to filter'}
            </div>
          </div>
        </div>

        {/* Expired Stock Card (Red Highlight Alert) */}
        <div
          className="card"
          onClick={() => {
            const next = expiryFilter === 'EXPIRED' ? 'ALL' : 'EXPIRED';
            setExpiryFilter(next);
            if (next !== 'ALL') setLowStockOnly(false);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            border: expiryFilter === 'EXPIRED' ? '2px solid #dc2626' : undefined,
            background: (metrics.expired_count || 0) > 0 ? '#fef2f2' : 'white',
          }}
          title="Click to filter products that are expired or have expired stock batches"
        >
          <div style={{ width: '38px', height: '38px', borderRadius: 'var(--r-card)', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>
            <AlertCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase' }}>
              Expired Stock
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#dc2626' }}>
              {metrics.expired_count || 0} Items
            </div>
            <div style={{ fontSize: '10.5px', color: '#b91c1c' }}>
              {expiryFilter === 'EXPIRED' ? 'Filtering expired (reset)' : 'Immediate discard alert'}
            </div>
          </div>
        </div>

        {/* Expiring Soon Card (Yellow Highlight Warning) */}
        <div
          className="card"
          onClick={() => {
            const next = expiryFilter === 'EXPIRING_SOON' ? 'ALL' : 'EXPIRING_SOON';
            setExpiryFilter(next);
            if (next !== 'ALL') setLowStockOnly(false);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            border: expiryFilter === 'EXPIRING_SOON' ? '2px solid #d97706' : undefined,
            background: (metrics.expiring_soon_count || 0) > 0 ? '#fffdf0' : 'white',
          }}
          title="Click to filter products due to expire within 1 month"
        >
          <div style={{ width: '38px', height: '38px', borderRadius: 'var(--r-card)', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0 }}>
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#92400e', textTransform: 'uppercase' }}>
              Due in 1 Month
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#d97706' }}>
              {metrics.expiring_soon_count || 0} Items
            </div>
            <div style={{ fontSize: '10.5px', color: '#b45309' }}>
              {expiryFilter === 'EXPIRING_SOON' ? 'Filtering active (reset)' : 'Priority clearance stock'}
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: 'var(--r-card)', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
              Stock Inventory Value
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
              ₹ {metrics.total_stock_value?.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--t-500)' }}>Valued at purchase rate</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: 'var(--r-card)', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', flexShrink: 0 }}>
            <Truck size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
              Registered Suppliers
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
              {metrics.active_suppliers} Vendors
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--t-500)' }}>Active procurement partners</div>
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-sub)', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`btn btn-sm ${activeTab === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12.5px' }}
            >
              <Boxes size={14} />
              <span>Products & Stock Inventory</span>
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`btn btn-sm ${activeTab === 'suppliers' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12.5px' }}
            >
              <Truck size={14} />
              <span>Suppliers & Purchase Vendors ({suppliers.length})</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {activeTab === 'inventory' ? (
              <button
                onClick={() => {
                  setEditProduct(null);
                  setProductForm({
                    category: 'Grocery & Grains',
                    name: '',
                    product_code: 'PRD-' + Math.floor(100 + Math.random() * 900),
                    description: '',
                    unit: 'Kg',
                    expiry_period: '12/2026',
                    rate: '',
                    gst_percentage: '5.00',
                    opening_stock: '10',
                    minimum_stock_qty: '5',
                    status: 'Active',
                    supplier_id: suppliers[0]?.id || '',
                  });
                  setShowAddProductModal(true);
                }}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '12.5px' }}
              >
                <Plus size={14} />
                <span>+ Add New Product</span>
              </button>
            ) : (
              <button
                onClick={() => setShowSupplierModal(true)}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '12.5px' }}
              >
                <Plus size={14} />
                <span>+ Add New Supplier</span>
              </button>
            )}
          </div>
        </div>

        {activeTab === 'inventory' && (
          <div>
            {/* Category Filter Pills (From Book1.xlsx) */}
            <div style={{ padding: '10px 16px', background: 'var(--surface-sub)', borderBottom: '1px solid var(--border-sub)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase', marginRight: '4px' }}>
                Category:
              </span>
              <button
                onClick={() => setCategoryFilter('ALL')}
                style={{
                  padding: '3px 9px',
                  borderRadius: 'var(--r-pill)',
                  border: '1px solid',
                  borderColor: categoryFilter === 'ALL' ? 'var(--brand)' : 'var(--border-sub)',
                  background: categoryFilter === 'ALL' ? 'var(--brand)' : 'white',
                  color: categoryFilter === 'ALL' ? 'white' : 'var(--t-700)',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                All Categories ({metrics.total_products})
              </button>
              {STANDARD_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: 'var(--r-pill)',
                    border: '1px solid',
                    borderColor: categoryFilter === cat ? 'var(--brand)' : 'var(--border-sub)',
                    background: categoryFilter === cat ? 'var(--brand)' : 'white',
                    color: categoryFilter === cat ? 'white' : 'var(--t-700)',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search & Filter Controls */}
            <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-sub)', background: '#ffffff' }}>
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '340px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--t-500)' }} />
                  <input
                    type="text"
                    placeholder="Search product code, name, description..."
                    className="form-control"
                    style={{ paddingLeft: '30px', fontSize: '12.5px', height: '32px' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', height: '32px', fontSize: '12px' }}>
                  Search
                </button>
              </form>

              {/* Quick Status / Expiry Filter Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => { setLowStockOnly(false); setExpiryFilter('ALL'); }}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 'var(--r-pill)',
                    border: '1px solid',
                    borderColor: !lowStockOnly && expiryFilter === 'ALL' ? 'var(--brand)' : 'var(--border-sub)',
                    background: !lowStockOnly && expiryFilter === 'ALL' ? 'var(--brand)' : 'white',
                    color: !lowStockOnly && expiryFilter === 'ALL' ? 'white' : 'var(--t-700)',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  All ({metrics.total_products})
                </button>
                <button
                  type="button"
                  onClick={() => { setLowStockOnly(!lowStockOnly); if (!lowStockOnly) setExpiryFilter('ALL'); }}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 'var(--r-pill)',
                    border: '1px solid',
                    borderColor: lowStockOnly ? '#ef4444' : 'var(--border-sub)',
                    background: lowStockOnly ? '#ef4444' : '#fff5f5',
                    color: lowStockOnly ? 'white' : '#b91c1c',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  ⚠️ Low Stock ({metrics.low_stock_count})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = expiryFilter === 'EXPIRED' ? 'ALL' : 'EXPIRED';
                    setExpiryFilter(next);
                    if (next !== 'ALL') setLowStockOnly(false);
                  }}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 'var(--r-pill)',
                    border: '1px solid',
                    borderColor: expiryFilter === 'EXPIRED' ? '#dc2626' : '#fca5a5',
                    background: expiryFilter === 'EXPIRED' ? '#dc2626' : '#fef2f2',
                    color: expiryFilter === 'EXPIRED' ? 'white' : '#991b1b',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                  title="Filter products that are expired or have expired stock batches"
                >
                  ⛔ Expired ({metrics.expired_count || 0})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = expiryFilter === 'EXPIRING_SOON' ? 'ALL' : 'EXPIRING_SOON';
                    setExpiryFilter(next);
                    if (next !== 'ALL') setLowStockOnly(false);
                  }}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 'var(--r-pill)',
                    border: '1px solid',
                    borderColor: expiryFilter === 'EXPIRING_SOON' ? '#d97706' : '#fde68a',
                    background: expiryFilter === 'EXPIRING_SOON' ? '#d97706' : '#fffdf0',
                    color: expiryFilter === 'EXPIRING_SOON' ? 'white' : '#92400e',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                  title="Filter products due to expire within 1 month"
                >
                  ⚠️ Due in 1 Mo ({metrics.expiring_soon_count || 0})
                </button>
              </div>
            </div>

            {/* Products Table (Screen-Fitted Proportional Layout) */}
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="data-table" style={{ width: '100%', minWidth: '780px', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ width: '28%', padding: '10px 14px' }}>Product & Supplier Info</th>
                    <th style={{ width: '13%', padding: '10px 12px' }}>Category & Unit</th>
                    <th style={{ width: '11%', padding: '10px 12px' }}>Rate (+GST)</th>
                    <th style={{ width: '14%', padding: '10px 12px' }}>Current Stock</th>
                    <th style={{ width: '21%', padding: '10px 12px' }}>Expiry & Batch Status</th>
                    <th style={{ width: '5%', padding: '10px 6px', textAlign: 'center' }}>Status</th>
                    <th style={{ width: '8%', padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px' }}>
                        <div style={{ color: 'var(--t-500)', fontSize: '13px' }}>Loading products...</div>
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                        <Boxes size={30} color="var(--t-400)" style={{ margin: '0 auto 10px', display: 'block' }} />
                        <div style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--t-800)' }}>
                          No Products Found
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--t-500)', maxWidth: '360px', margin: '4px auto 14px' }}>
                          Add products to track opening stock, supplier details, and low inventory thresholds.
                        </p>
                        <button onClick={() => setShowAddProductModal(true)} className="btn btn-primary btn-sm">
                          <Plus size={14} />
                          <span>+ Add First Product</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const isExpired = p.expiry_status === 'EXPIRED';
                      const isExpiringSoon = p.expiry_status === 'EXPIRING_SOON';
                      const isLow = parseFloat(p.current_stock) <= parseFloat(p.minimum_stock_qty);

                      // Row background color-coding
                      let rowBg = undefined;
                      let borderLeft = undefined;
                      if (isExpired) {
                        rowBg = '#fef2f2'; // Red highlight
                        borderLeft = '3px solid #dc2626';
                      } else if (isExpiringSoon) {
                        rowBg = '#fffdf0'; // Yellow highlight
                        borderLeft = '3px solid #f59e0b';
                      } else if (isLow) {
                        rowBg = '#fff5f5';
                        borderLeft = '3px solid #f87171';
                      }

                      return (
                        <tr key={p.id} style={{ background: rowBg, borderLeft: borderLeft }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span className="badge badge-brand" style={{ fontFamily: 'monospace', fontSize: '10.5px', padding: '1px 6px' }}>
                                {p.product_code}
                              </span>
                              <strong style={{ fontSize: '13px', color: 'var(--t-900)' }}>
                                {p.name}
                              </strong>
                            </div>
                            {p.description && (
                              <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.description}
                              </div>
                            )}
                            <div style={{ fontSize: '10.5px', color: 'var(--t-500)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>🏢 {p.supplier?.firm_name || 'Direct Procurement'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--t-800)' }}>
                              {p.category}
                            </div>
                            <div style={{ marginTop: '2px' }}>
                              <span className="badge badge-inactive" style={{ fontSize: '10px', padding: '1px 5px' }}>
                                Per {p.unit}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--t-900)' }}>
                              ₹ {parseFloat(p.rate).toFixed(2)}
                            </strong>
                            <div style={{ fontSize: '10.5px', color: 'var(--t-500)', marginTop: '1px' }}>
                              +{parseFloat(p.gst_percentage).toFixed(0)}% GST
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '13.5px', color: isLow ? '#dc2626' : '#16a34a' }}>
                                {parseFloat(p.current_stock)} {p.unit}
                              </strong>
                              {isLow && (
                                <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '9.5px', padding: '1px 5px', fontWeight: '700' }}>
                                  LOW
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--t-500)', marginTop: '1px' }}>
                              Min: {parseFloat(p.minimum_stock_qty)} {p.unit}
                            </div>
                          </td>

                          {/* EXPIRY & BATCH STATUS (Dedicated Prominent Column) */}
                          <td style={{ padding: '10px 12px' }}>
                            {isExpired ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: '700' }}>
                                <span>⛔ EXPIRED ({p.expiry_period || 'Past'})</span>
                              </div>
                            ) : isExpiringSoon ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: '700' }}>
                                <span>⚠️ EXPIRING SOON</span>
                                <span style={{ fontSize: '10px', opacity: 0.9 }}>
                                  {p.days_until_expiry !== null ? `(${Math.max(1, p.days_until_expiry)}d left)` : `(${p.expiry_period})`}
                                </span>
                              </div>
                            ) : p.expiry_period ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: '600' }}>
                                <span>✓ Valid: {p.expiry_period}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--t-400)' }}>No Expiry Set</span>
                            )}

                            {/* Older Stock / Batch Expiry Alert */}
                            {p.oldest_expiring_batch && (
                              <div
                                style={{
                                  marginTop: '4px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: '600',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: p.oldest_expiring_batch.expiry_status === 'EXPIRED' ? '#fee2e2' : '#fef3c7',
                                  color: p.oldest_expiring_batch.expiry_status === 'EXPIRED' ? '#991b1b' : '#92400e',
                                  border: `1px dashed ${p.oldest_expiring_batch.expiry_status === 'EXPIRED' ? '#f87171' : '#fbbf24'}`,
                                }}
                              >
                                <span>
                                  {p.oldest_expiring_batch.expiry_status === 'EXPIRED' ? '🚨' : '⚠️'} Old Stock ({p.oldest_expiring_batch.quantity} {p.unit}): {p.oldest_expiring_batch.expiry_status === 'EXPIRED' ? `Expired (${p.oldest_expiring_batch.expiry_period})` : `Due in ${p.oldest_expiring_batch.days_remaining}d`}
                                </span>
                              </div>
                            )}

                            {p.active_batches && p.active_batches.length > 1 && (
                              <button
                                onClick={() => setShowBatchModal(p)}
                                style={{
                                  marginTop: '3px',
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  color: 'var(--brand)',
                                  fontSize: '10.5px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                  display: 'block',
                                }}
                              >
                                View All {p.active_batches.length} Batches →
                              </button>
                            )}
                          </td>

                          <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                            <span className={`badge ${p.status === 'Active' ? 'badge-success' : 'badge-inactive'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '5px' }}>
                              <button
                                onClick={() => {
                                  setShowStockModal(p);
                                  setStockForm({
                                    type: 'ADD',
                                    quantity: '',
                                    reason: 'Vendor Delivery GRN',
                                    notes: '',
                                    batch_no: '',
                                    expiry_period: p.expiry_period || '',
                                  });
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '11px', height: '28px' }}
                                title="Adjust Stock (Receive delivery, issue to kitchen, etc.)"
                              >
                                <RotateCcw size={11} />
                                <span>Adjust</span>
                              </button>
                              <button
                                onClick={() => openEditModal(p)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 7px', fontSize: '11px', height: '28px' }}
                                title="Edit Product"
                              >
                                <Edit2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Suppliers Tab */}
        {activeTab === 'suppliers' && (
          <div>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="data-table" style={{ width: '100%', minWidth: '700px', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ width: '32%', padding: '10px 14px' }}>Firm Name & Address</th>
                    <th style={{ width: '22%', padding: '10px 12px' }}>Contact Person</th>
                    <th style={{ width: '24%', padding: '10px 12px' }}>Tax & Identifiers</th>
                    <th style={{ width: '12%', padding: '10px 12px' }}>Catalog</th>
                    <th style={{ width: '10%', padding: '10px 14px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                        <Truck size={30} color="var(--t-400)" style={{ margin: '0 auto 10px', display: 'block' }} />
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--t-800)' }}>
                          No Suppliers Registered Yet
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--t-500)', marginTop: '4px' }}>
                          Add suppliers and vendors for purchase management and goods receipt.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((s) => (
                      <tr key={s.id}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Building size={15} color="var(--brand)" />
                            <strong style={{ fontSize: '13px', color: 'var(--t-900)' }}>
                              {s.firm_name}
                            </strong>
                          </div>
                          {s.address && (
                            <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              📍 {s.address}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: '12.5px', color: 'var(--t-800)', fontWeight: '600' }}>
                            {s.contact_person || '--'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--t-500)', fontFamily: 'monospace', marginTop: '1px' }}>
                            📞 {s.mobile}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: '11.5px', fontFamily: 'monospace', color: 'var(--t-700)' }}>
                            GST: <strong>{s.gst_no || '--'}</strong>
                          </div>
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--t-500)', marginTop: '1px' }}>
                            PAN: {s.pan_no || '--'} {s.aadhar_no ? `• UID: ${s.aadhar_no}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className="badge badge-brand" style={{ fontSize: '10.5px' }}>
                            {s.products_count ?? 0} Products
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span className={`badge ${s.status === 'Active' ? 'badge-success' : 'badge-inactive'}`} style={{ fontSize: '10.5px' }}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT PRODUCT (Book1.xlsx Specification) */}
      {showAddProductModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                  {editProduct ? 'Edit Inventory Product' : 'Add New Inventory Product'}
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--t-500)' }}>
                  Fields mapped from Book1.xlsx (Product Specifications)
                </p>
              </div>
              <button onClick={() => setShowAddProductModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                ✕
              </button>
            </div>

            {errorMsg && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid var(--error-border)', marginBottom: '16px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateProduct}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-select"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    required
                  >
                    {STANDARD_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Product Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. PRD-GRN-101"
                    value={productForm.product_code}
                    onChange={(e) => setProductForm({ ...productForm, product_code: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Basmati Rice Premium (Extra Long)"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Product Description</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Brand, quality grade, packaging specifications..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Unit *</label>
                  <select
                    className="form-select"
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    required
                  >
                    <option value="Kg">Kg (Kilogram)</option>
                    <option value="Gm">Gm (Gram)</option>
                    <option value="Ltr">Ltr (Litre)</option>
                    <option value="Ml">Ml (Millilitre)</option>
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Packet">Packet</option>
                    <option value="Box">Box</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Dozen">Dozen</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Rate / Unit (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="120.00"
                    value={productForm.rate}
                    onChange={(e) => setProductForm({ ...productForm, rate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GST % *</label>
                  <select
                    className="form-select"
                    value={productForm.gst_percentage}
                    onChange={(e) => setProductForm({ ...productForm, gst_percentage: e.target.value })}
                    required
                  >
                    <option value="0.00">0% (Nil)</option>
                    <option value="5.00">5% GST</option>
                    <option value="12.00">12% GST</option>
                    <option value="18.00">18% GST</option>
                    <option value="28.00">28% GST</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {!editProduct && (
                  <div className="form-group">
                    <label className="form-label">Opening Stock *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="100"
                      value={productForm.opening_stock}
                      onChange={(e) => setProductForm({ ...productForm, opening_stock: e.target.value })}
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Min Stock Qty (Alert)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="20"
                    value={productForm.minimum_stock_qty}
                    onChange={(e) => setProductForm({ ...productForm, minimum_stock_qty: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expiry (MM/yyyy)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="12/2026"
                    value={productForm.expiry_period}
                    onChange={(e) => setProductForm({ ...productForm, expiry_period: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Assigned Vendor / Supplier</label>
                  <select
                    className="form-select"
                    value={productForm.supplier_id}
                    onChange={(e) => setProductForm({ ...productForm, supplier_id: e.target.value })}
                  >
                    <option value="">-- No Supplier Linked --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.firm_name} ({s.contact_person || s.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Product Status</label>
                  <select
                    className="form-select"
                    value={productForm.status}
                    onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUST STOCK LEVEL (Storekeeper Feature) */}
      {showStockModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                  Adjust Inventory Stock
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--t-500)' }}>
                  Update stock on vendor delivery receipt, kitchen issuance, or physical audit.
                </p>
              </div>
              <button onClick={() => setShowStockModal(null)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                ✕
              </button>
            </div>

            {errorMsg && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid var(--error-border)', marginBottom: '16px', fontSize: '12.5px' }}>
                {errorMsg}
              </div>
            )}

            {/* Product Summary Card */}
            <div style={{ background: 'var(--surface-sub)', padding: '14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-sub)', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--t-500)', textTransform: 'uppercase', fontWeight: '700' }}>
                Item Under Adjustment
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--t-900)', marginTop: '2px' }}>
                {showStockModal.name}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '12.5px' }}>
                <div>Code: <strong>{showStockModal.product_code}</strong></div>
                <div>Current Stock: <strong style={{ color: 'var(--brand)' }}>{parseFloat(showStockModal.current_stock)} {showStockModal.unit}</strong></div>
                <div>Rate: <strong>₹ {parseFloat(showStockModal.rate)}</strong></div>
              </div>
            </div>

            <form onSubmit={handleAdjustStock}>
              <div className="form-group">
                <label className="form-label">Adjustment Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setStockForm({ ...stockForm, type: 'ADD', reason: 'Vendor Delivery GRN' })}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--r-sm)',
                      border: '1px solid',
                      borderColor: stockForm.type === 'ADD' ? '#16a34a' : 'var(--border-sub)',
                      background: stockForm.type === 'ADD' ? '#f0fdf4' : 'white',
                      color: stockForm.type === 'ADD' ? '#16a34a' : 'var(--t-700)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                    }}
                  >
                    + Add Stock (GRN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockForm({ ...stockForm, type: 'SUBTRACT', reason: 'Kitchen Requisition' })}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--r-sm)',
                      border: '1px solid',
                      borderColor: stockForm.type === 'SUBTRACT' ? '#dc2626' : 'var(--border-sub)',
                      background: stockForm.type === 'SUBTRACT' ? '#fef2f2' : 'white',
                      color: stockForm.type === 'SUBTRACT' ? '#dc2626' : 'var(--t-700)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                    }}
                  >
                    - Deduct (Kitchen)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockForm({ ...stockForm, type: 'SET', reason: 'Physical Audit Count' })}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--r-sm)',
                      border: '1px solid',
                      borderColor: stockForm.type === 'SET' ? 'var(--brand)' : 'var(--border-sub)',
                      background: stockForm.type === 'SET' ? 'var(--brand-50)' : 'white',
                      color: stockForm.type === 'SET' ? 'var(--brand)' : 'var(--t-700)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                    }}
                  >
                    Set Exact Count
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">
                    {stockForm.type === 'SET' ? 'New Exact Quantity *' : 'Quantity to ' + (stockForm.type === 'ADD' ? 'Add' : 'Deduct') + ' *'}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="0.00"
                      value={stockForm.quantity}
                      onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                      required
                      min="0.01"
                    />
                    <span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--t-600)' }}>
                      {showStockModal.unit}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason / Reference *</label>
                  <select
                    className="form-select"
                    value={stockForm.reason}
                    onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })}
                    required
                  >
                    <option value="Vendor Delivery GRN">Vendor Delivery GRN</option>
                    <option value="Kitchen Requisition">Kitchen Requisition / Food Prep</option>
                    <option value="Damaged / Spoilage Wastage">Damaged / Spoilage Wastage</option>
                    <option value="Physical Audit Count">Physical Audit Count Adjustment</option>
                    <option value="Return to Vendor">Return to Vendor</option>
                    <option value="Other Adjustment">Other Adjustment</option>
                  </select>
                </div>
              </div>

              {stockForm.type === 'ADD' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Batch No. (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. BAT-2026-01 (or auto)"
                      value={stockForm.batch_no}
                      onChange={(e) => setStockForm({ ...stockForm, batch_no: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Batch Expiry (MM/yyyy)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 12/2026"
                      value={stockForm.expiry_period}
                      onChange={(e) => setStockForm({ ...stockForm, expiry_period: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Notes / Challan Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Challan #CH-8812 received from supplier"
                  value={stockForm.notes}
                  onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                />
              </div>

              {/* Batches breakdown in Adjust Modal */}
              {showStockModal.active_batches && showStockModal.active_batches.length > 0 && (
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-sub)', marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-600)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Current Stock Batches ({showStockModal.active_batches.length})
                  </div>
                  <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {showStockModal.active_batches.map((b, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', padding: '4px 8px', background: b.expiry_status === 'EXPIRED' ? '#fee2e2' : b.expiry_status === 'EXPIRING_SOON' ? '#fef3c7' : 'white', borderRadius: '4px', border: '1px solid var(--border-sub)' }}>
                        <div>
                          <strong>{b.batch_no}</strong>: {b.quantity} {b.unit || showStockModal.unit}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Exp: {b.expiry_period}</span>
                          <span className={`badge ${b.expiry_status === 'EXPIRED' ? 'badge-danger' : b.expiry_status === 'EXPIRING_SOON' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                            {b.expiry_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calculated preview */}
              {stockForm.quantity && (
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-sub)', marginBottom: '16px', fontSize: '12.5px' }}>
                  New Stock After Adjustment:{' '}
                  <strong style={{ color: 'var(--brand)', fontSize: '14px' }}>
                    {stockForm.type === 'ADD'
                      ? (parseFloat(showStockModal.current_stock) + parseFloat(stockForm.quantity || 0)).toFixed(2)
                      : stockForm.type === 'SUBTRACT'
                      ? (parseFloat(showStockModal.current_stock) - parseFloat(stockForm.quantity || 0)).toFixed(2)
                      : parseFloat(stockForm.quantity || 0).toFixed(2)}{' '}
                    {showStockModal.unit}
                  </strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowStockModal(null)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Applying Adjustment...' : 'Confirm Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: BATCH BREAKDOWN & EXPIRY INSPECTION */}
      {showBatchModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                  Stock Batches & Expiry Breakdown
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--t-500)', marginTop: '2px' }}>
                  {showBatchModal.name} &bull; Total Available: <strong style={{ color: 'var(--brand)' }}>{parseFloat(showBatchModal.current_stock)} {showBatchModal.unit}</strong>
                </p>
              </div>
              <button onClick={() => setShowBatchModal(null)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                ✕
              </button>
            </div>

            <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {showBatchModal.active_batches && showBatchModal.active_batches.length > 0 ? (
                showBatchModal.active_batches.map((b, idx) => {
                  const isExp = b.expiry_status === 'EXPIRED';
                  const isSoon = b.expiry_status === 'EXPIRING_SOON';
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--r-sm)',
                        border: '1px solid',
                        borderColor: isExp ? '#fca5a5' : isSoon ? '#fde68a' : 'var(--border-sub)',
                        background: isExp ? '#fef2f2' : isSoon ? '#fffdf0' : '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '12.5px', color: 'var(--t-900)' }}>
                            {b.batch_no}
                          </span>
                          <span
                            className="badge"
                            style={{
                              background: isExp ? '#fee2e2' : isSoon ? '#fef3c7' : '#f0fdf4',
                              color: isExp ? '#b91c1c' : isSoon ? '#92400e' : '#15803d',
                              border: `1px solid ${isExp ? '#fca5a5' : isSoon ? '#fde68a' : '#bbf7d0'}`,
                              fontSize: '9.5px',
                              padding: '2px 7px',
                              fontWeight: '700',
                            }}
                          >
                            {isExp ? '⛔ EXPIRED' : isSoon ? `⚠️ DUE IN ${b.days_remaining}D` : '✓ VALID'}
                          </span>
                        </div>
                        {editingBatchNo === b.batch_no ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-600)' }}>Expiry (MM/yyyy):</span>
                            <input
                              type="text"
                              className="form-control"
                              style={{ width: '95px', height: '26px', padding: '2px 6px', fontSize: '12px' }}
                              value={editingBatchExpiry}
                              onChange={(e) => setEditingBatchExpiry(e.target.value)}
                              placeholder="MM/yyyy"
                            />
                            <button
                              type="button"
                              disabled={savingBatch}
                              onClick={() => handleSaveBatchExpiry(showBatchModal.id, b.batch_no)}
                              className="btn btn-primary btn-sm"
                              style={{ height: '26px', padding: '2px 8px', fontSize: '11px' }}
                            >
                              {savingBatch ? '...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBatchNo(null)}
                              className="btn btn-secondary btn-sm"
                              style={{ height: '26px', padding: '2px 8px', fontSize: '11px' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--t-700)' }}>
                              Batch Qty: <strong>{b.quantity} {b.unit || showBatchModal.unit}</strong> &bull; Expiry: <strong style={{ color: isExp ? '#dc2626' : isSoon ? '#d97706' : 'var(--t-900)' }}>{b.expiry_period}</strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBatchNo(b.batch_no);
                                setEditingBatchExpiry(b.expiry_period || '');
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--brand)',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                padding: '0 4px',
                                textDecoration: 'underline',
                              }}
                              title="Edit expiry date for this batch"
                            >
                              ✏️ Edit Expiry
                            </button>
                          </div>
                        )}
                        {b.received_at && (
                          <div style={{ fontSize: '10.5px', color: 'var(--t-400)', marginTop: '2px' }}>
                            Received: {new Date(b.received_at).toLocaleDateString()} {b.notes ? `• ${b.notes}` : ''}
                          </div>
                        )}
                      </div>

                      {isExp && (
                        <button
                          onClick={() => {
                            const targetBatch = b;
                            const prod = showBatchModal;
                            setShowBatchModal(null);
                            setShowStockModal(prod);
                            setStockForm({
                              type: 'SUBTRACT',
                              quantity: targetBatch.quantity.toString(),
                              reason: 'Damaged / Spoilage Wastage',
                              notes: `Write off expired batch ${targetBatch.batch_no} (${targetBatch.expiry_period})`,
                              batch_no: targetBatch.batch_no,
                              expiry_period: targetBatch.expiry_period,
                            });
                          }}
                          className="btn btn-sm"
                          style={{
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                          }}
                          title="Write off this expired batch immediately"
                        >
                          Clear Expired Stock
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--t-500)', fontSize: '12.5px' }}>
                  No batch breakdown recorded. Default product expiry is {showBatchModal.expiry_period || 'not set'}.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setShowBatchModal(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showSupplierModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                  Add Supplier For Purchase
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--t-500)' }}>
                  From Book1.xlsx (Supplier Details For Purchase)
                </p>
              </div>
              <button onClick={() => setShowSupplierModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                ✕
              </button>
            </div>

            {errorMsg && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid var(--error-border)', marginBottom: '16px', fontSize: '12.5px' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSupplier}>
              <div className="form-group">
                <label className="form-label">Firm Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Royal Provisions & Wholesale Ltd"
                  value={supplierForm.firm_name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, firm_name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Ramesh Gupta"
                    value={supplierForm.contact_person}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+91 9823456789"
                    value={supplierForm.mobile}
                    onChange={(e) => setSupplierForm({ ...supplierForm, mobile: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">GST No.</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="27AABCR1234D1Z2"
                    value={supplierForm.gst_no}
                    onChange={(e) => setSupplierForm({ ...supplierForm, gst_no: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">PAN No.</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="AABCR1234D"
                    value={supplierForm.pan_no}
                    onChange={(e) => setSupplierForm({ ...supplierForm, pan_no: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Aadhar No.</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="XXXX-XXXX-1234"
                    value={supplierForm.aadhar_no}
                    onChange={(e) => setSupplierForm({ ...supplierForm, aadhar_no: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="orders@supplier.com"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Mandi market plot, street address, city, pin code..."
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
