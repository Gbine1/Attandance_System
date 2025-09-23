// Wait until DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // Real-Time Calendar
  // -------------------------
  const calendarElement = document.getElementById("calendar");

  let currentDate = new Date();

  function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();

    // First and last day of month
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // Header
    let calendarHTML = `
      <div class="calendar-header">
        <button id="prevMonth">&lt;</button>
        <div class="month-year">${date.toLocaleString("default", { month: "long" })} ${year}</div>
        <button id="nextMonth">&gt;</button>
      </div>
      <div class="calendar-days">
        <div class="calendar-weekday">Sun</div>
        <div class="calendar-weekday">Mon</div>
        <div class="calendar-weekday">Tue</div>
        <div class="calendar-weekday">Wed</div>
        <div class="calendar-weekday">Thu</div>
        <div class="calendar-weekday">Fri</div>
        <div class="calendar-weekday">Sat</div>
    `;

    // Empty slots before first day
    for (let i = 0; i < firstDay; i++) {
      calendarHTML += `<div></div>`;
    }

    // Days of month
    const today = new Date();
    for (let d = 1; d <= lastDate; d++) {
      const thisDate = new Date(year, month, d);
      const isToday =
        d === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();

      calendarHTML += `<div class="calendar-day ${isToday ? "today" : ""}">${d}</div>`;
    }

    calendarHTML += `</div>`;
    calendarElement.innerHTML = calendarHTML;

    // Event listeners for navigation
    document.getElementById("prevMonth").addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar(currentDate);
    });

    document.getElementById("nextMonth").addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar(currentDate);
    });
  }

  renderCalendar(currentDate);

  // -------------------------
  // Charts (Dummy Data)
  // -------------------------
  const ctxOverall = document.getElementById("overallAttendanceChart");
  if (ctxOverall) {
    new Chart(ctxOverall, {
      type: "doughnut",
      data: {
        labels: ["Present", "Absent"],
        datasets: [
          {
            data: [85, 15],
            backgroundColor: [
              "linear-gradient(135deg, #667eea, #764ba2)",
              "rgba(255, 99, 132, 0.7)"
            ],
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        animation: { duration: 2000 },
        plugins: {
          legend: {
            labels: {
              color: getComputedStyle(document.body).getPropertyValue("--text-color")
            }
          }
        }
      }
    });
  }

  const ctxDept = document.getElementById("departmentAttendanceChart");
  if (ctxDept) {
    new Chart(ctxDept, {
      type: "bar",
      data: {
        labels: ["Telecom", "Computer Eng", "Mechanical", "Civil", "Business"],
        datasets: [
          {
            label: "Attendance %",
            data: [88, 76, 92, 69, 80],
            backgroundColor: "rgba(102, 126, 234, 0.8)",
            borderRadius: 8,
            barThickness: 30
          }
        ]
      },
      options: {
        responsive: true,
        animation: { duration: 2000 },
        scales: {
          x: {
            ticks: { color: getComputedStyle(document.body).getPropertyValue("--text-color") },
            grid: { display: false }
          },
          y: {
            ticks: { color: getComputedStyle(document.body).getPropertyValue("--text-color") },
            grid: { color: "rgba(200,200,200,0.2)" }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: getComputedStyle(document.body).getPropertyValue("--text-color"),
              font: { weight: "bold" }
            }
          }
        }
      }
    });
  }
});
