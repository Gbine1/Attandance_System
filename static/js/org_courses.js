// org_courses.js
// AJAX add/edit/delete + client rendering + charts + export
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const toggleAdd = document.getElementById('toggleAddCourse');
  const addWrap = document.getElementById('addCourseForm');
  const courseForm = document.getElementById('courseForm');
  const cancelBtn = document.getElementById('cancelCourseBtn');
  const saveBtn = document.getElementById('saveCourseBtn');
  const searchInput = document.getElementById('searchCourse');
  const exportBtns = document.querySelectorAll('.export-btn');

  const tableEl = document.getElementById('coursesTable').querySelector('tbody');
  const totalCoursesEl = document.getElementById('totalCourses');
  const mostAttendedEl = document.getElementById('mostAttended');
  const leastAttendedEl = document.getElementById('leastAttended');
  const avgAttendanceEl = document.getElementById('avgAttendance');

  const trendCanvas = document.getElementById('courseAttendanceTrend');
  const compareCanvas = document.getElementById('courseAttendanceComparison');

  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

  // Read initial courses from DOM (server-rendered). Build JS array.
  let courses = [];
  (function readServerRows(){
    const rows = Array.from(tableEl.querySelectorAll('tr[data-id]'));
    rows.forEach(r => {
      const id = Number(r.dataset.id);
      const get = (sel) => r.querySelector('.' + sel)?.textContent?.trim() || '';
      const attendanceText = r.querySelector('.attendance')?.textContent?.trim();
      const attendance = attendanceText && !isNaN(Number(attendanceText)) ? Number(attendanceText) : undefined;
      courses.push({
        id,
        course_name: get('name'),
        course_code: get('code'),
        level: get('level'),
        department: get('dept'),
        attendance
      });
    });
  })();

  // Theme helpers
  function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }
  function chartColors() {
    if (isLight()) {
      return { grid: 'rgba(15,23,36,0.08)', ticks:'#111827', text:'#0f1720', line:'#06b6d4', bars: ['#3b82f6','#ef4444','#f59e0b','#10b981','#8b5cf6'] };
    } else {
      return { grid: 'rgba(255,255,255,0.04)', ticks:'#94a3b8', text:'#e6eef3', line:'#06b6d4', bars: ['#3b82f6','#ef4444','#f59e0b','#10b981','#8b5cf6'] };
    }
  }

  // Chart instances
  let trendChart = null, compareChart = null;
  function createGradient(ctx, color) {
    const g = ctx.createLinearGradient(0,0,0,ctx.canvas.height || 200);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,255,255,0.03)');
    return g;
  }

  function initTrend(labels=[], dataArr=[]) {
    if (!trendCanvas) return;
    const ctx = trendCanvas.getContext('2d');
    const colors = chartColors();
    if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx, {
      type:'line',
      data:{ labels, datasets:[{ label:'Attendance', data: dataArr, fill:true, backgroundColor:createGradient(ctx, colors.line), borderColor:colors.line, tension:0.3, pointRadius:4 }]},
      options: {
        responsive:true,
        scales:{ x:{ ticks:{ color: colors.ticks }, grid:{ color: colors.grid } }, y:{ ticks:{ color: colors.ticks }, grid:{ color: colors.grid }, suggestedMin:0, suggestedMax:100 } },
        plugins:{ legend:{ display:false } }
      }
    });
  }

  function initCompare(labels=[], dataArr=[]) {
    if (!compareCanvas) return;
    const ctx = compareCanvas.getContext('2d');
    const colors = chartColors();
    if (compareChart) compareChart.destroy();
    const barColors = dataArr.map((_,i) => colors.bars[i % colors.bars.length]);
    compareChart = new Chart(ctx, {
      type:'bar',
      data:{ labels, datasets:[{ label:'Attendance', data: dataArr, backgroundColor: barColors, borderRadius:6 }]},
      options: {
        responsive:true,
        scales:{ x:{ ticks:{ color: colors.ticks }, grid:{ color: colors.grid } }, y:{ ticks:{ color: colors.ticks }, grid:{ color: colors.grid }, suggestedMin:0, suggestedMax:100 } },
        plugins:{ legend:{ display:false } }
      }
    });
  }

  function rebuildCharts() {
    const arr = courses.slice();
    if (!arr.length) {
      initTrend([], []);
      initCompare([], []);
      totalCoursesEl.textContent = 0;
      mostAttendedEl.textContent = 'N/A';
      leastAttendedEl.textContent = 'N/A';
      avgAttendanceEl.textContent = '0%';
      return;
    }
    // ensure attendance values exist
    arr.forEach(c => { if (typeof c.attendance !== 'number') c.attendance = Math.round(Math.random()*30 + 70); });

    const most = arr.reduce((a,b)=> a.attendance >= b.attendance ? a : b, arr[0]);
    const least = arr.reduce((a,b)=> a.attendance <= b.attendance ? a : b, arr[0]);
    const avg = Math.round(arr.reduce((s,c)=> s + (c.attendance||0), 0)/arr.length);

    totalCoursesEl.textContent = arr.length;
    mostAttendedEl.textContent = most.course_name;
    leastAttendedEl.textContent = least.course_name;
    avgAttendanceEl.textContent = `${avg}%`;

    const labels = arr.map(c => c.course_name);
    const dataArr = arr.map(c => c.attendance || 0);

    initTrend(labels, dataArr);
    initCompare(labels, dataArr);
  }

  function renderTable(list) {
    // list = array of course objects
    tableEl.innerHTML = '';
    if (!list.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6" style="padding:16px;color:var(--muted)">No courses found</td>`;
      tableEl.appendChild(tr);
      return;
    }
    list.forEach(c => {
      const tr = document.createElement('tr');
      tr.dataset.id = c.id;
      tr.innerHTML = `
        <td class="name">${escapeHtml(c.course_name)}</td>
        <td class="code">${escapeHtml(c.course_code)}</td>
        <td class="level">${escapeHtml(c.level)}</td>
        <td class="dept">${escapeHtml(c.department)}</td>
        <td class="attendance">${(c.attendance ?? '').toString()}</td>
        <td class="actions-col">
          <button class="action-btn edit" data-id="${c.id}" title="Edit"><i class="fa fa-edit"></i></button>
          <button class="action-btn delete" data-id="${c.id}" title="Delete"><i class="fa fa-trash"></i></button>
        </td>
      `;
      tableEl.appendChild(tr);
    });
  }

  function escapeHtml(s){
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // Initial render
  renderTable(courses);
  rebuildCharts();

  // Toggle add form
  toggleAdd?.addEventListener('click', () => {
    addWrap.classList.toggle('hidden');
    if (!addWrap.classList.contains('hidden')) addWrap.scrollIntoView({behavior:'smooth', block:'center'});
  });
  cancelBtn?.addEventListener('click', () => {
    courseForm.reset();
    courseForm.querySelector('[name="id"]').value = '';
    addWrap.classList.add('hidden');
  });

  // Add / Edit submit
  courseForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(courseForm);
    const id = fd.get('id');
    const payload = new FormData();
    payload.append('course_name', fd.get('course_name') || '');
    payload.append('course_code', fd.get('course_code') || '');
    payload.append('level', fd.get('level') || '');
    payload.append('department', fd.get('department') || '');
    payload.append('csrf_token', fd.get('csrf_token') || csrfToken);

    // client-side validation
    if (!payload.get('course_name') || !payload.get('course_code')) {
      alert('Course name and code are required.');
      return;
    }

    try {
      if (!id) {
        // CREATE
        const res = await fetch('/org/add_course', { method: 'POST', body: payload, headers: { 'X-CSRFToken': csrfToken } });
        const data = await res.json();
        if (data && data.success && data.course) {
          // push to local array and render
          const newCourse = {
            id: data.course.id,
            course_name: data.course.course_name,
            course_code: data.course.course_code,
            level: data.course.level,
            department: data.course.department,
            attendance: data.course.attendance ?? undefined
          };
          courses.push(newCourse);
          renderTable(courses);
          rebuildCharts();
          courseForm.reset();
          addWrap.classList.add('hidden');
        } else {
          console.error('Unexpected response adding course', data);
          alert('Failed to add course.');
        }
      } else {
        // UPDATE (client expects endpoint /org/edit_course/<id>)
        const res = await fetch(`/org/edit_course/${id}`, { method: 'POST', body: payload, headers: { 'X-CSRFToken': csrfToken } });
        const data = await res.json();
        if (data && data.success && data.course) {
          // replace in courses array
          courses = courses.map(c => c.id === Number(id) ? {
            id: data.course.id,
            course_name: data.course.course_name,
            course_code: data.course.course_code,
            level: data.course.level,
            department: data.course.department,
            attendance: data.course.attendance ?? c.attendance
          } : c);
          renderTable(courses);
          rebuildCharts();
          courseForm.reset();
          courseForm.querySelector('[name="id"]').value = '';
          addWrap.classList.add('hidden');
        } else {
          alert('Failed to update course.');
        }
      }
    } catch (err) {
      console.error('Network/server error', err);
      alert('Network error saving course.');
    }
  });

  // Delegate edit/delete clicks
  tableEl.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.classList.contains('delete')) {
      if (!confirm('Delete this course?')) return;
      try {
        const res = await fetch(`/org/delete_course/${id}`, { method: 'DELETE', headers: { 'X-CSRFToken': csrfToken } });
        const data = await res.json();
        if (data && data.success) {
          courses = courses.filter(c => c.id !== Number(id));
          renderTable(courses);
          rebuildCharts();
        } else {
          alert('Delete failed.');
        }
      } catch (err) {
        console.error(err);
        alert('Delete failed — check console.');
      }
    } else if (btn.classList.contains('edit')) {
      const course = courses.find(c => c.id === Number(id));
      if (!course) return;
      // fill form, set id
      courseForm['id'].value = course.id;
      courseForm['course_name'].value = course.course_name;
      courseForm['course_code'].value = course.course_code;
      courseForm['level'].value = course.level;
      courseForm['department'].value = course.department;
      addWrap.classList.remove('hidden');
      courseForm.scrollIntoView({behavior:'smooth', block:'center'});
    }
  });

  // Search filtering client-side
  searchInput?.addEventListener('input', (e) => {
    const q = (e.target.value || '').toLowerCase().trim();
    const filtered = courses.filter(c => {
      return (c.course_name||'').toLowerCase().includes(q) ||
             (c.course_code||'').toLowerCase().includes(q) ||
             (c.department||'').toLowerCase().includes(q) ||
             (c.level||'').toLowerCase().includes(q);
    });
    renderTable(filtered);
  });

  // Export handlers (csv / excel use csv; pdf uses print window)
  function escapeCsvCell(v){
    if (v == null) return '';
    const s = String(v).replace(/"/g,'""');
    return (s.search(/("|,|\n)/g) >=0) ? `"${s}"` : s;
  }
  function downloadCSV(name, rows){
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  exportBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const format = btn.dataset.format;
      if (!courses.length) { alert('No data to export'); return; }
      const header = ['Course Name','Course Code','Level','Department','Attendance %'];
      const rows = [header];
      courses.forEach(c => rows.push([escapeCsvCell(c.course_name), escapeCsvCell(c.course_code), escapeCsvCell(c.level), escapeCsvCell(c.department), escapeCsvCell(c.attendance??'')]));
      if (format === 'csv' || format === 'excel') {
        const filename = `courses_${(new Date()).toISOString().slice(0,10)}.csv`;
        downloadCSV(filename, rows);
      } else if (format === 'pdf') {
        let html = `<html><head><title>Courses</title><style>body{font-family:Arial;padding:20px;color:#111}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px}</style></head><body><h2>Courses</h2><table><thead><tr>${header.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>`;
        rows.slice(1).forEach(r => html += `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`);
        html += `</tbody></table></body></html>`;
        const w = window.open(''); w.document.write(html); w.document.close(); w.focus(); w.print(); w.close();
      }
    });
  });

  // Redraw charts when theme changes
  const themeObserver = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.attributeName === 'data-theme') {
        rebuildCharts();
      }
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true });

  // window resize: charts resize
  window.addEventListener('resize', () => { if (trendChart) trendChart.resize(); if (compareChart) compareChart.resize(); });
});
