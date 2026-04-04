import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ Railway 배포 URL로 교체해줘요 (예: https://nanal-backend.railway.app)
const BASE_URL = 'https://nanal-production.up.railway.app/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// AuthContext가 등록하는 로그아웃 콜백
// 모듈 레벨로 관리해서 순환참조 없이 인터셉터에서 호출 가능
let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// 요청: 토큰 자동 첨부
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 응답: 401 시 토큰 삭제 + 로그인 화면 전환
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export default api;
