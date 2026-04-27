import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setUnauthorizedHandler } from '../api';
import { registerPushToken } from '../utils/notifications';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 앱 시작 시 AsyncStorage에 저장된 토큰으로 로그인 상태 복원
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const { data } = await api.get('/auth/me');
          setUser(data.user);
          registerPushToken();
        }
      } catch {
        // 토큰 만료 또는 서버 오류 시 토큰 삭제
        await AsyncStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (token, userData) => {
    await AsyncStorage.setItem('token', token);
    setUser(userData);
    registerPushToken();
  };

  const updateUser = (partial) => setUser(prev => ({ ...prev, ...partial }));

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('token');
    setUser(null);
  }, []);

  // 401 응답 시 자동 로그아웃: api 인터셉터에 logout 콜백 등록
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // useMemo: user/isLoading이 바뀔 때만 새 객체 생성 → Context 소비 컴포넌트 불필요한 리렌더 방지
  const value = useMemo(
    () => ({ user, isLoading, login, logout, updateUser }),
    [user, isLoading, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// 다른 컴포넌트에서 useAuth()로 간편하게 사용
export function useAuth() {
  return useContext(AuthContext);
}
