/* attendance_dashboard.js
   Updated: adds geolocation autopick + live detailed student table + session viewing
*/

const sessions = [];               // in-memory sessions (replace with backend later)
let activeSession = null;
let activeTimer = null;
let trendChart = null, snapshotChart = null;

// ---- Helpers ----
function formatTime(s) {
  const hrs = String(Math.floor(s/3600)).padStart(2,'0');
  const mins = String(Math.floor((s%3600)/60)).padStart(2,'0');
  const secs = String(s%60).padStart(2,'0');
  return `${hrs}:${mins}:${secs}`;
}
function nowISO(){ return new Date().toISOString(); }
function shortDateStr(iso){ return new Date(iso).toLocaleString(); }

// ---- Calendar (unchanged) ----
(function calendarModule(){
  const calendarDays = document.querySelector(".calendar-days");
  const monthLabel = document.getElementById("month-label");
  const prev = document.getElementById("prev-month");
  const next = document.getElementById("next-month");
  if(!calendarDays) return;

  let cur = new Date();
  function render(d) {
    const year = d.getFullYear(), month = d.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month+1, 0).getDate();
    const today = new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    monthLabel.textContent = `${months[month]} ${year}`;
    calendarDays.innerHTML = '';
    for(let i=0;i<firstDay;i++) calendarDays.appendChild(document.createElement('div'));
    for(let dnum=1; dnum<= lastDate; dnum++){
      const cell = document.createElement('div');
      cell.className = 'calendar-day';
      cell.textContent = dnum;
      if(dnum=== today.getDate() && month === today.getMonth() && year === today.getFullYear()){
        cell.classList.add('today');
      }
      calendarDays.appendChild(cell);
    }
  }
  render(cur);
  prev?.addEventListener('click', ()=>{ cur.setMonth(cur.getMonth()-1); render(cur); });
  next?.addEventListener('click', ()=>{ cur.setMonth(cur.getMonth()+1); render(cur); });
})();

// ---- DOM refs & modals ----
const btnCreate = document.getElementById('btnCreateSession');
const createModal = document.getElementById('createModal');
const closeCreate = document.getElementById('closeCreate');
const cancelCreate = document.getElementById('cancelCreate');
const createForm = document.getElementById('createForm');

const manualModal = document.getElementById('manualModal');
const btnManualAdd = document.getElementById('btnManualAdd');
const closeManual = document.getElementById('closeManual');
const cancelManual = document.getElementById('cancelManual');
const manualForm = document.getElementById('manualForm');

const btnGetLocation = document.getElementById('btnGetLocation'); // geolocation autopick in modal

// open/close create modal
btnCreate?.addEventListener('click', ()=> createModal.classList.remove('hidden'));
closeCreate?.addEventListener('click', ()=> createModal.classList.add('hidden'));
cancelCreate?.addEventListener('click', ()=> createModal.classList.add('hidden'));

// open/close manual modal
btnManualAdd?.addEventListener('click', ()=> manualModal.classList.remove('hidden'));
closeManual?.addEventListener('click', ()=> manualModal.classList.add('hidden'));
cancelManual?.addEventListener('click', ()=> manualModal.classList.add('hidden'));

// autopick location button in create modal
btnGetLocation?.addEventListener('click', ()=>{
  if(!navigator.geolocation){ alert('Geolocation not supported by browser'); return; }
  btnGetLocation.disabled = true;
  btnGetLocation.textContent = 'Getting…';
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat = pos.coords.latitude.toFixed(6);
    const lon = pos.coords.longitude.toFixed(6);
    // modal fields have ids 'latitude' and 'longitude'
    const latEl = document.getElementById('latitude');
    const lonEl = document.getElementById('longitude');
    if(latEl) latEl.value = lat;
    if(lonEl) lonEl.value = lon;
    btnGetLocation.disabled = false;
    btnGetLocation.textContent = '📍 Use Current Location';
  }, err=>{
    alert('Could not get location: ' + err.message);
    btnGetLocation.disabled = false;
    btnGetLocation.textContent = '📍 Use Current Location';
  }, {timeout:5000, maximumAge:60000});
});

// ---- Create session: capture form -> create session object -> start session ----
createForm?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const course = document.getElementById('courseSelect').value;
  const klass  = document.getElementById('classSelect').value;
  const date   = document.getElementById('sessionDate').value;
  const duration = Number(document.getElementById('sessionDuration').value) || 30;
  const mode = document.getElementById('sessionMode').value || 'in-person';
  const latitude = document.getElementById('latitude')?.value || '';
  const longitude = document.getElementById('longitude')?.value || '';

  const code = 'S'+Math.random().toString(36).slice(2,8).toUpperCase();
  const url = `${location.origin}/attend/${code}`;

  const session = {
    id: Date.now(),
    code, url, course, klass, date: date || new Date().toISOString(),
    duration, mode,
    location: { latitude: latitude || null, longitude: longitude || null },
    attendees: [],
    manualAdds: 0,
    createdAt: nowISO(),
  };

  sessions.unshift(session);             // add to recent sessions
  startSession(session);                 // make it active
  populateRecentTable();
  createModal.classList.add('hidden');
});

