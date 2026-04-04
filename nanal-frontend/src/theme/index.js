/**
 * 나날 디자인 토큰
 *
 * 모든 색상, 폰트 크기, 간격은 여기서 가져다 씁니다.
 * 색상을 바꾸고 싶으면 이 파일만 수정하면 전체 앱에 반영돼요.
 */

// ─── 색상 ───────────────────────────────────────
export const colors = {
  // 배경
  background: '#F9F9F9',   // 메인 배경 (거의 흰색, 아주 살짝 회색끼)
  surface: '#FFFFFF',      // 카드, 입력창 배경

  // 포인트
  lavender: '#C8BFE7',     // 라벤더 - 버튼, 배지, 강조
  rose: '#E6C1CF',         // 더스티로즈 - 완료 표시, 새싹이 주변

  // 라벤더 계열 (밝기 변형)
  lavenderLight: '#EDE9F7', // 라벤더 연하게 - 선택된 배경 등
  lavenderDark: '#A99DD4',  // 라벤더 진하게 - 눌렸을 때

  // 로즈 계열 (밝기 변형)
  roseLight: '#F5E5EC',    // 로즈 연하게
  roseDark: '#CE9AB3',     // 로즈 진하게

  // 텍스트
  textMain: '#282D33',     // 본문 텍스트
  textSub: '#9BA3AE',      // 부가 정보, 플레이스홀더
  textOnPoint: '#282D33',  // 포인트 색상 위의 텍스트

  // 상태
  inactive: '#E8E4ED',     // 비활성, 미완료, disabled
  border: '#EDE9F7',       // 테두리

  // 새싹이 전용 (UI에는 거의 안 씀)
  sproutGreen: '#6DC96D',

  // 공통
  error: '#E57373',
  white: '#FEFEFE',
};

// ─── 폰트 크기 ───────────────────────────────────
export const typography = {
  xs: 11,
  sm: 13,
  md: 15,   // 기본 본문
  lg: 17,
  xl: 20,
  xxl: 24,
  title: 28,
};

// ─── 폰트 패밀리 ──────────────────────────────────
export const fontFamily = {
  regular: 'Galmuri11',
  bold: 'Galmuri11-Bold',
  title: 'Galmuri14',
};

// ─── 폰트 굵기 ───────────────────────────────────
export const fontWeight = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
};

// ─── 간격 (padding, margin, gap) ──────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─── 모서리 둥글기 ────────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,  // 완전한 원형 (pill 버튼 등)
};

// ─── 그림자 ──────────────────────────────────────
export const shadow = {
  sm: {
    shadowColor: '#C8BFE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,   // Android
  },
  md: {
    shadowColor: '#C8BFE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
};
