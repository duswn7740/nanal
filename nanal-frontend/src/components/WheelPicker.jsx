import React, { useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, typography, fontFamily, radius } from '../theme';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3; // 한 번에 보이는 개수 (선택된 것 위아래 1개씩)

/**
 * 드럼롤 스타일 스크롤 피커
 * items: string[] — 보여줄 항목 배열
 * selectedIndex: number — 현재 선택된 인덱스
 * onSelect: (index) => void
 */
export default function WheelPicker({ items, selectedIndex, onSelect, width = 80 }) {
  const scrollRef = useRef(null);

  const handleMomentumEnd = (e) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    onSelect(clamped);
  };

  const scrollToIndex = (index) => {
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
  };

  return (
    <View style={[styles.container, { width }]}>
      {/* 선택 영역 하이라이트 */}
      <View style={styles.highlight} pointerEvents="none" />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
        onLayout={() => scrollToIndex(selectedIndex)}
      >
        {items.map((item, idx) => (
          <View key={idx} style={styles.item}>
            <Text style={[
              styles.itemText,
              idx === selectedIndex && styles.itemTextSelected,
            ]}>
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: colors.lavenderLight,
    borderRadius: radius.sm,
    zIndex: 0,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: typography.md,
    fontFamily: fontFamily.regular,
    color: colors.textSub,
  },
  itemTextSelected: {
    fontSize: typography.lg,
    fontFamily: fontFamily.bold,
    color: colors.textMain,
  },
});