// ---- Start Session (activate live UI + timer + share data) ----
function startSession(session){
  // if another session active, end it first (or you can allow multiple — here we end previous)
  if(activeSession && activeSession.id !== session.id){
    endActiveSession();
  }
  activeSession = session;

  // show live UI
  document.querySelector('#liveContent').classList.remove('hidden');
  document.querySelector('#livePanel .empty-state')?.classList.add('hidden');

  document.getElementById('liveTitle').textContent = `${session.course} — ${session.klass}`;
  document.getElementById('liveCourse').textContent = session.course;
  document.getElementById('liveClass').textContent = session.klass;
  document.getElementById('liveMode').textContent = session.mode;
  document.getElementById('liveTotal').textContent = session.attendees.length;
  document.getElementById('livePresent').textContent = session.attendees.length;
  document.getElementById('liveAbsent').textContent = 0;
  document.getElementById('liveManual').textContent = session.manualAdds || 0;

  // share url + qr
  document.getElementById('shareUrl').value = session.url;
  renderQRCode(session.code);

  // timer
  let secondsLeft = Math.max(1, Math.floor(session.duration * 60));
  document.getElementById('liveTimer').textContent = formatTime(secondsLeft);
  if(activeTimer) clearInterval(activeTimer);
  activeTimer = setInterval(()=>{
    secondsLeft--;
    document.getElementById('liveTimer').textContent = formatTime(Math.max(0, secondsLeft));
    if(secondsLeft <= 0){
      clearInterval(activeTimer);
      endActiveSession();
    }
  }, 1000);

  // wire pause/resume & end
  document.getElementById('btnPause').onclick = ()=>{
    if(activeTimer){
      clearInterval(activeTimer); activeTimer = null;
      document.getElementById('btnPause').textContent = 'Resume';
    } else {
      // resume with remaining time small heuristic: 5 minutes if none — safer to restart with stored duration
      startSession(session);
    }
  };
  document.getElementById('btnEnd').onclick = ()=> endActiveSession();

  // render attendee table initially (empty)
  renderLiveStudentTable(session, {active:true});
  updateCharts();
}

// ---- End session ----
function endActiveSession(){
  if(!activeSession) return;
  activeSession.endedAt = nowISO();
  activeSession = null;
  if(activeTimer){ clearInterval(activeTimer); activeTimer = null; }
  document.querySelector('#liveContent').classList.add('hidden');
  document.querySelector('#livePanel .empty-state')?.classList.remove('hidden');
  populateRecentTable();
  updateCharts();
}

// ---- Add attendee helper ----
function addAttendeeToSession(session, attendee){
  attendee.time = attendee.time || nowISO();
  session.attendees.push(attendee);
  populateRecentTable();
  if(activeSession && activeSession.id === session.id){
    // update live counters
    document.getElementById('liveTotal').textContent = session.attendees.length;
    document.getElementById('livePresent').textContent = session.attendees.length;
    document.getElementById('liveManual').textContent = session.manualAdds || 0;
    renderLiveStudentTable(session, {active:true});
  }
  updateCharts();
}

// ---- Render live student table ----
function renderLiveStudentTable(session, opts = {active:false}){
  const tbody = document.querySelector('#liveStudentTable tbody');
  tbody.innerHTML = '';
  (session.attendees || []).forEach(a=>{
    const tr = document.createElement('tr');
    const status = (a.method === 'manual' ? 'Present (manual)' : 'Present');
    const lon = a.longitude !== undefined && a.longitude !== null ? a.longitude : (a.lng || '');
    const lat = a.latitude !== undefined && a.latitude !== null ? a.latitude : (a.lat || '');
    const timeStr = a.time ? new Date(a.time).toLocaleTimeString() : '';
    tr.innerHTML = `
      <td>${a.name || ''}</td>
      <td>${a.id || ''}</td>
      <td>${status}</td>
      <td>${String(lon)}</td>
      <td>${String(lat)}</td>
      <td>${timeStr}</td>
    `;
    tbody.appendChild(tr);
  });

  // if not active, make sure pause/end buttons are hidden to avoid accidentally ending old session
  if(!opts.active){
    document.getElementById('btnPause').style.display = 'none';
    document.getElementById('btnEnd').style.display = 'none';
    document.getElementById('liveTimer').textContent = '--:--:--';
  } else {
    document.getElementById('btnPause').style.display = '';
    document.getElementById('btnEnd').style.display = '';
  }
}

