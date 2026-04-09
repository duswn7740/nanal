import { Platform } from 'react-native';

// 테스트 ID (개발 중 실제 광고 클릭 방지용)
// 빌드 후 실기기에서 테스트할 때는 아래 주석 처리하고 실제 ID 사용
const IS_TEST = __DEV__;

export const BANNER_AD_ID = IS_TEST
  ? 'ca-app-pub-3940256099942544/6300978111'  // Google 공식 테스트 배너 ID
  : 'ca-app-pub-6334368151294945/9274719398';

export const REWARDED_AD_ID = IS_TEST
  ? 'ca-app-pub-3940256099942544/5224354917'  // Google 공식 테스트 보상형 ID
  : 'ca-app-pub-6334368151294945/6810735400';
