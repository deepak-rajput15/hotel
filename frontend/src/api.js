const API_BASE = '/api/v1';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('hotel_saas_token');
  const currentHotelId = localStorage.getItem('hotel_saas_current_hotel_id');

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(currentHotelId ? { 'X-Hotel-ID': currentHotelId } : {}),
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
};
