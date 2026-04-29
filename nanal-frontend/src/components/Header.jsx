import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
import { colors, typography, fontFamily, spacing } from '../theme';

/**
 * 화면 상단 헤더 컴포넌트
 *
 * 사용 예시:
 *   <Header title="나날" />
 *   <Header title="챌린지 추가" onBack={() => navigation.goBack()} />
 *   <Header title="내 정보" right={<TouchableOpacity>...</TouchableOpacity>} />
 */
export default function Header({ title, onBack, right }) {
  return (
    <View style={styles.container}>
      {/* 왼쪽: 뒤로가기 버튼 (없으면 빈 공간으로 중앙 정렬 유지) */}
      <View style={styles.side}>
        {onBack && (
          <TouchableOpacity onPress={onBack} activeOpacity={0.6} style={styles.backButton}>
            <Text style={styles.backText}>{'<'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>{title}</Text>

      {/* 오른쪽: 커스텀 액션 (없으면 빈 공간으로 중앙 정렬 유지) */}
      <View style={styles.side}>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0,
    height: 56 + (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  side: {
    minWidth: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.lg,
    fontFamily: fontFamily.title,
    color: colors.textMain,
  },
  backButton: {
    padding: spacing.xs,
  },
  backText: {
    fontSize: typography.lg,
    fontFamily: fontFamily.bold,
    color: colors.lavenderDark,
  },
});
