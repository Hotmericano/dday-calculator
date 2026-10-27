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

// 날짜에 일수 더하기
function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// 두 날짜 사이의 일수 (b - a)
function daysBetween(a, b) {
  return Math.round((b - a) / DAY_MS);
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
// - date: 그 계급이 되는 날 (이병은 입대일)
// - until: 그 계급이 끝나는 날 = 다음 진급일 (병장은 전역 다음 날)
function calcPromotions(start, endDate) {
  const base = calcPromotionBase(start);
  const promotions = RANKS.map((rank) => ({
    ...rank,
    date:
      rank.months === 0
        ? start
        : new Date(base.getFullYear(), base.getMonth() + rank.months, 1),
  }));

  promotions.forEach((p, i) => {
    const next = promotions[i + 1];
    p.until = next ? next.date : addDays(endDate, 1);
  });
  return promotions;
}

// 오늘 기준 현재 계급 찾기 (진급일이 오늘 이전인 계급 중 가장 높은 것)
function findCurrentRankIndex(promotions, today) {
  let current = -1;
  promotions.forEach((p, i) => {
    if (p.date <= today) current = i;
  });
  return current;
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

// 진행률 바 요소 만들기
function createProgressBar(percent) {
  const track = document.createElement("div");
  track.className = "progress small";
  const bar = document.createElement("div");
  bar.className = "progress-bar";
  bar.style.width = `${percent}%`;
  track.appendChild(bar);
  return track;
}

// 전체 복무 요약 그리기
function renderSummary(start, endDate, today) {
  const totalDays = daysBetween(start, endDate) + 1;
  const passed = Math.min(totalDays, Math.max(0, daysBetween(start, today) + 1));
  const percent = calcProgress(start, addDays(endDate, 1), today);

  document.getElementById("dday").textContent = formatDday(endDate, today);
  document.getElementById("end-date").textContent = `전역일 ${formatDate(endDate)}`;
  document.getElementById("total-bar").style.width = `${percent}%`;
  document.getElementById("total-percent").textContent = `${percent.toFixed(1)}%`;
  document.getElementById("total-days").textContent = `${passed} / ${totalDays}일`;
}

// 계급 목록 그리기
function renderRanks(promotions, currentIndex, endDate, today) {
  const titleEl = document.getElementById("rank-title");
  const listEl = document.getElementById("ranks");
  listEl.innerHTML = "";

  if (currentIndex === -1) {
    titleEl.textContent = "아직 입대 전이에요";
  } else if (endDate < today) {
    titleEl.textContent = "전역을 축하합니다! 🎉";
  } else {
    titleEl.textContent = `현재 계급: ${promotions[currentIndex].name}`;
  }

  promotions.forEach((p, i) => {
    const item = document.createElement("li");
    item.className = "rank-item";
    if (p.until <= today) item.classList.add("done");
    else if (p.date <= today) item.classList.add("current");
    else item.classList.add("upcoming");

    // 이름 + 진급일
    const head = document.createElement("div");
    head.className = "rank-head";
    const name = document.createElement("span");
    name.className = "rank-name";
    name.textContent = p.name;
    const date = document.createElement("span");
    date.className = "rank-date";
    date.textContent = formatDate(p.date);
    head.append(name, date);

    // 상태 문구
    const percent = calcProgress(p.date, p.until, today);
    const status = document.createElement("div");
    status.className = "rank-status";
    if (p.until <= today) {
      status.textContent = "완료";
    } else if (p.date <= today) {
      const next = i < promotions.length - 1 ? "다음 진급" : "전역";
      status.textContent = `${percent.toFixed(1)}% · ${next}까지 ${daysBetween(today, p.until)}일`;
    } else {
      status.textContent = formatDday(p.date, today);
    }

    const body = document.createElement("div");
    body.className = "rank-body";
    body.append(head, createProgressBar(percent), status);

    item.append(createInsignia(p.bars), body);
    listEl.appendChild(item);
  });
}

// 입력값이 바뀔 때마다 다시 계산
function update() {
  const input = document.getElementById("start").value;
  const messageEl = document.getElementById("message");
  const resultEl = document.getElementById("result");

  if (!input) {
    messageEl.textContent = "입대일을 선택해주세요.";
    resultEl.hidden = true;
    return;
  }

  const start = parseDate(input);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = calcEndDate(start, SERVICE_MONTHS);
  const promotions = calcPromotions(start, endDate);
  const currentIndex = findCurrentRankIndex(promotions, today);

  messageEl.textContent = "";
  resultEl.hidden = false;
  renderSummary(start, endDate, today);
  renderRanks(promotions, currentIndex, endDate, today);
}

// ===== 입대일 기억하기 =====
// localStorage: 브라우저에 작은 데이터를 저장해두는 공간 (새로고침하거나 다시 열어도 유지됨)
// 시크릿 모드 등에서는 저장이 막힐 수 있어서 try/catch로 감싼다.
const STORAGE_KEY = "dday-calculator:start";

function saveStartDate(value) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // 저장이 안 되면 그냥 넘어간다 (계산은 정상 동작)
  }
}

function loadStartDate() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch (e) {
    return "";
  }
}

const startInput = document.getElementById("start");

// 날짜를 바꾸면 저장하고 다시 계산
startInput.addEventListener("change", () => {
  saveStartDate(startInput.value);
  update();
});

// 페이지를 열 때 저장된 입대일이 있으면 불러와서 바로 계산
startInput.value = loadStartDate();
update();