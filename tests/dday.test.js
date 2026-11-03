// 날짜 계산이 맞는지 확인하는 테스트
// 실행: node tests/dday.test.js
//
// 따로 설치할 라이브러리 없이 node만 있으면 된다.
// 하나라도 틀리면 ❌를 보여주고 종료 코드 1로 끝난다.

const {
  SERVICE_MONTHS,
  parseDate,
  daysBetween,
  calcEndDate,
  calcPromotions,
  findCurrentRankIndex,
  getRankState,
  calcProgress,
  formatDate,
  formatDday,
} = require("../dday.js");

let failed = 0;

// 기대한 값과 실제 값이 같은지 확인한다.
function check(name, actual, expected) {
  if (actual === expected) {
    console.log(`✅ ${name}`);
  } else {
    console.log(`❌ ${name}\n   기대: ${expected}\n   실제: ${actual}`);
    failed++;
  }
}

// 날짜를 "2027-10-04" 모양 글자로 (비교하기 쉽게)
const ymd = (date) => formatDate(date).slice(0, 10);

// ===== 전역일 =====
// 입대일 + 21개월의 같은 날짜 "전날"
check("전역일: 2026-01-05 입대", ymd(calcEndDate(parseDate("2026-01-05"), SERVICE_MONTHS)), "2027-10-04");
check("전역일: 1일 입대는 전달 말일", ymd(calcEndDate(parseDate("2026-03-01"), SERVICE_MONTHS)), "2027-11-30");
// 2025-05-31 + 21개월 = 2027년 2월인데 31일이 없다 → 그 달의 마지막 날
check("전역일: 31일 입대 → 2월 말일", ymd(calcEndDate(parseDate("2025-05-31"), SERVICE_MONTHS)), "2027-02-28");
// 윤년 2028년 2월에는 29일이 있다
check("전역일: 윤년 2월", ymd(calcEndDate(parseDate("2026-05-30"), SERVICE_MONTHS)), "2028-02-29");
check("전역일: 해를 넘기는 12월 입대", ymd(calcEndDate(parseDate("2025-12-15"), SERVICE_MONTHS)), "2027-09-14");

// ===== 진급일 =====
// 1일이 아닌 날 입대 → 다음 달 1일부터 센다
{
  const start = parseDate("2026-01-05");
  const p = calcPromotions(start, calcEndDate(start, SERVICE_MONTHS));
  check("진급일: 이병 = 입대일", ymd(p[0].date), "2026-01-05");
  check("진급일: 일병", ymd(p[1].date), "2026-04-01");
  check("진급일: 상병", ymd(p[2].date), "2026-10-01");
  check("진급일: 병장", ymd(p[3].date), "2027-04-01");
  check("진급일: 이병이 끝나는 날 = 일병 진급일", ymd(p[0].until), "2026-04-01");
  check("진급일: 병장이 끝나는 날 = 전역 다음 날", ymd(p[3].until), "2027-10-05");
}
// 1일 입대 → 입대일부터 센다
{
  const start = parseDate("2026-03-01");
  const p = calcPromotions(start, calcEndDate(start, SERVICE_MONTHS));
  check("진급일: 1일 입대면 일병이 2개월 뒤", ymd(p[1].date), "2026-05-01");
}

// ===== 현재 계급과 상태 =====
{
  const start = parseDate("2026-01-05");
  const p = calcPromotions(start, calcEndDate(start, SERVICE_MONTHS));
  check("현재 계급: 입대 전", findCurrentRankIndex(p, parseDate("2026-01-04")), -1);
  check("현재 계급: 입대 당일은 이병", findCurrentRankIndex(p, parseDate("2026-01-05")), 0);
  check("현재 계급: 진급 당일부터 일병", findCurrentRankIndex(p, parseDate("2026-04-01")), 1);
  check("현재 계급: 전역 후에도 병장", findCurrentRankIndex(p, parseDate("2028-01-01")), 3);

  const today = parseDate("2026-05-10"); // 일병일 때
  check("상태: 이병은 완료", getRankState(p[0], today), "done");
  check("상태: 일병은 진행 중", getRankState(p[1], today), "current");
  check("상태: 상병은 예정", getRankState(p[2], today), "upcoming");
}

// ===== 진행률 =====
{
  const from = parseDate("2026-01-01");
  const until = parseDate("2026-01-11"); // 10일짜리 기간
  check("진행률: 첫날은 1일차 = 10%", calcProgress(from, until, from), 10);
  check("진행률: 시작 전은 0%", calcProgress(from, until, parseDate("2025-12-01")), 0);
  check("진행률: 끝난 뒤는 100%", calcProgress(from, until, parseDate("2026-02-01")), 100);
}

// ===== 표시 =====
check("D-day: 남음", formatDday(parseDate("2026-01-10"), parseDate("2026-01-01")), "D-9");
check("D-day: 당일", formatDday(parseDate("2026-01-10"), parseDate("2026-01-10")), "D-Day");
check("D-day: 지남", formatDday(parseDate("2026-01-10"), parseDate("2026-01-15")), "D+5");
check("요일 표시", formatDate(parseDate("2027-10-04")), "2027-10-04 (월)");
check("일수: 하루", daysBetween(parseDate("2026-03-01"), parseDate("2026-03-02")), 1);

console.log("");
if (failed === 0) {
  console.log("✅ 모두 통과");
} else {
  console.log(`❌ ${failed}개 실패`);
  process.exitCode = 1;
}
