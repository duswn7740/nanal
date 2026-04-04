import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing, shadow } from '../theme';

/**
 * 공통 카드 컴포넌트
 *
 * 사용 예시:
 *   <Card>
 *     <Text>내용</Text>
 *   </Card>
 *
 *   <Card withShadow padding="lg">
 *     <Text>그림자 있는 넓은 카드</Text>
 *   </Card>
 */
export default function Card({
  children,
  withShadow = false,
  padding = 'md',
  style,
}) {
  return (
    <View style={[
      styles.card,
      withShadow && shadow.sm,
      paddingStyles[padding],
      style,
    ]}>
      {children}
    </View>
  );
}

const paddingStyles = {
  none: { padding: 0 },
  sm:   { padding: spacing.sm },
  md:   { padding: spacing.md },
  lg:   { padding: spacing.lg },
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
