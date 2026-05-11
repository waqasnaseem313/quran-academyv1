// ============================================================
//  QURAN ACADEMY — api.js  (v2 — all bugs fixed)
//  ▶ Replace APPS_SCRIPT_URL below with your Web App URL
// ============================================================

const API = (() => {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwhrWR_c1p_VqVs0QUXtlQ7BT_IlAIaL0m9-E1u3phndQQhf8fbNtx4-dQ40CXawr-p/exec';

  const queue = [];
  let isProcessing = false;
  const RATE_LIMIT_MS = 350;

  function enqueue(action, body = {}, method = 'POST') {
    return new Promise((resolve, reject) => {
      queue.push({ action, body, method, resolve, reject });
      if (!isProcessing) processQueue();
    });
  }

  async function processQueue() {
    if (isProcessing || queue.length === 0) return;
    isProcessing = true;
    while (queue.length > 0) {
      const item = queue.shift();
      try { item.resolve(await rawRequest(item.action, item.body, item.method)); }
      catch (err) { item.reject(err); }
      if (queue.length > 0) await sleep(RATE_LIMIT_MS);
    }
    isProcessing = false;
  }

  async function rawRequest(action, body = {}, method = 'POST') {
    const token = Auth.getToken();
    let url = APPS_SCRIPT_URL, opts = {};
    if (method === 'GET') {
      const p = new URLSearchParams({ action, ...body });
      if (token) p.append('token', token);
      url = url + '?' + p.toString();
      opts = { method: 'GET' };
    } else {
      const payload = { action, ...body };
      if (token) payload.token = token;
      opts = { method:'POST', headers:{'Content-Type':'text/plain'}, body:JSON.stringify(payload) };
    }
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Request failed');
    return data;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  const register        = (d)            => enqueue('register', d);
  const login           = (e, p, r)      => enqueue('login', { email:e, password:p, role:r });
  const verifyToken     = (t)            => enqueue('verifyToken', { token:t });
  const getPendingStudents = ()          => enqueue('getPendingStudents', {}, 'GET');
  const getAllStudents      = ()          => enqueue('getAllStudents', {}, 'GET');
  const approveStudent  = (id, cid)      => enqueue('approveStudent', { studentId:id, classGroupId:cid, approvedBy:Auth.getUserName() });
  const rejectStudent   = (id)           => enqueue('rejectStudent',  { studentId:id });
  const suspendStudent  = (id)           => enqueue('suspendStudent', { studentId:id });
  const addTeacher      = (d)            => enqueue('addTeacher', d);
  const getTeachers     = ()             => enqueue('getTeachers', {}, 'GET');
  const createClass     = (d)            => enqueue('createClass', d);
  const getClasses      = (f={})         => enqueue('getClasses', f, 'GET');
  const updateClass     = (d)            => enqueue('updateClass', d);
  const deleteClass     = (id)           => enqueue('deleteClass', { classId:id });
  const enrollStudent   = (sid, cid)     => enqueue('enrollStudent', { studentId:sid, classId:cid });
  const getEnrollments  = (f={})         => enqueue('getEnrollments', f, 'GET');
  const requestEnrollment = (sid,cid,note) => enqueue('requestEnrollment', { studentId:sid, classId:cid, note:note||'' });
  const getStudentSchedule = (id)        => enqueue('getStudentSchedule', { studentId:id }, 'GET');
  const getAllSchedule   = ()             => enqueue('getAllSchedule', {}, 'GET');
  const markAttendance  = (cid, date, recs) => enqueue('markAttendance', { classId:cid, sessionDate:date, records:recs, markedBy:Auth.getUserId() });
  const getAttendance   = (f={})         => enqueue('getAttendance', f, 'GET');
  const getClassAttendance=(cid,date)    => enqueue('getClassAttendance', { classId:cid, sessionDate:date }, 'GET');
  const addProgress     = (d)            => enqueue('addProgress', { ...d, teacherId:Auth.getUserId() });
  const getProgress     = (id)           => enqueue('getProgress', { studentId:id }, 'GET');
  const createAnnouncement=(d)           => enqueue('createAnnouncement', { ...d, postedBy:Auth.getUserName() });
  const getAnnouncements  = (aud, cid)   => enqueue('getAnnouncements', { audience:aud, classId:cid }, 'GET');
  const getDashboardStats = ()           => enqueue('getDashboardStats', {}, 'GET');

  const QURAN_API = 'https://api.alquran.cloud/v1';
  async function getQuranSurah(n, ed='quran-uthmani') {
    const r = await fetch(`${QURAN_API}/surah/${n}/${ed}`); const d = await r.json();
    if (d.code !== 200) throw new Error('Quran API error'); return d.data;
  }
  async function getQuranSurahList() { const r=await fetch(`${QURAN_API}/surah`); const d=await r.json(); return d.data; }
  async function getQuranAyah(ref, ed='en.asad') { const r=await fetch(`${QURAN_API}/ayah/${ref}/${ed}`); const d=await r.json(); return d.data; }
  async function getPrayerTimes(city, country) {
    const t=new Date(), ds=`${t.getDate()}-${t.getMonth()+1}-${t.getFullYear()}`;
    const r=await fetch(`https://api.aladhan.com/v1/timingsByCity/${ds}?city=${city}&country=${country}&method=2`);
    const d=await r.json(); return d.data;
  }

  return {
    register, login, verifyToken,
    getPendingStudents, getAllStudents, approveStudent, rejectStudent, suspendStudent,
    addTeacher, getTeachers,
    createClass, getClasses, updateClass, deleteClass,
    enrollStudent, getEnrollments, requestEnrollment,
    getStudentSchedule, getAllSchedule,
    markAttendance, getAttendance, getClassAttendance,
    addProgress, getProgress,
    createAnnouncement, getAnnouncements,
    getDashboardStats,
    getQuranSurah, getQuranSurahList, getQuranAyah, getPrayerTimes,
    isConfigured: () => !APPS_SCRIPT_URL.includes('YOUR_SCRIPT_ID')
  };
})();


// ============================================================
//  AUTH
// ============================================================
const Auth = (() => {
  const T='qa_token', U='qa_user', R='qa_role';
  const saveSession  = (tok,user,role) => { localStorage.setItem(T,tok); localStorage.setItem(U,JSON.stringify(user)); localStorage.setItem(R,role); };
  const clearSession = () => [T,U,R].forEach(k=>localStorage.removeItem(k));
  const getToken     = () => localStorage.getItem(T);
  const getUser      = () => { try{return JSON.parse(localStorage.getItem(U));}catch{return null;} };
  const getRole      = () => localStorage.getItem(R);
  const isLoggedIn   = () => !!getToken();
  const getUserId    = () => { const u=getUser(); return u ? (u.ID||u.AdminID||'') : ''; };
  const getUserName  = () => { const u=getUser(); return u ? (u.FullName||'Unknown') : 'Unknown'; };
  const getNormalisedRole = () => { const r=getRole(); return r==='superadmin'?'admin':r; };

  async function login(email, password, role) {
    const res = await API.login(email, password, role);
    saveSession(res.token, res.user, res.role);
    return res;
  }

  function logout() {
    clearSession();
    const depth = window.location.pathname.split('/').filter(Boolean).length;
    const base  = depth > 1 ? '../'.repeat(depth-1) : './';
    window.location.href = base + 'index.html';
  }

  function requireAuth(expectedRole) {
    if (!isLoggedIn()) {
      const depth = window.location.pathname.split('/').filter(Boolean).length;
      const base  = depth > 1 ? '../'.repeat(depth-1) : './';
      window.location.href = base + 'index.html';
      return false;
    }
    const norm = getNormalisedRole();
    // 'classroom' allows student + teacher + admin
    if (expectedRole === 'classroom') return (norm==='student'||norm==='teacher'||norm==='admin');
    if (expectedRole && norm !== expectedRole) {
      const depth = window.location.pathname.split('/').filter(Boolean).length;
      const base  = depth > 1 ? '../'.repeat(depth-1) : './';
      const map   = { admin:base+'admin/dashboard.html', teacher:base+'teacher/dashboard.html', student:base+'student/dashboard.html' };
      window.location.href = map[norm] || base+'index.html';
      return false;
    }
    return true;
  }

  return { saveSession, clearSession, getToken, getUser, getRole, getNormalisedRole, getUserId, getUserName, isLoggedIn, login, logout, requireAuth };
})();


// ============================================================
//  UTILS
// ============================================================
const Utils = (() => {

  function toast(msg, type='info', dur=3500) {
    const ex=document.querySelector('.qa-toast'); if(ex)ex.remove();
    const el=document.createElement('div');
    el.className=`qa-toast qa-toast--${type}`;
    el.innerHTML=`<span class="qa-toast__icon">${{success:'✓',error:'✕',warning:'⚠',info:'ℹ'}[type]||'ℹ'}</span><span>${msg}</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(()=>el.classList.add('qa-toast--show'));
    setTimeout(()=>{el.classList.remove('qa-toast--show');setTimeout(()=>el.remove(),300);},dur);
  }

  function showLoader(text='Loading...') {
    let el=document.getElementById('qa-loader');
    if(!el){el=document.createElement('div');el.id='qa-loader';
      el.innerHTML=`<div class="qa-loader__backdrop"><div class="qa-loader__box"><div class="qa-loader__spinner"></div><p>${text}</p></div></div>`;
      document.body.appendChild(el);}
    el.style.display='flex';
  }
  function hideLoader(){const el=document.getElementById('qa-loader');if(el)el.style.display='none';}

  // ── Predefined time slots — same on EVERY page ────────────
  // Stored as "HH:MM" (24h local time) — simple, no UTC confusion
  const TIME_SLOTS = [
    {value:'06:00',label:'Fajr Time   — 6:00 AM'},
    {value:'07:00',label:'Morning     — 7:00 AM'},
    {value:'08:00',label:'Morning     — 8:00 AM'},
    {value:'09:00',label:'Morning     — 9:00 AM'},
    {value:'10:00',label:'Late Morning — 10:00 AM'},
    {value:'11:00',label:'Late Morning — 11:00 AM'},
    {value:'12:00',label:'Noon        — 12:00 PM'},
    {value:'13:00',label:'Afternoon   — 1:00 PM'},
    {value:'14:00',label:'Afternoon   — 2:00 PM'},
    {value:'15:00',label:'Asr Time    — 3:00 PM'},
    {value:'16:00',label:'Late Afternoon — 4:00 PM'},
    {value:'17:00',label:'Evening     — 5:00 PM'},
    {value:'18:00',label:'Maghrib     — 6:00 PM'},
    {value:'19:00',label:'Evening     — 7:00 PM'},
    {value:'20:00',label:'Night       — 8:00 PM'},
    {value:'21:00',label:"Isha Time   — 9:00 PM"},
    {value:'22:00',label:'Night       — 10:00 PM'},
  ];

  // Build a <select> element's options from TIME_SLOTS
  function populateTimeSelect(selectEl, selectedValue='') {
    selectEl.innerHTML = '<option value="">Select time...</option>';
    TIME_SLOTS.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.value;
      opt.textContent = s.label;
      if (s.value === selectedValue) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  // Display class time — robust, never throws "Invalid time"
  function formatClassTime(timeStr) {
    if (!timeStr || timeStr==='undefined'||timeStr==='null'||timeStr==='—') return '—';
    const s = String(timeStr).trim();
    // "HH:MM" 24h format → convert to locale 12h display
    const match = s.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      try {
        const h=parseInt(match[1]), m=parseInt(match[2]);
        const d=new Date(); d.setHours(h,m,0,0);
        return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      } catch { return s; }
    }
    // Label stored (old data) — return as-is
    return s;
  }

  // Alias kept for backward compat
  const utcToLocal = formatClassTime;

  function formatDate(ds) {
    if (!ds) return '';
    try { return new Date(ds).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }
    catch { return String(ds); }
  }

  function parseDays(raw) {
    if (!raw) return [];
    try { return typeof raw==='string' ? JSON.parse(raw) : (Array.isArray(raw)?raw:[]); }
    catch { return []; }
  }

  function daysDisplay(raw) {
    const n=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return parseDays(raw).map(d=>typeof d==='number'?n[d]:d).join(', ');
  }

  function timeUntilClass(timeStr, daysOfWeek) {
    if (!timeStr||!daysOfWeek) return null;
    try {
      const days=parseDays(daysOfWeek); if(!days.length) return null;
      const match=String(timeStr).match(/^(\d{1,2}):(\d{2})$/); if(!match) return null;
      const h=parseInt(match[1]), m=parseInt(match[2]);
      const now=new Date(); let minDiff=Infinity;
      days.forEach(day=>{
        const next=new Date(); next.setHours(h,m,0,0);
        const dd=((day-now.getDay())+7)%7; next.setDate(next.getDate()+dd);
        if(next<=now) next.setDate(next.getDate()+7);
        const diff=(next-now)/60000; if(diff<minDiff) minDiff=diff;
      });
      if(!isFinite(minDiff)||minDiff<0) return null;
      if(minDiff<10)  return 'Starting now!';
      if(minDiff<60)  return `In ${Math.round(minDiff)} min`;
      const hrs=Math.round(minDiff/60);
      return hrs<24 ? `In ${hrs}h` : `In ${Math.round(hrs/24)}d`;
    } catch { return null; }
  }

  function isValidEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);}
  function capitalize(s){return s?s.charAt(0).toUpperCase()+s.slice(1):'';}
  function truncate(s,n=80){return s&&s.length>n?s.slice(0,n)+'...':s;}
  function sanitize(str){const d=document.createElement('div');d.textContent=str||'';return d.innerHTML;}
  function buildHeatmap(recs){const m={};recs.forEach(r=>{m[r.SessionDate]=r.Status;});return m;}
  function initialsAvatar(name,size=40){
    const i=(name||'U').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase();
    return `<div class="qa-avatar" style="width:${size}px;height:${size}px;">${i}</div>`;
  }
  function islamicGreeting(){const h=new Date().getHours();return h<12?'صباح الخير — Good Morning':h<17?'مساء الخير — Good Afternoon':'مساء النور — Good Evening';}
  async function withLoader(fn,text='Please wait...'){showLoader(text);try{return await fn();}finally{hideLoader();}}

  return {
    toast, showLoader, hideLoader, withLoader,
    TIME_SLOTS, populateTimeSelect, formatClassTime, utcToLocal,
    formatDate, parseDays, daysDisplay, timeUntilClass,
    isValidEmail, capitalize, truncate, sanitize, buildHeatmap, initialsAvatar, islamicGreeting
  };
})();
