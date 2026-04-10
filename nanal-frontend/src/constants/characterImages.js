export const CHARACTER_IMAGES = {
  꽃: {
    1: require('../../assets/avatar/flower_lv1.png'),
    2: require('../../assets/avatar/flower_lv2.png'),
    3: require('../../assets/avatar/flower_lv3.png'),
    4: require('../../assets/avatar/flower_lv4.png'),
    5: require('../../assets/avatar/flower_lv5.png'),
    6: require('../../assets/avatar/flower_lv6.png'),
    7: require('../../assets/avatar/flower_lv7.png'),
  },
  장미: {
    1: require('../../assets/avatar/rose_lv1.png'),
    2: require('../../assets/avatar/rose_lv2.png'),
    3: require('../../assets/avatar/rose_lv3.png'),
    4: require('../../assets/avatar/rose_lv4.png'),
    5: require('../../assets/avatar/rose_lv5.png'),
    6: require('../../assets/avatar/rose_lv6.png'),
    7: require('../../assets/avatar/rose_lv7.png'),
  },
  병아리: {
    1: require('../../assets/avatar/chick_lv1.png'),
    2: require('../../assets/avatar/chick_lv2.png'),
    3: require('../../assets/avatar/chick_lv3.png'),
    4: require('../../assets/avatar/chick_lv4.png'),
    5: require('../../assets/avatar/chick_lv5.png'),
    6: require('../../assets/avatar/chick_lv6.png'),
    7: require('../../assets/avatar/chick_lv7.png'),
  },
};

// 이미지가 없는 레벨은 가장 가까운 낮은 레벨로 fallback (이미지 제작 순차 추가 대응)
export function getCharacterImage(name, level) {
  const images = CHARACTER_IMAGES[name];
  if (!images) return null;
  for (let lv = level; lv >= 1; lv--) {
    if (images[lv]) return images[lv];
  }
  return null;
}
