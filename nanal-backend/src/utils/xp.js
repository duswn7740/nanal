// 레벨별 누적 XP 기준 (레벨 1=0, 2=100, 3=220 ...)
const LEVEL_THRESHOLDS = [0, 100, 250, 430, 640, 880, 1200];
const MAX_LEVEL = 7;

function getLevelFromExp(exp) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (exp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, MAX_LEVEL);
}

// 현재 레벨 내 진행도 (0~1)
function getLevelProgress(exp) {
  const level = getLevelFromExp(exp);
  if (level >= MAX_LEVEL) return 1;
  const current = LEVEL_THRESHOLDS[level - 1];
  const next = LEVEL_THRESHOLDS[level];
  return (exp - current) / (next - current);
}

// 다음 레벨까지 필요한 XP (최종 레벨이면 null)
function getExpToNextLevel(exp) {
  const level = getLevelFromExp(exp);
  if (level >= MAX_LEVEL) return null;
  return LEVEL_THRESHOLDS[level] - exp;
}

module.exports = { LEVEL_THRESHOLDS, MAX_LEVEL, getLevelFromExp, getLevelProgress, getExpToNextLevel };
