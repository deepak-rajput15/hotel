import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory fallback in case native module is unavailable
const memoryStore = new Map();

export const Storage = {
  async getItem(key) {
    try {
      if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        const value = await AsyncStorage.getItem(key);
        if (value !== null) return value;
      }
    } catch (e) {
      console.warn(`[Storage] AsyncStorage.getItem failed for "${key}", using fallback memory:`, e?.message || e);
    }
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },

  async setItem(key, value) {
    const stringVal = typeof value === 'string' ? value : JSON.stringify(value);
    memoryStore.set(key, stringVal);
    try {
      if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
        await AsyncStorage.setItem(key, stringVal);
      }
    } catch (e) {
      console.warn(`[Storage] AsyncStorage.setItem failed for "${key}", kept in memory:`, e?.message || e);
    }
  },

  async removeItem(key) {
    memoryStore.delete(key);
    try {
      if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
        await AsyncStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[Storage] AsyncStorage.removeItem failed for "${key}":`, e?.message || e);
    }
  },

  async clear() {
    memoryStore.clear();
    try {
      if (AsyncStorage && typeof AsyncStorage.clear === 'function') {
        await AsyncStorage.clear();
      }
    } catch (e) {
      console.warn('[Storage] AsyncStorage.clear failed:', e?.message || e);
    }
  },
};

export default Storage;

