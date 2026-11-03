// ===== 화면 그리기 =====
// 날짜 계산은 dday.js에 있고, 여기서는 계산 결과를 화면에 그리고 입대일을 저장한다.
// (index.html에서 dday.js를 먼저 불러온다)

// 화면 요소
const startInput = document.getElementById("start");
const messageEl = document.getElementById("message");
const resultEl = document.getElementById("result");
const ddayEl = document.getElementById("dday");
const endDateEl = document.getElementById("end-date");
const totalBarEl = document.getElementById("total-bar");
const totalPercentEl = document.getElementById("total-percent");
const totalDaysEl = document.getElementById("total-days");
const rankTitleEl = document.getElementById("rank-title");
const rankListEl = document.getElementById("ranks");

// 태그 이름, class, 글자로 요소를 하나 만든다. (같은 코드를 여러 번 쓰지 않으려고)
function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

// 약장 요소 만들기 (막대 개수 = 계급)
function createInsignia(bars) {
  const insignia = createEl("div", "insignia");
  for (let i = 0; i < bars; i++) {
    insignia.appendChild(createEl("span", "bar"));
  }
  return insignia;
}

// 진행률 바 요소 만들기
function createProgressBar(percent) {
  const track = createEl("div", "progress small");
  const bar = createEl("div", "progress-bar");
  bar.style.width = `${percent}%`;
  track.appendChild(bar);
  return track;
}

// 전체 복무 요약 그리기
function renderSummary(start, endDate, today) {
  const totalDays = daysBetween(start, endDate) + 1;
  const passed = Math.min(totalDays, Math.max(0, daysBetween(start, today) + 1));
  const percent = calcProgress(start, addDays(endDate, 1), today);

  ddayEl.textContent = formatDday(endDate, today);
  endDateEl.textContent = `전역일 ${formatDate(endDate)}`;
  totalBarEl.style.width = `${percent}%`;
  totalPercentEl.textContent = `${percent.toFixed(1)}%`;
  totalDaysEl.textContent = `${passed} / ${totalDays}일`;
}

// 계급 목록 위의 제목
function rankTitle(promotions, currentIndex, endDate, today) {
  if (currentIndex === -1) return "아직 입대 전이에요";
  if (endDate < today) return "전역을 축하합니다! 🎉";
  return `현재 계급: ${promotions[currentIndex].name}`;
}

// 계급 하나 아래에 나오는 상태 문구
function rankStatusText(promotion, state, percent, isLast, today) {
  if (state === "done") return "완료";
  if (state === "current") {
    const next = isLast ? "전역" : "다음 진급";
    return `${percent.toFixed(1)}% · ${next}까지 ${daysBetween(today, promotion.until)}일`;
  }
  return formatDday(promotion.date, today);
}

// 계급 목록 그리기
function renderRanks(promotions, currentIndex, endDate, today) {
  rankTitleEl.textContent = rankTitle(promotions, currentIndex, endDate, today);
  rankListEl.innerHTML = "";

  promotions.forEach((p, i) => {
    const state = getRankState(p, today); // 'done' / 'current' / 'upcoming'
    const percent = calcProgress(p.date, p.until, today);
    const isLast = i === promotions.length - 1;

    // 이름 + 진급일
    const head = createEl("div", "rank-head");
    head.append(createEl("span", "rank-name", p.name), createEl("span", "rank-date", formatDate(p.date)));

    const body = createEl("div", "rank-body");
    body.append(
      head,
      createProgressBar(percent),
      createEl("div", "rank-status", rankStatusText(p, state, percent, isLast, today)),
    );

    const item = createEl("li", `rank-item ${state}`);
    item.append(createInsignia(p.bars), body);
    rankListEl.appendChild(item);
  });
}

// 입력값이 바뀔 때마다 다시 계산
function update() {
  if (!startInput.value) {
    messageEl.textContent = "입대일을 선택해주세요.";
    resultEl.hidden = true;
    return;
  }

  const start = parseDate(startInput.value);
  const today = startOfToday();
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

// 날짜를 바꾸면 저장하고 다시 계산
startInput.addEventListener("change", () => {
  saveStartDate(startInput.value);
  update();
});

// 페이지를 열 때 저장된 입대일이 있으면 불러와서 바로 계산
startInput.value = loadStartDate();
update();