// ---- Manual add flow ----
manualForm?.addEventListener('submit', (e)=>{
  e.preventDefault();
  if(!activeSession){ alert('No active session to add to'); return; }
  const id = document.getElementById('manualId').value.trim();
  const name = document.getElementById('manualName').value.trim();
  if(!id || !name){ alert('Provide ID and name'); return; }

  // Try to capture lecturer's current geolocation for the manual add (non-blocking)
  const finishAdd = (coords) => {
    const attendee = {
      id, name, method: 'manual',
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      time: nowISO()
    };
    activeSession.manualAdds = (activeSession.manualAdds || 0) + 1;
    addAttendeeToSession(activeSession, attendee);
    manualModal.classList.add('hidden');
    manualForm.reset();
  };

  if(navigator.geolocation){
    // try quick geolocation with short timeout
    navigator.geolocation.getCurrentPosition(pos=>{
      finishAdd({ latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) });
    }, err=>{
      // fallback: add without coords
      finishAdd(null);
    }, {timeout:4000});
  } else {
    finishAdd(null);
  }
});

// ---- QR render (placeholder) ----
function renderQRCode(code){
  const block = document.getElementById('qrBlock');
  if(!block) return;
  block.innerHTML = '';
  const svg = `<svg width="110" height="110" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR">
    <rect width="110" height="110" rx="8" fill="#fff"/>
    <rect x="8" y="8" width="94" height="94" rx="6" fill="#111"/>
    <text x="55" y="64" font-size="14" text-anchor="middle" fill="#fff" font-family="monospace">${code}</text>
  </svg>`;
  block.insertAdjacentHTML('beforeend', svg);
}

