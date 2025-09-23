// dept_dashboard.js

// ===== Calendar =====
function renderCalendar(month, year) {
  const calendarDays = document.querySelector(".calendar-days");
  const monthLabel = document.getElementById("month-label");
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  monthLabel.textContent = `${months[month]} ${year}`;
  calendarDays.innerHTML = "";

  // Fill empty slots
  for (let i = 0; i < firstDay; i++) {
    calendarDays.innerHTML += `<div></div>`;
  }

  // Fill days
  for (let d = 1; d <= lastDate; d++) {
    const isToday =
      d === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();

    calendarDays.innerHTML += `<div class="calendar-day ${
      isToday ? "today" : ""
    }">${d}</div>`;
  }
}

let currentDate = new Date();
renderCalendar(currentDate.getMonth(), currentDate.getFullYear());

document.getElementById("prev-month").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate.getMonth(), currentDate.getFullYear());
});
document.getElementById("next-month").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate.getMonth(), currentDate.getFullYear());
});

// ===== Charts =====
function createCharts(theme) {
  const isDark = theme === "dark";

  // Course Attendance %
  const ctxCourse = document.getElementById("courseAttendanceChart").getContext("2d");
  new Chart(ctxCourse, {
    type: "bar",
    data: {
      labels: ["MATHS101", "PHY102", "CSE103", "EEE104", "BUS201"],
      datasets: [{
        label: "Attendance %",
        data: [95, 60, 85, 70, 88],
        backgroundColor: [
          "rgba(99, 102, 241, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(59, 130, 246, 0.8)"
        ],
        borderRadius: 6,
        barThickness: 40
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 2000 },
      plugins: {
        legend: {
          labels: { color: isDark ? "#fff" : "#333" }
        }
      },
      scales: {
        x: { ticks: { color: isDark ? "#ddd" : "#333" } },
        y: { ticks: { color: isDark ? "#ddd" : "#333" } }
      }
    }
  });

  // Attendance Trend
  const ctxTrend = document.getElementById("attendanceTrendChart").getContext("2d");
  new Chart(ctxTrend, {
    type: "line",
    data: {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      datasets: [{
        label: "Attendance %",
        data: [78, 82, 85, 90],
        borderColor: "rgba(16, 185, 129, 0.9)",
        backgroundColor: "rgba(16, 185, 129, 0.3)",
        tension: 0.4,
        borderWidth: 3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 2000 },
      plugins: {
        legend: { labels: { color: isDark ? "#fff" : "#333" } }
      },
      scales: {
        x: { ticks: { color: isDark ? "#ddd" : "#333" } },
        y: { ticks: { color: isDark ? "#ddd" : "#333" } }
      }
    }
  });
}

// Initialize charts with theme
const theme = document.body.getAttribute("data-theme");
createCharts(theme);
