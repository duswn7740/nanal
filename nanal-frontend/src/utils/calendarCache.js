let cache = null;

export function getCalendarCache(year, month) {
  if (!cache) return null;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  if (cache.year === year && cache.month === month && cache.day === todayStr) {
    return cache.data;
  }
  return null;
}

export function setCalendarCache(year, month, data) {
  const today = new Date();
  cache = {
    year,
    month,
    day: `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`,
    data,
  };
}

export function invalidateCalendarCache() {
  cache = null;
}
