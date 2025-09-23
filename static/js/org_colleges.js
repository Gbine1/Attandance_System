document.addEventListener("DOMContentLoaded", () => {
    const addForm = document.getElementById("addCollegeForm");
    const toggleFormBtn = document.getElementById("toggleAddForm");
    const searchInput = document.getElementById("searchCollege");
    const tableBody = document.getElementById("collegesTableBody");

    // Toggle add form
    toggleFormBtn.addEventListener("click", () => {
        addForm.classList.toggle("hidden");
    });

    // Mock data
    const colleges = [
        { name: "College of Science", dean: "Dr. Mensah", faculties: 3, departments: 10, students: 1200, attendance: 85 },
        { name: "College of Engineering", dean: "Prof. Asare", faculties: 4, departments: 15, students: 1800, attendance: 90 }
    ];

    function renderTable(data) {
        tableBody.innerHTML = "";
        data.forEach(college => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${college.name}</td>
                <td>${college.dean}</td>
                <td>${college.faculties}</td>
                <td>${college.departments}</td>
                <td>${college.students}</td>
                <td>${college.attendance}%</td>
                <td>
                    <button class="btn btn-sm btn-primary">View Faculties</button>
                    <button class="btn btn-sm btn-warning">Edit</button>
                    <button class="btn btn-sm btn-danger">Delete</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    renderTable(colleges);

    // Search filter
    searchInput.addEventListener("input", () => {
        const term = searchInput.value.toLowerCase();
        const filtered = colleges.filter(c => c.name.toLowerCase().includes(term));
        renderTable(filtered);
    });

    // Chart
    const ctx = document.getElementById("collegeAttendanceChart").getContext("2d");
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: colleges.map(c => c.name),
            datasets: [{
                label: "Attendance %",
                data: colleges.map(c => c.attendance),
                fill: true,
                borderColor: '#6f42c1',
                backgroundColor: 'rgba(111, 66, 193, 0.1)',
                tension: 0.4,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: getComputedStyle(document.body).getPropertyValue('--text') } } },
            scales: {
                x: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--text') } },
                y: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--text') } }
            }
        }
    });
});