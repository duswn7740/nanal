import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '../theme';

/**
 * 새싹이 캐릭터 아바타 컴포넌트
 * 홈 화면 상단, 캐릭터 화면 등에서 사용
 *
 * 사용 예시:
 *   <Avatar size="lg" image={require('../assets/characters/sprout.png')} />
 *   <Avatar size="sm" image={{ uri: 'https://...' }} />
 */

const sizeMap = {
  sm: 48,
  md: 80,
  lg: 120,
  xl: 160,
};

export default function Avatar({ image, size = 'md', style }) {
  const px = sizeMap[size];

  return (
    <View style={[styles.container, { width: px, height: px, borderRadius: px / 2 }, shadow.sm, style]}>
      {image ? (
        <Image source={image} style={styles.image} resizeMode="contain" />
      ) : (
        // 이미지 없을 때 빈 원형 placeholder
        // borderRadius는 컨테이너의 overflow:hidden이 처리하므로 여기선 불필요
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '80%',
    height: '80%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.inactive,
  },
});
