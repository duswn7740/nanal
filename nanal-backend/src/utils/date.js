/**
 * KST(한국 표준시) 날짜 유틸리티
 *
 * Node.js의 Date는 기본적으로 UTC 기준이라
 * 한국 날짜(KST = UTC+9)를 구하려면 9시간을 더해줘야 합니다.
 *
 * 예: UTC 2026-03-26 16:00 → KST 2026-03-27 01:00 (날짜가 달라짐!)
 * 이런 차이 때문에 날짜 관련 로직은 반드시 이 유틸을 통해 처리합니다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // 9시간을 밀리초로 환산

/**
 * 현재 KST 날짜를 'YYYY-MM-DD' 문자열로 반환
 */
function getTodayKST() {
  const kst = new Date(Date.now() + KST_OFFSET_MS);
  return kst.toISOString().slice(0, 10);
}

/**
 * N일 전 KST 날짜를 'YYYY-MM-DD' 문자열로 반환
 * @param {number} days - 몇 일 전인지
 */
function getKSTDateDaysAgo(days) {
  const kst = new Date(Date.now() + KST_OFFSET_MS - days * 24 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/**
 * 어제 KST 날짜를 'YYYY-MM-DD' 문자열로 반환
 */
function getYesterdayKST() {
  return getKSTDateDaysAgo(1);
}

function getTomorrowKST() {
  const kst = new Date(Date.now() + KST_OFFSET_MS + 24 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/**
 * MariaDB의 DATE 컬럼은 JS에서 Date 객체로 오는 경우가 있어
 * 'YYYY-MM-DD' 문자열로 일관되게 변환할 때 사용합니다.
 * @param {Date|string} date
 * @returns {string} 'YYYY-MM-DD'
 */
function normalizeDateStr(date) {
  if (!(date instanceof Date)) return String(date);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// MariaDB DATE 컬럼 → 'YYYY-MM-DD' 문자열 (toISOString 기반, UTC 기준으로 slice)
function normalizeDateField(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

module.exports = { getTodayKST, getYesterdayKST, getTomorrowKST, getKSTDateDaysAgo, normalizeDateStr, normalizeDateField };
