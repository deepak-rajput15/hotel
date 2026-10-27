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

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(null); // product object
  const [showSupplierModal, setShowSupplierModal] = useState(false);
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
  }, [categoryFilter, lowStockOnly, currentHotel?.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const params = {};
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (lowStockOnly) params.low_stock = true;
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--r-card)', background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
              Total Products
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--t-900)' }}>
              {metrics.total_products}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t-500)' }}>Active in catalog</div>
          </div>
        </div>

        <div
          className="card"
          onClick={() => setLowStockOnly(!lowStockOnly)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '18px',
            cursor: 'pointer',
            border: lowStockOnly ? '2px solid #ef4444' : undefined,
            background: metrics.low_stock_count > 0 ? '#fef2f2' : 'white',
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--r-card)', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase' }}>
              Low Stock Alerts
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#dc2626' }}>
              {metrics.low_stock_count} Items
            </div>
            <div style={{ fontSize: '11px', color: '#b91c1c' }}>
              {lowStockOnly ? 'Filtering active (click to reset)' : 'Click to filter low stock'}
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--r-card)', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
              Stock Inventory Value
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--t-900)' }}>
              ₹ {metrics.total_stock_value?.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t-500)' }}>Valued at purchase rate</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--r-card)', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
            <Truck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
              Registered Suppliers
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--t-900)' }}>
              {metrics.active_suppliers} Vendors
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t-500)' }}>Active procurement partners</div>
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-sub)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`btn btn-sm ${activeTab === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Boxes size={14} />
              <span>Products & Stock Inventory</span>
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`btn btn-sm ${activeTab === 'suppliers' ? 'btn-primary' : 'btn-secondary'}`}
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
              >
                <Plus size={14} />
                <span>+ Add New Product</span>
              </button>
            ) : (
              <button
                onClick={() => setShowSupplierModal(true)}
                className="btn btn-primary btn-sm"
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
            <div style={{ padding: '12px 20px', background: 'var(--surface-sub)', borderBottom: '1px solid var(--border-sub)', display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--t-500)', whiteSpace: 'nowrap' }}>
                Category:
              </span>
              <button
                onClick={() => setCategoryFilter('ALL')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--r-pill)',
                  border: '1px solid',
                  borderColor: categoryFilter === 'ALL' ? 'var(--brand)' : 'var(--border-sub)',
                  background: categoryFilter === 'ALL' ? 'var(--brand)' : 'white',
                  color: categoryFilter === 'ALL' ? 'white' : 'var(--t-700)',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                All Categories ({metrics.total_products})
              </button>
              {STANDARD_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--r-pill)',
                    border: '1px solid',
                    borderColor: categoryFilter === cat ? 'var(--brand)' : 'var(--border-sub)',
                    background: categoryFilter === cat ? 'var(--brand)' : 'white',
                    color: categoryFilter === cat ? 'white' : 'var(--t-700)',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search & Low Stock Toggle Bar */}
            <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-sub)' }}>
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '420px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--t-500)' }} />
                  <input
                    type="text"
                    placeholder="Search product code, name, description..."
                    className="form-control"
                    style={{ paddingLeft: '32px', fontSize: '13px', height: '34px' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-secondary btn-sm">
                  Search
                </button>
              </form>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', fontWeight: '600', color: lowStockOnly ? '#dc2626' : 'var(--t-700)' }}>
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                />
                <span>⚠️ Show Only Low Stock ({metrics.low_stock_count})</span>
              </label>
            </div>

            {/* Products Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product Code & Name</th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th>Rate (₹)</th>
                    <th>GST %</th>
                    <th>Expiry (MM/yyyy)</th>
                    <th>Current / Min Stock</th>
                    <th>Supplier Firm</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ color: 'var(--t-500)', fontSize: '13px' }}>Loading products...</div>
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '48px' }}>
                        <Boxes size={32} color="var(--t-400)" style={{ margin: '0 auto 10px', display: 'block' }} />
                        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--t-800)' }}>
                          No Products Found
                        </div>
                        <p style={{ fontSize: '12.5px', color: 'var(--t-500)', maxWidth: '380px', margin: '4px auto 16px' }}>
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
                      const isLow = parseFloat(p.current_stock) <= parseFloat(p.minimum_stock_qty);
                      return (
                        <tr key={p.id} style={{ background: isLow ? '#fff5f5' : undefined }}>
                          <td>
                            <div>
                              <span className="badge badge-brand" style={{ fontFamily: 'monospace', fontSize: '11px', marginRight: '6px' }}>
                                {p.product_code}
                              </span>
                              <strong style={{ fontSize: '13.5px', color: 'var(--t-900)' }}>{p.name}</strong>
                              {p.description && (
                                <div style={{ fontSize: '11.5px', color: 'var(--t-500)', marginTop: '2px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {p.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--t-800)', fontWeight: '500' }}>
                              {p.category}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-inactive" style={{ fontSize: '11px' }}>
                              {p.unit}
                            </span>
                          </td>
                          <td>
                            <strong style={{ fontSize: '13px', color: 'var(--t-900)' }}>
                              ₹ {parseFloat(p.rate).toFixed(2)}
                            </strong>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--t-600)' }}>
                              {parseFloat(p.gst_percentage).toFixed(0)}%
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--t-700)', fontFamily: 'monospace' }}>
                              {p.expiry_period || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '14px', color: isLow ? '#dc2626' : '#16a34a' }}>
                                {parseFloat(p.current_stock)} {p.unit}
                              </strong>
                              <span style={{ fontSize: '11px', color: 'var(--t-500)' }}>
                                (Min: {parseFloat(p.minimum_stock_qty)})
                              </span>
                              {isLow && (
                                <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '10px', padding: '1px 5px' }}>
                                  LOW
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--t-800)' }}>
                              {p.supplier?.firm_name || '--'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${p.status === 'Active' ? 'badge-success' : 'badge-inactive'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                onClick={() => {
                                  setShowStockModal(p);
                                  setStockForm({
                                    type: 'ADD',
                                    quantity: '',
                                    reason: 'Vendor Delivery GRN',
                                    notes: '',
                                  });
                                }}
                                className="btn btn-secondary btn-sm"
                                title="Adjust Stock (Receive delivery, issue to kitchen, etc.)"
                              >
                                <RotateCcw size={13} />
                                <span>Adjust Stock</span>
                              </button>
                              <button
                                onClick={() => openEditModal(p)}
                                className="btn btn-secondary btn-sm"
                                title="Edit Product"
                              >
                                <Edit2 size={13} />
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
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Firm Name</th>
                    <th>Contact Person</th>
                    <th>Mobile</th>
                    <th>GST No.</th>
                    <th>PAN No.</th>
                    <th>Aadhar No.</th>
                    <th>Address</th>
                    <th>Supplied Products</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
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
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Building size={16} color="var(--brand)" />
                            <strong style={{ fontSize: '13.5px', color: 'var(--t-900)' }}>
                              {s.firm_name}
                            </strong>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '12.5px', color: 'var(--t-800)' }}>
                            {s.contact_person || '--'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12.5px', color: 'var(--t-800)', fontFamily: 'monospace' }}>
                            {s.mobile}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--t-700)' }}>
                            {s.gst_no || '--'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--t-700)' }}>
                            {s.pan_no || '--'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--t-700)' }}>
                            {s.aadhar_no || '--'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--t-600)', maxWidth: '240px', display: 'block' }}>
                            {s.address || '--'}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-brand">
                            {s.products_count ?? 0} Products
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${s.status === 'Active' ? 'badge-success' : 'badge-inactive'}`}>
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

      {/* MODAL 3: ADD SUPPLIER (Book1.xlsx Specification) */}
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
