const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('hotel_saas_token');
  const currentHotelId = localStorage.getItem('hotel_saas_current_hotel_id');

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(currentHotelId && currentHotelId !== 'ALL' ? { 'X-Hotel-ID': currentHotelId } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const authApi = {
  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => apiRequest('/auth/me'),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
};

export const adminApi = {
  getOrganizations: () => apiRequest('/admin/organizations'),
  createOrganization: (data) =>
    apiRequest('/admin/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getHotels: () => apiRequest('/admin/hotels'),
  createHotel: (orgId, data) =>
    apiRequest(`/admin/organizations/${orgId}/hotels`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getModules: () => apiRequest('/admin/modules'),
  updateHotelModules: (hotelId, modules) =>
    apiRequest(`/admin/hotels/${hotelId}/modules`, {
      method: 'PUT',
      body: JSON.stringify({ modules }),
    }),
};

export const hotelApi = {
  getActiveModules: (hotelId) => apiRequest(`/hotels/${hotelId}/modules`),
  testFrontOffice: () => apiRequest('/front-office/dashboard'),
  testRestaurant: () => apiRequest('/restaurant/orders'),
  getStaff: (hotelId = 'ALL') => apiRequest(`/hotels/${hotelId}/staff`),
  createStaff: (hotelId, data) =>
    apiRequest(`/hotels/${hotelId}/staff`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const frontOfficeApi = {
  getOverview: () => apiRequest('/front-office/overview'),
  getRooms: () => apiRequest('/front-office/rooms'),
  updateRoomStatus: (roomId, status) =>
    apiRequest(`/front-office/rooms/${roomId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  getCalendar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/front-office/rooms/calendar${qs ? '?' + qs : ''}`);
  },
  getBookings: (status = 'ALL') => apiRequest(`/front-office/bookings?status=${status}`),
  getBookingDetail: (id) => apiRequest(`/front-office/bookings/${id}`),
  checkIn: (data) =>
    apiRequest('/front-office/check-in', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addFolioCharge: (bookingId, data) =>
    apiRequest(`/front-office/bookings/${bookingId}/folio-items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  recordPayment: (bookingId, data) =>
    apiRequest(`/front-office/bookings/${bookingId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  checkOut: (bookingId, data = {}) =>
    apiRequest(`/front-office/bookings/${bookingId}/check-out`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createRoom: (data) =>
    apiRequest('/front-office/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRoom: (roomId, data) =>
    apiRequest(`/front-office/rooms/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export const storeApi = {
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/store/products${qs ? '?' + qs : ''}`);
  },
  createProduct: (data) =>
    apiRequest('/store/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProduct: (id, data) =>
    apiRequest(`/store/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  adjustStock: (id, data) =>
    apiRequest(`/store/products/${id}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateBatch: (productId, batchNo, data) =>
    apiRequest(`/store/products/${productId}/batches/${batchNo}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getSuppliers: () => apiRequest('/store/suppliers'),
  createSupplier: (data) =>
    apiRequest('/store/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const reportsApi = {
  getOverview: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/reports/overview${qs ? '?' + qs : ''}`);
  },
  getGuestLedger: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/reports/guest-ledger${qs ? '?' + qs : ''}`);
  },
  getInventoryReport: () => apiRequest('/reports/inventory'),
  downloadExport: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const token = localStorage.getItem('hotel_saas_token');
    const currentHotelId = localStorage.getItem('hotel_saas_current_hotel_id');

    const headers = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(currentHotelId && currentHotelId !== 'ALL' ? { 'X-Hotel-ID': currentHotelId } : {}),
    };

    const response = await fetch(`${API_BASE}/reports/export${qs ? '?' + qs : ''}`, { headers });
    if (!response.ok) {
      throw new Error('Export download failed');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GrandStay_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const restaurantApi = {
  getTables: () => apiRequest('/restaurant/tables'),
  createTable: (data) =>
    apiRequest('/restaurant/tables', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTableStatus: (id, status) =>
    apiRequest(`/restaurant/tables/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  getMenu: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/restaurant/menu${qs ? '?' + qs : ''}`);
  },
  createMenuItem: (data) =>
    apiRequest('/restaurant/menu/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMenuItem: (id, data) =>
    apiRequest(`/restaurant/menu/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getOrders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/restaurant/orders${qs ? '?' + qs : ''}`);
  },
  getOrderDetail: (id) => apiRequest(`/restaurant/orders/${id}`),
  createOrder: (data) =>
    apiRequest('/restaurant/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addOrderItems: (id, data) =>
    apiRequest(`/restaurant/orders/${id}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  settleOrder: (id, data) =>
    apiRequest(`/restaurant/orders/${id}/settle`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getInHouseRooms: () => apiRequest('/restaurant/in-house-rooms'),
};

export const kitchenApi = {
  getLiveKots: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/kitchen/kots${qs ? '?' + qs : ''}`);
  },
  getSummary: () => apiRequest('/kitchen/summary'),
  updateItemStatus: (itemId, status) =>
    apiRequest(`/kitchen/items/${itemId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  updateKotStatus: (orderId, kotNumber, status) =>
    apiRequest(`/kitchen/kots/${orderId}/${kotNumber}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};

export const purchaseApi = {
  getOrders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/purchase/orders${qs ? '?' + qs : ''}`);
  },
  getOrderDetail: (id) => apiRequest(`/purchase/orders/${id}`),
  createOrder: (data) =>
    apiRequest('/purchase/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  receiveGoods: (id, data) =>
    apiRequest(`/purchase/orders/${id}/receive-goods`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getGrns: () => apiRequest('/purchase/grn'),
};

export const notificationsApi = {
  getNotifications: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/notifications${qs ? '?' + qs : ''}`);
  },
  createNotification: (data) =>
    apiRequest('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  markAsRead: (id, dismissed = false) =>
    apiRequest(`/notifications/${id}/read`, {
      method: 'POST',
      body: JSON.stringify({ dismissed }),
    }),
  markAllAsRead: () =>
    apiRequest('/notifications/mark-all-read', {
      method: 'POST',
    }),
  toggleBanner: (id) =>
    apiRequest(`/notifications/${id}/toggle-banner`, {
      method: 'PUT',
    }),
  deleteNotification: (id) =>
    apiRequest(`/notifications/${id}`, {
      method: 'DELETE',
    }),
};

export const guestApi = {
  getRoomMenu: (hotelCode, roomNumber) =>
    apiRequest(`/public/room-dining/${hotelCode}/${roomNumber}`),
  placeRoomOrder: (hotelCode, roomNumber, data) =>
    apiRequest(`/public/room-dining/${hotelCode}/${roomNumber}/order`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  trackOrderStatus: (orderNumber) =>
    apiRequest(`/public/room-dining/orders/${orderNumber}`),
};

export const shiftsApi = {
  getCurrent: (department = 'FRONT_DESK', hotelId = null) =>
    apiRequest(`/shifts/current?department=${encodeURIComponent(department)}`, {
      headers: hotelId ? { 'X-Hotel-Context': hotelId } : {},
    }),
  open: (data, hotelId = null) =>
    apiRequest('/shifts/open', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: hotelId ? { 'X-Hotel-Context': hotelId } : {},
    }),
  addCashTransaction: (shiftId, data, hotelId = null) =>
    apiRequest(`/shifts/${shiftId}/cash-transaction`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: hotelId ? { 'X-Hotel-Context': hotelId } : {},
    }),
  close: (shiftId, data, hotelId = null) =>
    apiRequest(`/shifts/${shiftId}/close`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: hotelId ? { 'X-Hotel-Context': hotelId } : {},
    }),
  list: (params = {}, hotelId = null) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/shifts${query ? `?${query}` : ''}`, {
      headers: hotelId ? { 'X-Hotel-Context': hotelId } : {},
    });
  },
  getSlip: (shiftId, hotelId = null) =>
    apiRequest(`/shifts/${shiftId}/slip`, {
      headers: hotelId ? { 'X-Hotel-Context': hotelId } : {},
    }),
};

export const whatsappApi = {
  getLogs: (params = {}, hotelId = null) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/whatsapp/logs${query ? `?${query}` : ''}`, {
      headers: hotelId ? { 'X-Hotel-Context': hotelId } : {},
    });
  },
  resend: (bookingId, type = 'BOOKING_CONFIRMATION', hotelId = null) =>
    apiRequest('/whatsapp/resend', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId, type }),
      headers: hotelId ? { 'X-Hotel-Context': hotelId } : {},
    }),
  sendDailySummary: (hotelId = null) =>
    apiRequest('/whatsapp/daily-summary', {
      method: 'POST',
      headers: hotelId ? { 'X-Hotel-Context': hotelId } : {},
    }),
};

export const otaApi = {
  getChannels: (hotelId = null) =>
    apiRequest('/ota/channels', {
      headers: hotelId ? { 'X-Hotel-Context': hotelId } : {},
    }),
  updateChannel: (channelCode, data, hotelId = null) =>
    apiRequest(`/ota/channels/${channelCode}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: hotelId ? { 'X-Hotel-Context': hotelId } : {},
    }),
  pushAri: (channelCode = null, hotelId = null) =>
    apiRequest('/ota/channels/push-ari', {
      method: 'POST',
      body: JSON.stringify({ channel_code: channelCode }),
      headers: hotelId ? { 'X-Hotel-Context': hotelId } : {},
    }),
  getLogs: (params = {}, hotelId = null) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/ota/logs${query ? `?${query}` : ''}`, {
      headers: hotelId ? { 'X-Hotel-Context': hotelId } : {},
    });
  },
  simulateBooking: (data, hotelId = null) =>
    apiRequest('/ota/simulate-booking', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: hotelId ? { 'X-Hotel-Context': hotelId } : {},
    }),
};

export const paymentSettingsApi = {
  getSettings: (hotelId = null) =>
    apiRequest('/hotel/payment-settings', {
      headers: hotelId ? { 'X-Hotel-Context': hotelId } : {},
    }),
  updateSettings: (data, hotelId = null) =>
    apiRequest('/hotel/payment-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: hotelId ? { 'X-Hotel-Context': hotelId } : {},
    }),
};






