import React from 'react';
import { Modal, SafeAreaView, StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, typography, fontFamily, spacing } from '../theme';

const URLS = {
  terms: 'https://dandy-sound-d37.notion.site/33c20f7c722180ff925ac50ce6fe0a86?source=copy_link',
  privacy: 'https://dandy-sound-d37.notion.site/33c20f7c722180aa8c5fec6127a5f59f?source=copy_link',
};

export default function PolicyModal({ visible, type, onClose }) {
  const isTerms = type === 'terms';
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>{isTerms ? '이용약관' : '개인정보처리방침'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Text style={styles.closeText}>닫기</Text>
          </TouchableOpacity>
        </View>
        {type && <WebView source={{ uri: URLS[type] }} style={styles.webview} />}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: typography.md,
    fontFamily: fontFamily.bold,
    color: colors.textMain,
  },
  closeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  closeText: {
    fontSize: typography.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSub,
  },
  webview: { flex: 1 },
});
