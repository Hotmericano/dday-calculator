// ===== 날짜 계산 =====
// 화면(document)을 전혀 쓰지 않는 계산 함수만 모아 둔다.
// 그래서 브라우저 없이 node로 바로 테스트할 수 있다. (node tests/dday.test.js)

const SERVICE_MONTHS = 21; // 공군 복무 기간 (개월)
const DAY_MS = 1000 * 60 * 60 * 24;

// 계급별 진급 기준 (최저 복무기간, 개월)
// - months: 진급 기산일로부터 해당 계급이 되기까지 걸리는 누적 개월 수
// - 이병 2개월 → 일병 6개월 → 상병 6개월 → 병장 (전역까지)
// 제도가 바뀌면 이 표만 고치면 된다.
const RANKS = [
  { name: "이병", bars: 1, months: 0 },
  { name: "일병", bars: 2, months: 2 },
  { name: "상병", bars: 3, months: 8 },
  { name: "병장", bars: 4, months: 14 },
];

// "2026-01-05" 같은 문자열을 로컬 날짜(자정)로 변환
// new Date("2026-01-05")는 UTC 기준으로 해석되므로 직접 나눠서 만든다.
function parseDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// 오늘 날짜(자정). 시각이 섞이면 일수 계산이 하루씩 어긋날 수 있어서 시·분·초를 버린다.
function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// 날짜에 일수 더하기
function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// 그 달의 1일 (months만큼 뒤로 옮긴 달). 진급일은 항상 1일이라 자주 쓴다.
function firstOfMonth(date, months = 0) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

// 두 날짜 사이의 일수 (b - a)
// 서머타임이 있는 지역에서는 하루가 23·25시간일 수 있어서 반올림한다.
function daysBetween(a, b) {
  return Math.round((b - a) / DAY_MS);
}

// 전역일 계산 (민법의 기간 계산 방식)
// - 입대일에 복무 개월 수를 더한 달에서, 입대일과 같은 날의 "전날"이 전역일
// - 그 달에 같은 날이 없으면(예: 31일 입대 → 2월) 그 달의 마지막 날이 전역일
function calcEndDate(start, months) {
  const day = start.getDate();
  const target = firstOfMonth(start, months);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();

  if (day > lastDay) {
    return new Date(target.getFullYear(), target.getMonth(), lastDay);
  }
  return new Date(target.getFullYear(), target.getMonth(), day - 1);
}

// 진급 기산일
// - 진급은 매월 1일에 이루어진다.
// - 1일에 입대하면 입대일부터, 그 외에는 입대한 다음 달 1일부터 기간을 센다.
function calcPromotionBase(start) {
  return firstOfMonth(start, start.getDate() === 1 ? 0 : 1);
}

// 계급별 진급일 목록 만들기
// - date: 그 계급이 되는 날 (이병은 입대일)
// - until: 그 계급이 끝나는 날 = 다음 진급일 (병장은 전역 다음 날)
function calcPromotions(start, endDate) {
  const base = calcPromotionBase(start);
  const promotions = RANKS.map((rank) => ({
    ...rank,
    date: rank.months === 0 ? start : firstOfMonth(base, rank.months),
  }));

  promotions.forEach((p, i) => {
    const next = promotions[i + 1];
    p.until = next ? next.date : addDays(endDate, 1);
  });
  return promotions;
}

// 오늘 기준 현재 계급 찾기 (진급일이 오늘 이전인 계급 중 가장 높은 것)
// 아직 입대 전이면 -1
function findCurrentRankIndex(promotions, today) {
  let current = -1;
  promotions.forEach((p, i) => {
    if (p.date <= today) current = i;
  });
  return current;
}

// 계급 하나의 상태: 'done'(지난 계급) / 'current'(지금 계급) / 'upcoming'(아직 안 된 계급)
// 화면의 색(class)과 상태 문구가 모두 이 값 하나로 정해진다.
function getRankState(promotion, today) {
  if (promotion.until <= today) return "done";
  if (promotion.date <= today) return "current";
  return "upcoming";
}

// 기간 [from, until) 중 오늘까지 지난 비율 (0 ~ 100)
// - 입대일 당일을 1일차로 센다.
function calcProgress(from, until, today) {
  const total = daysBetween(from, until);
  const passed = daysBetween(from, today) + 1;
  const percent = (passed / total) * 100;
  return Math.min(100, Math.max(0, percent));
}

// 날짜를 "2027-10-04 (월)" 형태로 표시
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${y}-${m}-${d} (${weekday})`;
}

// 남은 일수를 "D-123", "D-Day", "D+5" 형태로 표시
function formatDday(endDate, today) {
  const diff = daysBetween(today, endDate);
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "D-Day";
  return `D+${-diff}`;
}

// node로 테스트할 때 불러올 수 있게 내보낸다. (브라우저에서는 무시된다)
if (typeof module !== "undefined") {
  module.exports = {
    SERVICE_MONTHS,
    RANKS,
    parseDate,
    addDays,
    daysBetween,
    calcEndDate,
    calcPromotionBase,
    calcPromotions,
    findCurrentRankIndex,
    getRankState,
    calcProgress,
    formatDate,
    formatDday,
  };
}
