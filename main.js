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

// 전역일 계산 (민법의 기간 계산 방식)
// - 입대일에 복무 개월 수를 더한 달에서, 입대일과 같은 날의 "전날"이 전역일
// - 그 달에 같은 날이 없으면(예: 31일 입대 → 2월) 그 달의 마지막 날이 전역일
function calcEndDate(start, months) {
  const day = start.getDate();
  const target = new Date(start.getFullYear(), start.getMonth() + months, 1);
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
  if (start.getDate() === 1) {
    return new Date(start.getFullYear(), start.getMonth(), 1);
  }
  return new Date(start.getFullYear(), start.getMonth() + 1, 1);
}

// 계급별 진급일 목록 만들기
// 이병은 진급이 아니라 입대일부터 시작이므로 입대일을 그대로 쓴다.
function calcPromotions(start) {
  const base = calcPromotionBase(start);
  return RANKS.map((rank) => ({
    ...rank,
    date:
      rank.months === 0
        ? start
        : new Date(base.getFullYear(), base.getMonth() + rank.months, 1),
  }));
}

// 오늘 기준 현재 계급 찾기 (진급일이 오늘 이전인 계급 중 가장 높은 것)
function findCurrentRankIndex(promotions, today) {
  let current = -1;
  promotions.forEach((p, i) => {
    if (p.date <= today) current = i;
  });
  return current;
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
  const diff = Math.round((endDate - today) / DAY_MS);
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "D-Day";
  return `D+${-diff}`;
}

// 약장 요소 만들기 (막대 개수 = 계급)
function createInsignia(bars) {
  const insignia = document.createElement("div");
  insignia.className = "insignia";
  for (let i = 0; i < bars; i++) {
    const bar = document.createElement("span");
    bar.className = "bar";
    insignia.appendChild(bar);
  }
  return insignia;
}

// 계급 목록 화면에 그리기
function renderRanks(promotions, currentIndex, endDate, today) {
  const titleEl = document.getElementById("rank-title");
  const listEl = document.getElementById("ranks");
  listEl.innerHTML = "";

  if (currentIndex === -1) {
    titleEl.textContent = "아직 입대 전이에요";
  } else if (endDate < today) {
    titleEl.textContent = "전역을 축하합니다!";
  } else {
    titleEl.textContent = `현재 계급: ${promotions[currentIndex].name}`;
  }

  promotions.forEach((p, i) => {
    const item = document.createElement("li");
    item.className = "rank-item";
    if (i < currentIndex) item.classList.add("done");
    if (i === currentIndex) item.classList.add("current");

    const name = document.createElement("span");
    name.className = "rank-name";
    name.textContent = p.name;

    const date = document.createElement("span");
    date.className = "rank-date";
    date.textContent = formatDate(p.date);

    const dday = document.createElement("span");
    dday.textContent = p.date > today ? formatDday(p.date, today) : "";

    item.append(createInsignia(p.bars), name, date, dday);
    listEl.appendChild(item);
  });
}

document.getElementById("calc").addEventListener("click", () => {
  const input = document.getElementById("start").value;
  const endDateEl = document.getElementById("end-date");
  const ddayEl = document.getElementById("dday");

  if (!input) {
    endDateEl.textContent = "입대일을 입력해주세요.";
    ddayEl.textContent = "";
    document.getElementById("rank-title").textContent = "";
    document.getElementById("ranks").innerHTML = "";
    return;
  }

  const start = parseDate(input);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const endDate = calcEndDate(start, SERVICE_MONTHS);

  endDateEl.textContent = `전역일: ${formatDate(endDate)}`;
  ddayEl.textContent = formatDday(endDate, today);

  const promotions = calcPromotions(start);
  const currentIndex = findCurrentRankIndex(promotions, today);
  renderRanks(promotions, currentIndex, endDate, today);
});