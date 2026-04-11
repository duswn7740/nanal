// 웹 환경에서 react-native-google-mobile-ads 대체 mock
export const BannerAd = () => null;
export const BannerAdSize = { ANCHORED_ADAPTIVE_BANNER: '' };
export const RewardedAd = {
  createForAdRequest: () => ({
    addAdEventListener: () => () => {},
    load: () => {},
    show: () => {},
  }),
};
export const RewardedAdEventType = { LOADED: 'loaded', EARNED_REWARD: 'earned_reward' };
export const AdEventType = { CLOSED: 'closed', ERROR: 'error' };
