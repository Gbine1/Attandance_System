// org_lecturer.js
// Adds toggle, search, upload helpers, accessibility fixes, smooth animations, and mobile-friendly buttons.

console.log("✅ org_lecturer.js loaded");

document.addEventListener('DOMContentLoaded', () => {
    // Helpers
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));
    const debounce = (fn, wait = 200) => {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), wait);
        };
    };
    const cancelBtn = $("#cancelAddLecturer");


    // ----------------------------
    // Accessible aria-labels & tooltips for icon buttons
    // ----------------------------
    const setAriaLabels = () => {
        $$('button').forEach(btn => {
            const text = (btn.textContent || '').trim();
            if (!btn.getAttribute('aria-label') && text) {
                btn.setAttribute('aria-label', text);
                btn.setAttribute('title', text); // tooltip
            }
        });
    };
    setAriaLabels();

    // ----------------------------
    // Toggle Add Lecturer Form
    // ----------------------------
    const toggleBtn = $('#toggleAddLecturer');
    const addForm = $('#addLecturerForm');

    if (addForm) {
        addForm.classList.add('collapsible');
    }

    if (toggleBtn && addForm) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (addForm.classList.contains('hidden')) {
                addForm.classList.remove('hidden');
                requestAnimationFrame(() => addForm.classList.add('open'));
                toggleBtn.setAttribute('aria-expanded', 'true');
            } else {
                addForm.classList.remove('open');
                addForm.addEventListener('transitionend', function _h() {
                    addForm.classList.add('hidden');
                    addForm.removeEventListener('transitionend', _h);
                }, { once: true });
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // ----------------------------
    // Search function
    // ----------------------------
    const filterTable = () => {
        const v = $('#searchInput').value.trim().toLowerCase();
        const rows = $$('#lecturersTable tbody tr');
        rows.forEach(row => {
            const txt = row.textContent.toLowerCase();
            row.style.display = txt.includes(v) ? '' : 'none';
        });
    };

    const searchInput = $('#searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterTable, 150));
    }

    // ----------------------------
    // Upload Lecturers
    // ----------------------------
    const uploadBtn = document.querySelector('.btn-gradient-purple');
    if (uploadBtn) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        uploadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });

        fileInput.addEventListener('change', async() => {
            if (!fileInput.files || fileInput.files.length === 0) return;
            const file = fileInput.files[0];
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

            const fd = new FormData();
            fd.append('file', file);

            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            const headers = {};
            if (csrfMeta) {
                headers['X-CSRFToken'] = csrfMeta.getAttribute('content');
            }

            try {
                const res = await fetch('/upload_lecturers', {
                    method: 'POST',
                    body: fd,
                    headers
                });
                if (res.ok) {
                    alert('Upload succeeded — refresh to see new lecturers.');
                } else {
                    alert('Upload failed — check server.');
                }
            } catch (err) {
                console.error('Upload failed', err);
                alert('Upload failed — check console.');
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i> Upload Lecturers';
            }
        });
    }

    // ----------------------------
    // Inline Lecturer Form Submission
    // ----------------------------
    const form = addForm ? addForm.querySelector('form') : null;
    if (form) {
        form.addEventListener('submit', async(e) => {
            e.preventDefault();
            const formData = new FormData(form);

            try {
                const res = await fetch(form.action, {
                    method: 'POST',
                    body: formData
                });

                if (!res.ok) {
                    alert('Error saving lecturer.');
                    return;
                }

                const data = await res.json();
                if (data.success) {
                    // Create new row (dark mode + rounded corners)
                    const tr = document.createElement('tr');
                    tr.className = "bg-white dark:bg-gray-800 border-b dark:border-gray-700 rounded-lg overflow-hidden";

                    tr.innerHTML = `
                        <td class="px-4 py-2 dark:text-gray-300">${data.lecturer.full_name}</td>
                        <td class="px-4 py-2 dark:text-gray-300">${data.lecturer.email}</td>
                        <td class="px-4 py-2 dark:text-gray-300">${data.lecturer.college}</td>
                        <td class="px-4 py-2 dark:text-gray-300">${data.lecturer.faculty}</td>
                        <td class="px-4 py-2 dark:text-gray-300">${data.lecturer.department}</td>
                        <td class="px-4 py-2 text-right flex justify-end gap-2">
                            <button class="btn-outline text-xs edit-btn" aria-label="Edit" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-outline text-xs text-red-500 delete-btn" aria-label="Delete" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    $('#lecturersTable tbody').appendChild(tr);

                    filterTable(); // Re-run search filter for new rows
                    setAriaLabels(); // Refresh tooltips
                    form.reset();
                    addForm.classList.add('hidden');
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    // When adding a new lecturer dynamically
    const newRow = document.createElement('tr');
    newRow.className = "bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700 rounded-lg overflow-hidden";
    newRow.innerHTML = `
        <td class="px-4 py-2 text-gray-900 dark:text-gray-300">${data.full_name}</td>
        <td class="px-4 py-2 text-gray-900 dark:text-gray-300">${data.email}</td>
        <td class="px-4 py-2 text-gray-900 dark:text-gray-300">${data.college}</td>
        <td class="px-4 py-2 text-gray-900 dark:text-gray-300">${data.faculty}</td>
        <td class="px-4 py-2 text-gray-900 dark:text-gray-300">${data.department}</td>
        <td class="px-4 py-2 text-right flex justify-end gap-2">
            <button class="btn-outline text-xs flex items-center gap-1" aria-label="Edit Lecturer" title="Edit Lecturer">
                <i class="fas fa-edit"></i>
                <span class="hidden sm:inline">Edit</span>
            </button>
            <button class="btn-outline text-xs text-red-500 delete-lecturer-btn" data-id="${data.id}" title="Delete Lecturer">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    document.querySelector('#lecturersTableBody').appendChild(newRow);

    /* ------------ cancel button ------------ */
    if (cancelBtn)
        cancelBtn.addEventListener("click", () => {
            addForm.reset();
            addFormCard.classList.add("hidden");
            delete addForm.dataset.editId;
        });

    // data is the object returned from server { id, full_name, email, college, faculty, department }
    function appendLecturerRow(data) {
        const tbody = document.getElementById('lecturersTableBody');
        if (!tbody) return;

        const tr = document.createElement('tr');

        // NOTE: do NOT add bg-white class here
        tr.innerHTML = `
    <td>${escapeHtml(data.full_name)}</td>
    <td>${escapeHtml(data.email)}</td>
    <td>${escapeHtml(data.college)}</td>
    <td>${escapeHtml(data.faculty)}</td>
    <td>${escapeHtml(data.department)}</td>
    <td class="text-right">
      <button class="btn-outline btn-small edit-btn" data-id="${data.id}" title="Edit">
        <i class="fas fa-edit"></i><span class="hidden sm:inline"> Edit</span>
      </button>
      <button class="btn-outline btn-small delete-lecturer-btn" data-id="${data.id}" title="Delete">
        <i class="fas fa-trash"></i><span class="hidden sm:inline"> Delete</span>
      </button>
    </td>
  `;
        tbody.appendChild(tr);
    }

    // tiny helper (very important to avoid XSS)
    function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }


    // ----------------------------
    // Delete Lecturer (AJAX)
    // ----------------------------
    document.addEventListener("DOMContentLoaded", function() {
        const tableBody = document.querySelector("#lecturers-table tbody");

        // Event delegation for delete buttons
        tableBody.addEventListener("click", async function(e) {
            if (e.target.closest(".delete-lecturer-btn")) {
                const btn = e.target.closest(".delete-lecturer-btn");
                const lecturerId = btn.dataset.id;

                if (!lecturerId) {
                    alert("Missing lecturer ID.");
                    return;
                }

                if (!confirm("Are you sure you want to delete this lecturer?")) return;

                try {
                    const response = await fetch(`/delete_lecturer/${lecturerId}`, {
                        method: "POST", // or DELETE if your route supports it
                        headers: { "X-Requested-With": "XMLHttpRequest" },
                    });

                    const result = await response.json();

                    if (result.success) {
                        btn.closest("tr").remove();
                    } else {
                        alert(result.message || "Failed to delete lecturer.");
                    }
                } catch (error) {
                    console.error(error);
                    alert("An error occurred while deleting.");
                }
            }
        });
    });

});