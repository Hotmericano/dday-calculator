const SERVICE_MONTHS = 21; // 공군 복무 기간 (개월)

document.getElementById("calc").addEventListener("click", () => {
  const start = new Date(document.getElementById("start").value);
  const today = new Date();

  // TODO 1: 입대일에 SERVICE_MONTHS 개월을 더해서 전역일 구하기
  // TODO 2: 전역일을 "전역일: 2028-07-25" 형태로 end-date에 표시
  // TODO 3: 오늘부터 전역일까지 남은 일수를 구해서 "D-123" 형태로 dday에 표시
});