// ---- Recent sessions table rendering & actions ----
function populateRecentTable(){
  const tbody = document.querySelector('#recentTable tbody');
  tbody.innerHTML = '';
  sessions.slice(0,20).forEach(s=>{
    const tr = document.createElement('tr');
    const presentCount = s.attendees ? s.attendees.length : 0;
    const absentCount = 0; // not tracking absents here yet
    tr.innerHTML = `
      <td>${s.course}</td>
      <td>${shortDateStr(s.date)}</td>
      <td>${presentCount}</td>
      <td>${absentCount}</td>
      <td class="actions">
        <button class="btn-ghost" data-id="${s.id}" onclick="loadSessionToLive(${s.id}, false)">View</button>
        <button class="btn-ghost" data-id="${s.id}" onclick="exportSession(${s.id})">Export</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
window.populateRecentTable = populateRecentTable;

// ---- Load session to live panel for viewing (activate=false for read-only) ----
window.loadSessionToLive = function(id, activate = false){
  const s = sessions.find(x => x.id === id);
  if(!s){ alert('Session not found'); return; }
  if(activate){
    startSession(s);
    return;
  }
  // show session details in live area (read-only)
  document.querySelector('#liveContent').classList.remove('hidden');
  document.querySelector('#livePanel .empty-state')?.classList.add('hidden');

  document.getElementById('liveTitle').textContent = `${s.course} — ${s.klass}`;
  document.getElementById('liveCourse').textContent = s.course;
  document.getElementById('liveClass').textContent = s.klass;
  document.getElementById('liveMode').textContent = s.mode || '';
  document.getElementById('liveTotal').textContent = s.attendees.length || 0;
  document.getElementById('livePresent').textContent = s.attendees.length || 0;
  document.getElementById('liveAbsent').textContent = 0;
  document.getElementById('liveManual').textContent = s.manualAdds || 0;

  // share/qr still shown
  document.getElementById('shareUrl').value = s.url;
  renderQRCode(s.code || '----');

  // render attendees table in read-only mode
  renderLiveStudentTable(s, {active:false});
};

// ---- Export single session ----
window.exportSession = function(id){
  const s = sessions.find(x=> x.id === id);
  if(!s) return;
  const rows = [['id','name','method','time','latitude','longitude']];
  (s.attendees || []).forEach(a=>{
    rows.push([a.id||'', a.name||'', a.method||'', a.time||'', a.latitude||'', a.longitude||'']);
  });
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = `${s.course.replace(/\s+/g,'_')}_${s.id}.csv`; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
};

// ---- Quick start & simulate scan ----
document.getElementById('btnQuickStart')?.addEventListener('click', ()=>{
  const session = {
    id: Date.now(),
    code: 'Q'+Math.random().toString(36).slice(2,6).toUpperCase(),
    url: `${location.origin}/attend/${Math.random().toString(36).slice(2,8)}`,
    course: 'Quick Class',
    klass: 'Walk-in',
    date: new Date().toISOString(),
    duration: 30, mode: 'in-person', attendees:[], manualAdds:0, createdAt: nowISO(),
    location: { latitude: null, longitude: null }
  };
  sessions.unshift(session);
  startSession(session);
  populateRecentTable();
});

document.getElementById('btnScanQr')?.addEventListener('click', ()=>{
  if(!activeSession){ alert('No active session'); return; }
  // simulate student scanning: add attendee with random id & location near session.location
  const baseLat = activeSession.location?.latitude ? Number(activeSession.location.latitude) : 6.683;
  const baseLon = activeSession.location?.longitude ? Number(activeSession.location.longitude) : -1.55;
  const jitter = ()=> (Math.random()*0.002 - 0.001).toFixed(6); // ~ small offset
  const lat = baseLat ? (baseLat + Number(jitter())).toFixed(6) : '';
  const lon = baseLon ? (baseLon + Number(jitter())).toFixed(6) : '';
  const id = 'S'+Math.floor(Math.random()*9000+1000);
  const attendee = { id, name:`Student ${id}`, method:'qr', latitude: lat, longitude: lon, time: nowISO() };
  addAttendeeToSession(activeSession, attendee);
});

// ---- Copy URL button ----
document.getElementById('btnCopyUrl')?.addEventListener('click', ()=>{
  const urlField = document.getElementById('shareUrl');
  urlField.select();
  urlField.setSelectionRange(0, 99999);
  navigator.clipboard?.writeText(urlField.value).then(()=> alert('URL copied to clipboard'));
});

// ---- Charts (keeps previous logic) ----
function updateCharts(){
  // aggregated sample from sessions
  const last = sessions.slice(0,6);
  const labels = last.map(s => s.course);
  const values = last.map(s => Math.min(100, Math.round((s.attendees.length / 40) * 100)));

  if(trendChart){
    trendChart.data.labels = labels;
    trendChart.data.datasets[0].data = values;
    trendChart.update();
  } else {
    const ctx = document.getElementById('trendChart')?.getContext('2d');
    if(ctx){
      trendChart = new Chart(ctx, {
        type:'line',
        data:{ labels, datasets:[{ label:'Attendance %', data:values, tension:0.4, borderWidth:3, fill:true, backgroundColor:'rgba(99,102,241,0.12)', borderColor:'rgba(99,102,241,1)' }]},
        options:{ responsive:true, animation:{ duration:2000 }, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true, max:100 } } }
      });
    }
  }

  // snapshot
  const totalPresent = sessions.reduce((sum,s)=> sum + (s.attendees.length||0), 0);
  const totalPossible = Math.max(1, sessions.length * 30);
  const presentPct = Math.round( (totalPresent / totalPossible) * 100 );
  const absentPct = Math.max(0, 100 - presentPct);

  if(snapshotChart){
    snapshotChart.data.datasets[0].data = [presentPct, absentPct];
    snapshotChart.update();
  } else {
    const ctx2 = document.getElementById('snapshotChart')?.getContext('2d');
    if(ctx2){
      snapshotChart = new Chart(ctx2, {
        type:'doughnut',
        data:{ labels:['Present','Absent'], datasets:[{ data:[presentPct, absentPct], backgroundColor:['#10B981','#EF4444'] }]},
        options:{ responsive:true, animation:{ duration:2000 }, cutout:'70%', plugins:{ legend:{ position:'bottom' } } }
      });
    }
  }
}

// initialize
populateRecentTable();
updateCharts();

// ---- Export helpers (all / range) reused from previous script ----
document.getElementById('btnExportAll')?.addEventListener('click', ()=>{
  const rows = [['session_course','session_date','attendee_id','attendee_name','method','latitude','longitude']];
  sessions.forEach(s=>{
    (s.attendees||[]).forEach(a=> rows.push([s.course,s.date,a.id||'',a.name||'',a.method||'',a.latitude||'',a.longitude||'']));
  });
  if(rows.length===1){ alert('No attendees yet'); return; }
  const csv = rows.map(r=> r.map(cell=> `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `attendance_${Date.now()}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

document.getElementById('btnExportRange')?.addEventListener('click', ()=>{
  const from = document.getElementById('reportFrom').value;
  const to = document.getElementById('reportTo').value;
  if(!from || !to){ alert('Select range'); return; }
  const f = new Date(from), t = new Date(to);
  const rows = [['session_course','session_date','attendee_id','attendee_name','method','latitude','longitude']];
  sessions.forEach(s=>{
    const sd = new Date(s.date);
    if(sd >= f && sd <= t){
      (s.attendees||[]).forEach(a=> rows.push([s.course,s.date,a.id||'',a.name||'',a.method||'',a.latitude||'',a.longitude||'']));
    }
  });
  if(rows.length===1){ alert('No data in range'); return; }
  const csv = rows.map(r=> r.map(c=> `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `attendance_${from}_${to}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});
