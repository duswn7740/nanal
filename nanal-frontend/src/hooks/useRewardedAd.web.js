// 웹에서는 광고 미지원 - stub
export function useRewardedAd(onRewarded) {
  return {
    show: () => false,
    isLoaded: () => false,
  };
}
