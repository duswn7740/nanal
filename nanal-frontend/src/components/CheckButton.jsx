import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

const IMAGE_PADDING = 8; // 버튼 테두리와 캐릭터 이미지 사이 여백

/**
 * 습관 체크 버튼 컴포넌트
 *
 * 미완료: 빈 네모 (라벤더 테두리)
 * 완료:   같은 네모 안에 캐릭터 이미지
 *
 * 사용 예시:
 *   <CheckButton done={isDone} characterImage={require('../assets/characters/sprout.png')} onPress={handleCheckin} />
 *
 * 이미지 준비되면 characterImage에 require() 또는 { uri: '...' } 전달
 */
export default function CheckButton({
  done = false,
  onPress,
  size = 52,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.box,
        { width: size, height: size, borderRadius: radius.sm },
        done && styles.boxDone,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {done && (
        <Image
          source={require('../../assets/icons/check.png')}
          style={{ width: size - IMAGE_PADDING, height: size - IMAGE_PADDING }}
          resizeMode="contain"
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    borderColor: colors.lavender,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 완료 시 배경을 라벤더 연하게
  boxDone: {
    backgroundColor: colors.lavenderLight,
    borderColor: colors.lavenderDark,
  },
});
