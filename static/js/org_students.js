// org_students.js — fixed and cleaned version
console.log("✅ org_students.js loaded");

document.addEventListener("DOMContentLoaded", () => {
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => Array.from(document.querySelectorAll(s));
    const debounce = (fn, wait = 150) => {
        let t;
        return (...a) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...a), wait);
        };
    };

    // Elements (may be null if not present)
    const toggleBtn = $("#toggleAddStudent");
    const addFormCard = $("#addStudentForm");
    const addForm = $("#addStudentFormEl");
    const cancelBtn = $("#cancelAddStudent");
    const uploadBtn = $("#uploadStudentsBtn");
    const profileInput = $("#profilePicInput");
    const profilePreviewImg = $("#profilePreviewImg");
    const previewContainer = $("#profilePreview");
    const studentsTbody = $("#studentsTableBody");
    const searchInput = $("#searchInput");
    const filterCollege = $("#filterCollege");
    const filterFaculty = $("#filterFaculty");
    const filterDepartment = $("#filterDepartment");
    const sortSelect = $("#sortSelect");
    const totalCountEl = $("#totalStudentsCount");
    const exportCsvBtn = $("#exportCsv");
    const exportPdfBtn = $("#exportPdf");
    const chartEl = document.getElementById("studentsMiniChart");
    const studentsChartCtx = chartEl ? chartEl.getContext("2d") : null;

    // Default student picture — set this in your template before including the script:
    // <script>window.DEFAULT_STUDENT_PIC = "{{ url_for('static', filename='images/default_student.jpg') }}";</script>
    const DEFAULT_STUDENT_PIC = window.DEFAULT_STUDENT_PIC || "/static/images/default_student.jpg";

    // small helper to avoid XSS when inserting plain text
    function escapeHtml(s) {
        return String(s || "").replace(/[&<>"]/g, (c) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
        );
    }

    // add aria labels & title tooltips for icon-only buttons
    function setAriaLabels() {
        $$("button").forEach((btn) => {
            if (!btn.getAttribute("aria-label")) {
                const text = (btn.textContent || "").trim();
                if (text) {
                    btn.setAttribute("aria-label", text);
                    btn.setAttribute("title", text);
                }
            }
        });
    }
    setAriaLabels();

    /* ---------------- Chart helpers ---------------- */
    function createGradient(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, 100);
        g.addColorStop(0, "#22c55e");
        g.addColorStop(1, "#06b6d4");
        return g;
    }

    let studentsChart = null;

    function initChart(count = 0) {
        if (!studentsChartCtx) return;

        const isDark = document.body.classList.contains('dark');

        const backgroundColor = [
            createGradient(studentsChartCtx),
            isDark ? "#374151" /* gray-700 */ : "#d1d5db" /* gray-300 */
        ];

        const data = {
            labels: ["Students"],
            datasets: [{
                data: [count, Math.max(1, 200 - count)],
                backgroundColor: backgroundColor,
                borderWidth: 0,
            }],
        };

        if (studentsChart) studentsChart.destroy();
        studentsChart = new Chart(studentsChartCtx, {
            type: "doughnut",
            data,
            options: {
                cutout: "70%",
                responsive: true,
                plugins: { legend: { display: false } },
                animation: { duration: 1200, easing: "easeOutCubic" },
            },
        });
    }


    function updateTotals() {
        if (!studentsTbody || !totalCountEl) return;
        const rows = Array.from(studentsTbody.querySelectorAll("tr")).filter((r) => r.style.display !== "none");
        totalCountEl.textContent = rows.length;
        initChart(rows.length);
    }

    /* ------------ Toggle Add Form ------------ */
    if (toggleBtn && addFormCard) {
        toggleBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const showing = !addFormCard.classList.contains("hidden");
            if (!showing) {
                addFormCard.classList.remove("hidden");
                requestAnimationFrame(() => addFormCard.classList.add("open"));
                toggleBtn.setAttribute("aria-expanded", "true");
            } else {
                addFormCard.classList.remove("open");
                addFormCard.addEventListener(
                    "transitionend",
                    function _h() {
                        addFormCard.classList.add("hidden");
                        addFormCard.removeEventListener("transitionend", _h);
                    }, { once: true }
                );
                toggleBtn.setAttribute("aria-expanded", "false");
            }
        });
    }

    /* ------------ Profile preview ------------ */
    if (profileInput && profilePreviewImg) {
        profileInput.addEventListener("change", () => {
            const f = profileInput.files && profileInput.files[0];
            if (f) {
                profilePreviewImg.src = URL.createObjectURL(f);
                profilePreviewImg.classList.remove("hidden");
            } else {
                profilePreviewImg.src = "";
                profilePreviewImg.classList.add("hidden");
            }
        });
    }

    /* ------------ Upload students (CSV/XLSX) ------------ */
    if (uploadBtn) {
        const file = document.createElement("input");
        file.type = "file";
        file.accept = ".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel";
        file.style.display = "none";
        document.body.appendChild(file);

        uploadBtn.addEventListener("click", (e) => {
            e.preventDefault();
            file.click();
        });

        file.addEventListener("change", async() => {
            if (!file.files || !file.files[0]) return;
            const fd = new FormData();
            fd.append("file", file.files[0]);

            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            try {
                const res = await fetch("/upload_students", { method: "POST", body: fd });
                const data = await res.json().catch(() => null);
                if (res.ok && data && data.added) {
                    (data.added || []).forEach((s) => appendStudentRow(s));
                    updateFilters();
                    updateTotals();
                    alert("Upload successful");
                } else {
                    alert((data && data.message) ? data.message : "Upload failed, check server logs.");
                }
            } catch (err) {
                console.error(err);
                alert("Upload failed — check console.");
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i><span class="hidden sm:inline">Upload Students</span>';
            }
        });
    }

    /* ------------ Filter & search ------------ */
    function filterRows() {
        if (!studentsTbody) return;
        const q = (searchInput?.value || "").trim().toLowerCase();
        const fCol = filterCollege?.value || "";
        const fFac = filterFaculty?.value || "";
        const fDept = filterDepartment?.value || "";

        Array.from(studentsTbody.querySelectorAll("tr")).forEach((tr) => {
            const cells = tr.querySelectorAll("td");
            const studentId = (cells[1]?.textContent || "").toLowerCase();
            const idx = (cells[2]?.textContent || "").toLowerCase();
            const name = (cells[3]?.textContent || "").toLowerCase();
            const email = (cells[4]?.textContent || "").toLowerCase();
            const college = (cells[5]?.textContent || "").trim();
            const faculty = (cells[6]?.textContent || "").trim();
            const department = (cells[7]?.textContent || "").trim();

            const matchesQ = [studentId, idx, name, email].some((s) => s.includes(q));
            const matchesCol = !fCol || college === fCol;
            const matchesFac = !fFac || faculty === fFac;
            const matchesDept = !fDept || department === fDept;

            tr.style.display = matchesQ && matchesCol && matchesFac && matchesDept ? "" : "none";
        });

        updateTotals();
    }

    if (searchInput) searchInput.addEventListener("input", debounce(filterRows, 120));
    if (filterCollege) filterCollege.addEventListener("change", filterRows);
    if (filterFaculty) filterFaculty.addEventListener("change", filterRows);
    if (filterDepartment) filterDepartment.addEventListener("change", filterRows);

    /* ------------ update filter selects ------------ */
    function updateFilters() {
        if (!studentsTbody) return;
        const cols = new Set(),
            facs = new Set(),
            depts = new Set();
        Array.from(studentsTbody.querySelectorAll("tr")).forEach((tr) => {
            const cells = tr.querySelectorAll("td");
            const college = (cells[5]?.textContent || "").trim();
            const faculty = (cells[6]?.textContent || "").trim();
            const department = (cells[7]?.textContent || "").trim();
            if (college) cols.add(college);
            if (faculty) facs.add(faculty);
            if (department) depts.add(department);
        });

        function fill(select, set) {
            if (!select) return;
            const cur = select.value || "";
            select.innerHTML = '<option value="">All</option>';
            Array.from(set)
                .sort()
                .forEach((v) => {
                    const o = document.createElement("option");
                    o.value = v;
                    o.textContent = v;
                    select.appendChild(o);
                });
            if (cur) select.value = cur;
        }
        fill(filterCollege, cols);
        fill(filterFaculty, facs);
        fill(filterDepartment, depts);
    }

    /* ------------ sorting ------------ */
    function sortTableByColumn(colIndex, asc = true) {
        if (!studentsTbody) return;
        const rows = Array.from(studentsTbody.querySelectorAll("tr")).filter((r) => r.style.display !== "none");
        rows.sort((a, b) => {
            const aText = (a.cells[colIndex]?.textContent || "").trim().toLowerCase();
            const bText = (b.cells[colIndex]?.textContent || "").trim().toLowerCase();
            return asc ? aText.localeCompare(bText) : bText.localeCompare(aText);
        });
        rows.forEach((r) => studentsTbody.appendChild(r));
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            const val = sortSelect.value;
            if (!val) return;
            sortTableByColumn(parseInt(val, 10), true);
        });
    }

    /* ------------ Helper: Add student row to table ------------ */
    function appendStudentRow(student) {
        const studentsTbody = document.querySelector('#studentsTable tbody');
        if (!studentsTbody) return;

        const row = document.createElement('tr');
        row.dataset.id = student.id;

        row.innerHTML = `
        <td>
            <img src="${student.profile_picture || '/static/img/default_profile.png'}"
                 alt="Profile" class="h-10 w-10 rounded-full object-cover">
        </td>
        <td>${student.student_id || ''}</td>
        <td>${student.index_number || ''}</td>
        <td>${student.full_name || ''}</td>
        <td>${student.email || ''}</td>
        <td>${student.phone || ''}</td> <!-- ✅ phone column -->
        <td>${student.level || ''}</td> <!-- ✅ level column -->
        <td>${student.college || ''}</td>
        <td>${student.faculty || ''}</td>
        <td>${student.department || ''}</td>
        <td>
            <button class="edit-student-btn btn btn-sm btn-warning" data-id="${student.id}">Edit</button>
            <button class="delete-student-btn btn btn-sm btn-danger" data-id="${student.id}">Delete</button>
        </td>
    `;

        studentsTbody.appendChild(row);
    }

    /* ------------ Unified Add/Edit Form Submit (fetch) ------------ */
    if (addForm) {
        addForm.addEventListener("submit", async(e) => {
            e.preventDefault();

            const editingId = addForm.dataset.editId || null;
            const url = editingId ? `/org/edit_student/${editingId}` : "/org/add_student";

            const csrfToken =
                addForm.querySelector('[name="csrf_token"]')?.value ||
                document.querySelector('meta[name="csrf-token"]')?.content ||
                "";

            try {
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "X-CSRFToken": csrfToken },
                    body: new FormData(addForm)
                });

                const data = await res.json().catch(() => null);
                if (!res.ok || !data) {
                    alert(data?.message || "Server error saving student.");
                    return;
                }

                if (data.success) {
                    if (editingId) {
                        const row = studentsTbody.querySelector(`tr[data-id="${editingId}"]`);
                        if (row) {
                            const cells = row.cells;
                            cells[0].querySelector("img").src = data.student.profile_picture || cells[0].querySelector("img").src;
                            cells[1].textContent = data.student.student_id || '';
                            cells[2].textContent = data.student.index_number || '';
                            cells[3].textContent = data.student.full_name || '';
                            cells[4].textContent = data.student.email || '';
                            cells[5].textContent = data.student.phone || '';
                            cells[6].textContent = data.student.college || '';
                            cells[7].textContent = data.student.faculty || '';
                            cells[8].textContent = data.student.department || '';
                            cells[9].textContent = data.student.level || '';
                        }
                    } else {
                        appendStudentRow(data.student);
                        updateFilters();
                    }

                    addForm.reset();
                    delete addForm.dataset.editId;
                    addFormCard.classList.add("hidden");
                    updateTotals();
                    setAriaLabels();
                } else {
                    alert(data.message || "Failed to save student.");
                }
            } catch (err) {
                console.error("Error submitting form:", err);
                alert("Network or server error occurred.");
            }
        });
    }

    /* ------------ Cancel Button ------------ */
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            addForm.reset();
            addFormCard.classList.add("hidden");
            delete addForm.dataset.editId;
        });
    }

    /* ------------ Edit/Delete Event Delegation ------------ */
    if (studentsTbody) {
        studentsTbody.addEventListener("click", async(e) => {
            const editBtn = e.target.closest(".edit-student-btn");
            const delBtn = e.target.closest(".delete-student-btn");

            if (editBtn) {
                const row = editBtn.closest("tr");
                if (!row) return;

                const cells = row.cells;
                addForm.dataset.editId = editBtn.dataset.id;
                addForm.elements["student_id"].value = cells[1]?.textContent.trim();
                addForm.elements["index_number"].value = cells[2]?.textContent.trim();
                addForm.elements["full_name"].value = cells[3]?.textContent.trim();
                addForm.elements["email"].value = cells[4]?.textContent.trim();
                addForm.elements["phone"].value = cells[5]?.textContent.trim(); // ✅ phone in edit
                addForm.elements["college"].value = cells[6]?.textContent.trim();
                addForm.elements["faculty"].value = cells[7]?.textContent.trim();
                addForm.elements["department"].value = cells[8]?.textContent.trim();
                addForm.elements["level"].value = cells[9]?.textContent.trim(); // ✅ phone in edit

                const img = row.querySelector("img");
                if (img && profilePreviewImg) {
                    profilePreviewImg.src = img.src;
                    profilePreviewImg.classList.remove("hidden");
                }

                addFormCard.classList.remove("hidden", "open");
                window.scrollTo({ top: addFormCard.offsetTop - 80, behavior: "smooth" });
            }

            if (delBtn) {
                const id = delBtn.dataset.id;
                if (!id || !confirm("Are you sure you want to delete this student?")) return;

                try {
                    const res = await fetch(`/delete_student/${id}`, {
                        method: "POST",
                        headers: { "X-Requested-With": "XMLHttpRequest" }
                    });

                    const data = await res.json().catch(() => null);
                    if (res.ok && data?.success) {
                        delBtn.closest("tr")?.remove();
                        updateFilters();
                        updateTotals();
                    } else {
                        alert(data?.message || "Delete failed");
                    }
                } catch (err) {
                    console.error(err);
                    alert("Delete failed — check console.");
                }
            }
        });
    }

    /* ------------ export shortcuts ------------ */
    if (exportCsvBtn) exportCsvBtn.addEventListener("click", () => { window.location.href = "/export_students?format=csv"; });
    if (exportPdfBtn) exportPdfBtn.addEventListener("click", () => { window.location.href = "/export_students?format=pdf"; });

    // finally sync filters and totals with server-rendered rows
    updateFilters();
    updateTotals();

    // Theme-based table refresh
    function updateTableTheme() {
        const body = document.body;
        if (body.classList.contains("dark-mode")) {
            document.querySelectorAll(".table thead th").forEach(th => th.style.color = "#fff");
        } else {
            document.querySelectorAll(".table thead th").forEach(th => th.style.color = "#333");
        }
    }

    // Run theme check on load
    document.addEventListener("DOMContentLoaded", updateTableTheme);

    // Re-check theme on theme toggle button click
    document.querySelectorAll(".theme-toggle-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            setTimeout(updateTableTheme, 150);
        });
    });


});