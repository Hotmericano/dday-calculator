const SERVICE_MONTHS = 21; // 공군 복무 기간 (개월)
const DAY_MS = 1000 * 60 * 60 * 24;

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

document.getElementById("calc").addEventListener("click", () => {
  const input = document.getElementById("start").value;
  const endDateEl = document.getElementById("end-date");
  const ddayEl = document.getElementById("dday");

  if (!input) {
    endDateEl.textContent = "입대일을 입력해주세요.";
    ddayEl.textContent = "";
    return;
  }

  const start = parseDate(input);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const endDate = calcEndDate(start, SERVICE_MONTHS);

  endDateEl.textContent = `전역일: ${formatDate(endDate)}`;
  ddayEl.textContent = formatDday(endDate, today);
});
