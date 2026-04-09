import { useEffect, useRef, useCallback } from 'react';
import { RewardedAd, RewardedAdEventType, AdEventType } from 'react-native-google-mobile-ads';
import { REWARDED_AD_ID } from '../constants/adIds';

// 보상형 광고를 로드하고 보여주는 훅
// onRewarded: 광고 시청 완료 시 호출
export function useRewardedAd(onRewarded) {
  const adRef = useRef(null);
  const loadedRef = useRef(false);

  const load = useCallback(() => {
    const ad = RewardedAd.createForAdRequest(REWARDED_AD_ID);
    adRef.current = ad;
    loadedRef.current = false;

    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      loadedRef.current = true;
    });
    const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      onRewarded?.();
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      load(); // 닫히면 다음 광고 미리 로드
    });

    ad.load();

    return () => { unsubLoaded(); unsubEarned(); unsubClosed(); };
  }, [onRewarded]);

  useEffect(() => {
    const unsub = load();
    return unsub;
  }, []);

  const show = useCallback(() => {
    if (loadedRef.current && adRef.current) {
      adRef.current.show();
      return true;
    }
    return false; // 아직 로드 안 됨
  }, []);

  return { show, isLoaded: () => loadedRef.current };
}
