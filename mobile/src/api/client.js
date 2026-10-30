import axios from 'axios';
import Storage from '../utils/storage';

export const DEFAULT_API_BASE = 'https://sasapi.u2tech.in/api/v1';

const apiClient = axios.create({
  baseURL: DEFAULT_API_BASE,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Request interceptor for token & multi-tenant hotel ID
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const customBase = await Storage.getItem('@grandstay_custom_api');
      if (customBase) {
        config.baseURL = customBase;
      }

      const token = await Storage.getItem('@grandstay_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const activeHotelId = await Storage.getItem('@grandstay_hotel_id');
      if (activeHotelId && activeHotelId !== 'ALL') {
        config.headers['X-Hotel-Id'] = activeHotelId;
      }
    } catch (e) {
      console.warn('Error reading auth headers from Storage', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await Storage.removeItem('@grandstay_token');
    }
    const customError = {
      message: error.response?.data?.message || error.message || 'Network request failed',
      status: error.response?.status,
      data: error.response?.data,
    };
    return Promise.reject(customError);
  }
);

export const api = {
  // 1. Authentication
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  getProfile: () => apiClient.get('/auth/me'),
  logout: () => apiClient.post('/auth/logout'),

  // 2. Front Office & Rooms
  getFrontOfficeOverview: () => apiClient.get('/front-office/overview'),
  getRooms: () => apiClient.get('/front-office/rooms'),
  createRoom: (payload) => apiClient.post('/front-office/rooms', payload),
  updateRoom: (roomId, payload) => apiClient.put(`/front-office/rooms/${roomId}`, payload),
  updateRoomStatus: (roomId, status) => apiClient.put(`/front-office/rooms/${roomId}/status`, { status }),
  getCalendar: (startDate = '', days = 30) => apiClient.get(`/front-office/rooms/calendar?start_date=${startDate}&days=${days}`),
  getBookings: (status = 'ALL') => apiClient.get(`/front-office/bookings?status=${status}`),
  getBookingDetail: (bookingId) => apiClient.get(`/front-office/bookings/${bookingId}`),
  checkInGuest: (payload) => apiClient.post('/front-office/check-in', payload),
  confirmCheckIn: (bookingId) => apiClient.post(`/front-office/bookings/${bookingId}/confirm-check-in`),
  addFolioCharge: (bookingId, payload) => apiClient.post(`/front-office/bookings/${bookingId}/folio-items`, payload),
  recordFolioPayment: (bookingId, payload) => apiClient.post(`/front-office/bookings/${bookingId}/payments`, payload),
  checkOutGuest: (bookingId, payload) => apiClient.post(`/front-office/bookings/${bookingId}/check-out`, payload),

  // Lost and Found
  getLostAndFound: () => apiClient.get('/front-office/lost-and-found'),
  storeLostItem: (payload) => apiClient.post('/front-office/lost-and-found', payload),
  claimLostItem: (id, payload) => apiClient.post(`/front-office/lost-and-found/${id}/claim`, payload),

  // 3. Finance & Shift Register
  getCurrentShift: (department = 'FRONT_DESK') => apiClient.get(`/shifts/current?department=${department}`),
  openShift: (payload) => apiClient.post('/shifts/open', payload),
  closeShift: (shiftId, payload) => apiClient.post(`/shifts/${shiftId}/close`, payload),
  recordCashTransaction: (shiftId, payload) => apiClient.post(`/shifts/${shiftId}/cash-transaction`, payload),
  listShifts: () => apiClient.get('/shifts'),

  // 4. Restaurant POS & Dining
  getTables: () => apiClient.get('/restaurant/tables'),
  createTable: (payload) => apiClient.post('/restaurant/tables', payload),
  updateTableStatus: (tableId, status) => apiClient.put(`/restaurant/tables/${tableId}/status`, { status }),
  getMenuItems: () => apiClient.get('/restaurant/menu'),
  createMenuItem: (payload) => apiClient.post('/restaurant/menu/items', payload),
  updateMenuItem: (itemId, payload) => apiClient.put(`/restaurant/menu/items/${itemId}`, payload),
  getActiveOrders: () => apiClient.get('/restaurant/orders'),
  getOrderDetail: (orderId) => apiClient.get(`/restaurant/orders/${orderId}`),
  createRestaurantOrder: (payload) => apiClient.post('/restaurant/orders', payload),
  addOrderItems: (orderId, payload) => apiClient.post(`/restaurant/orders/${orderId}/items`, payload),
  settleRestaurantOrder: (orderId, payload) => apiClient.post(`/restaurant/orders/${orderId}/settle`, payload),
  getInHouseRooms: () => apiClient.get('/restaurant/in-house-rooms'),

  // 5. Kitchen Display System (KDS)
  getKitchenKots: () => apiClient.get('/kitchen/kots'),
  getKitchenSummary: () => apiClient.get('/kitchen/summary'),
  updateKotStatus: (orderId, kotNumber, status) => apiClient.put(`/kitchen/kots/${orderId}/${kotNumber}/status`, { status }),
  updateKitchenItemStatus: (itemId, status) => apiClient.put(`/kitchen/items/${itemId}/status`, { status }),

  // 6. WhatsApp & Communications
  sendWhatsAppInvoice: (payload) => apiClient.post('/whatsapp/resend', payload),

  // 6. Reports & Executive Summaries
  getReportsSummary: (period = 'today') => apiClient.get(`/reports/summary?period=${period}`),
  getDailyRevenue: () => apiClient.get('/reports/daily-revenue'),

  // 7. Multi-Tenant Hotels List
  getHotels: () => apiClient.get('/hotels'),
};

export default apiClient;

