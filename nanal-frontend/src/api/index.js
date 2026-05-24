import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://nanal-api.duckdns.org/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
}

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        await AsyncStorage.multiRemove(['token', 'refreshToken']);
        onUnauthorized?.();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
        processQueue(null, data.token);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await AsyncStorage.multiRemove(['token', 'refreshToken']);
        onUnauthorized?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
