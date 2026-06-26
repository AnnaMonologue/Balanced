// 全局基础数据与状态定义
let timerStates = {
chores: { r: false, s: null, t: 0 }, 
phone: { r: false, s: null, t: 0 }, 
literature: { r: false, s: null, t: 0 },
lamoModule: { r: false, s: null, t: 0 }, 
writing: { r: false, s: null, t: 0 },
exercise: { r: false, s: null, t: 0 }  
};
let slackLogs = []; let grindLogs = []; 
let punchRecords = { morning: { in: null, out: null }, afternoon: { in: null, out: null }, evening: { in: null, out: null } };
let globalSleep = { isSleeping: false, startTs: null, inStr: '--:--' };
let todaySleepSecs = 0; let localSleepDisplay = { outStr: '--:--' };
let tasks = []; 
let dailyLife = { meals: [], hygiene: [], transactions: [] }; 
let globalPlans = { course: [], project: [], con: [], comm: [] };
let activeTimerDateKey = new Date().toDateString();
let timerLabels = { literature:'阅读', experiment:'上课', writing:'论文', exercise:'运动' };
let timelineMode = 'pending';
let studyPlanMode = 'pending'; let fanPlanMode = 'pending';
const pendingPlanHides = new Set(); const pendingPlanTimers = new Map();

let historyChartObj = null, energyChartObj = null, taskChartObj = null, financeCompositeChartObj = null;

// 收支类型映射表
const TRANS_MAP = {
'exp_irl': { label: '三次支出', sign: -1, color: 'text-danger', chartCol: '#D99C6A' }, // warning
'exp_fan': { label: '二次支出', sign: -1, color: 'text-danger', chartCol: '#C87971' }, // danger
'inc_irl': { label: '三次收入', sign: 1, color: 'text-success', chartCol: '#8BAA9E' }, // primary
'inc_fan': { label: '二次收入', sign: 1, color: 'text-success', chartCol: '#7BA082' }  // success
};

// 计时器按钮UI配置字典
const T_CFG = {
chores: { id: 'toggle-chores', aTxt: '结束记录摸鱼', dTxt: '开始记录摸鱼', aCls: 'w-full py-2 rounded-lg bg-warning text-white font-bold transition-colors', dCls: 'w-full py-2 rounded-lg bg-warning/20 text-warning font-bold hover:bg-warning/30 transition-colors' },
phone: { id: 'toggle-phone', aTxt: '结束记录拉磨', dTxt: '开始记录拉磨', aCls: 'w-full py-2 rounded-lg bg-entertainment text-white font-bold transition-colors', dCls: 'w-full py-2 rounded-lg bg-entertainment/20 text-entertainment font-bold hover:bg-entertainment/30 transition-colors' },
literature: { id: 'toggle-literature', aTxt: '记录结束', dTxt: '记录开始', aCls: 'w-full py-1.5 mb-3 rounded bg-primary text-white text-sm font-bold transition-colors', dCls: 'w-full py-1.5 mb-3 rounded border border-primary text-primary hover:bg-primary hover:text-white transition-colors text-sm font-bold' },
lamoModule: { id: 'toggle-lamoModule', aTxt: '记录结束', dTxt: '记录开始', aCls: 'w-full py-1.5 mb-3 rounded bg-secondary text-white text-sm font-bold transition-colors', dCls: 'w-full py-1.5 mb-3 rounded border border-secondary text-secondary hover:bg-secondary hover:text-white transition-colors text-sm font-bold' },
writing: { id: 'toggle-writing', aTxt: '记录结束', dTxt: '记录开始', aCls: 'w-full py-1.5 mb-3 rounded bg-warning text-white text-sm font-bold transition-colors', dCls: 'w-full py-1.5 mb-3 rounded border border-warning text-warning hover:bg-warning hover:text-white transition-colors text-sm font-bold' },
exercise: { id: 'toggle-exercise', aTxt: '记录结束', dTxt: '记录开始', aCls: 'w-full py-1.5 mb-3 rounded bg-accent text-white text-sm font-bold transition-colors', dCls: 'w-full py-1.5 mb-3 rounded border border-accent text-accent hover:bg-accent hover:text-white transition-colors text-sm font-bold' }
};

// 工具格式化函数
function getTodayKey(ts = Date.now()) { return new Date(ts).toDateString(); }
function formatDateTime(ts) { const t = new Date(ts); return `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`; }
function formatSecs(s) { const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=Math.floor(s%60); return [h,m,sec].map(v=>v.toString().padStart(2,'0')).join(':'); }
function saveTimerSnapshot(dateKey, states) {
localStorage.setItem(`merged_timer_${dateKey}`, JSON.stringify(states));
const data = JSON.parse(localStorage.getItem(`merged_data_${dateKey}`)) || {};
Object.keys(states).forEach(k => data[k] = states[k].t || 0);
localStorage.setItem(`merged_data_${dateKey}`, JSON.stringify(data));
}
function saveGlobalTimerState() { localStorage.setItem('merged_global_timerState', JSON.stringify({ dateKey: activeTimerDateKey, states: timerStates })); }
function rolloverTimerDay(now = Date.now()) {
const todayKey = getTodayKey(now); if(activeTimerDateKey === todayKey) return false;
const oldDate = new Date(activeTimerDateKey); const todayStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), new Date(now).getDate()).getTime();
if(Number.isNaN(oldDate.getTime())) { activeTimerDateKey = todayKey; saveGlobalTimerState(); return true; }
const firstBoundary = new Date(oldDate.getFullYear(), oldDate.getMonth(), oldDate.getDate() + 1).getTime();
let oldSnapshot = {}; Object.keys(timerStates).forEach(k => { const st = timerStates[k]; const extra = st.r && st.s ? Math.max(0, Math.floor((Math.min(now, firstBoundary) - st.s) / 1000)) : 0; oldSnapshot[k] = { r:false, s:null, t:(st.t || 0) + extra }; });
saveTimerSnapshot(activeTimerDateKey, oldSnapshot);
for(let dayStart = firstBoundary; dayStart < todayStart; dayStart += 86400000) { let dayStates = {}; Object.keys(timerStates).forEach(k => { const st = timerStates[k]; dayStates[k] = { r:false, s:null, t:st.r ? 86400 : 0 }; }); saveTimerSnapshot(getTodayKey(dayStart), dayStates); }
let newStates = {}; Object.keys(timerStates).forEach(k => { const st = timerStates[k]; const start = st.r ? Math.max(todayStart, st.s || todayStart) : null; newStates[k] = { r:st.r, s:start, t:0 }; });
timerStates = newStates; activeTimerDateKey = todayKey; saveTimerSnapshot(todayKey, timerStates); saveGlobalTimerState(); syncAllTimerUIs(); return true;
}
function getElapsed(k) { rolloverTimerDay(); let st = timerStates[k]; let elapsed = st.t; if(st.r && st.s) elapsed += Math.floor((Date.now() - st.s)/1000); return elapsed; }

// 初始化入口
document.addEventListener('DOMContentLoaded', () => {
document.getElementById('current-date').textContent = new Date().toLocaleDateString('zh-CN', { month:'long', day:'numeric', weekday:'long' });
initTheme(); loadAllData(); initTimerLabelEditors(); initTimers(); initSleep(); initTasks(); initNotes(); initBackupTools(); initSyncTools(); renderLifeZone(); renderAllPlans(); setInterval(updateDisplay, 1000);
});

// 日夜间模式切换
function initTheme() { if(localStorage.getItem('merged_theme') === 'dark') document.body.classList.add('dark'); updateThemeButton(); }
function toggleTheme() { document.body.classList.toggle('dark'); localStorage.setItem('merged_theme', document.body.classList.contains('dark') ? 'dark' : 'light'); updateThemeButton(); }
function updateThemeButton() { const isDark = document.body.classList.contains('dark'); const icon = document.getElementById('theme-icon'); const text = document.getElementById('theme-text'); if(icon) icon.className = isDark ? 'fa fa-sun-o' : 'fa fa-moon-o'; if(text) text.textContent = isDark ? '日间' : '夜间'; }

// 页面路由切换
function switchPage(page) {
document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden')); document.querySelectorAll('.nav-btn').forEach(el => el.classList.replace('nav-active', 'nav-inactive'));
document.getElementById('page-' + page).classList.remove('hidden'); document.getElementById('nav-' + page).classList.replace('nav-inactive', 'nav-active');
if (page === 'history') renderHistoryList(); if (page === 'stats') renderStats(7); if (page === 'plan') renderAllPlans(); 
}

// 缓存数据读取
function loadAllData() {
const key = getTodayKey(); const globalTimer = JSON.parse(localStorage.getItem('merged_global_timerState')); const savedStates = JSON.parse(localStorage.getItem(`merged_timer_${key}`));
if(globalTimer && globalTimer.states) { timerStates = globalTimer.states; activeTimerDateKey = globalTimer.dateKey || key; }
else if(savedStates) { timerStates = savedStates; activeTimerDateKey = key; }
else { let latestRunning = null; for(let i=0; i<localStorage.length; i++) { const storageKey = localStorage.key(i); if(!storageKey.startsWith('merged_timer_')) continue; const states = JSON.parse(localStorage.getItem(storageKey)); if(states && Object.values(states).some(s => s.r)) { const dateKey = storageKey.replace('merged_timer_', ''); const time = new Date(dateKey).getTime(); if(!latestRunning || time > latestRunning.time) latestRunning = { states, dateKey, time }; } } if(latestRunning) { timerStates = latestRunning.states; activeTimerDateKey = latestRunning.dateKey; } }
rolloverTimerDay();
slackLogs = JSON.parse(localStorage.getItem(`merged_slackLog_${key}`)) || []; grindLogs = JSON.parse(localStorage.getItem(`merged_grindLog_${key}`)) || [];
punchRecords = JSON.parse(localStorage.getItem(`merged_punch_${key}`)) || { morning:{in:null,out:null}, afternoon:{in:null,out:null}, evening:{in:null,out:null} };
tasks = JSON.parse(localStorage.getItem(`merged_tasks_${key}`)) || []; todaySleepSecs = parseInt(localStorage.getItem(`merged_sleepTot_${key}`)) || 0;
localSleepDisplay = JSON.parse(localStorage.getItem(`merged_sleepDisp_${key}`)) || { outStr: '--:--' };
globalSleep = JSON.parse(localStorage.getItem('merged_global_sleepState')) || { isSleeping: false, startTs: null, inStr: '--:--' };
dailyLife = JSON.parse(localStorage.getItem(`merged_life_${key}`)) || { meals: [], hygiene: [], transactions: [] };
const savedPlans = JSON.parse(localStorage.getItem('merged_global_plans')); if (savedPlans) globalPlans = savedPlans;
const savedLabels = JSON.parse(localStorage.getItem('merged_timer_labels')); if(savedLabels) timerLabels = { ...timerLabels, ...savedLabels };
const savedDataForNotes = JSON.parse(localStorage.getItem(`merged_data_${key}`)) || {};
['literature','experiment','writing','exercise'].forEach(id => { document.getElementById(`${id}-notes`).value = savedDataForNotes[`${id}Notes`] || ''; });
}

// 可自定义的学习/工作分类名称
function syncTimerLabelText() {
Object.keys(timerLabels).forEach(key => { const input = document.getElementById(`label-${key}`); if(input) input.value = timerLabels[key]; const historyLabel = document.getElementById(`hist-label-${key}`); if(historyLabel) historyLabel.textContent = timerLabels[key]; });
}
function saveTimerLabel(key, value) { const fallback = { literature:'阅读', experiment:'上课', writing:'论文', exercise:'运动' }; timerLabels[key] = value.trim() || fallback[key]; localStorage.setItem('merged_timer_labels', JSON.stringify(timerLabels)); syncTimerLabelText(); }
function initTimerLabelEditors() { syncTimerLabelText(); Object.keys(timerLabels).forEach(key => { const input = document.getElementById(`label-${key}`); if(!input) return; input.addEventListener('change', () => saveTimerLabel(key, input.value)); input.addEventListener('blur', () => saveTimerLabel(key, input.value)); input.addEventListener('keydown', e => { if(e.key === 'Enter') input.blur(); }); }); }

// 缓存数据保存
function saveData() {
rolloverTimerDay();
const key = getTodayKey(); localStorage.setItem(`merged_timer_${key}`, JSON.stringify(timerStates));
let dataToSave = {}; for (const k in timerStates) dataToSave[k] = getElapsed(k);
['literature','experiment','writing','exercise'].forEach(id => { dataToSave[`${id}Notes`] = document.getElementById(`${id}-notes`).value; });
localStorage.setItem(`merged_data_${key}`, JSON.stringify(dataToSave)); localStorage.setItem(`merged_slackLog_${key}`, JSON.stringify(slackLogs));
localStorage.setItem(`merged_grindLog_${key}`, JSON.stringify(grindLogs)); localStorage.setItem(`merged_punch_${key}`, JSON.stringify(punchRecords));
localStorage.setItem(`merged_tasks_${key}`, JSON.stringify(tasks)); localStorage.setItem(`merged_sleepTot_${key}`, todaySleepSecs);
localStorage.setItem(`merged_sleepDisp_${key}`, JSON.stringify(localSleepDisplay)); localStorage.setItem('merged_global_sleepState', JSON.stringify(globalSleep));
localStorage.setItem(`merged_life_${key}`, JSON.stringify(dailyLife)); localStorage.setItem('merged_global_plans', JSON.stringify(globalPlans)); saveGlobalTimerState();
}

// 加密同步试用流程，后续把 uploadEncryptedBackup/downloadEncryptedBackup 接到真实后端
const SYNC_PBKDF2_ITERATIONS = 150000;
const SYNC_MOCK_CLOUD_PREFIX = 'merged_mock_cloud_';
// 示例：接入后端后改为 'https://your-sync-api.example.com'；留空时只使用本机模拟云端密文。
const SYNC_API_BASE = '';
function generateSyncCode() {
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let raw = 'BREAD-';
for (let i = 0; i < 8; i++) raw += alphabet[Math.floor(Math.random() * alphabet.length)];
return raw.slice(0, 10) + '-' + raw.slice(10);
}
function bytesToBase64(bytes) {
let binary = '';
bytes.forEach(byte => binary += String.fromCharCode(byte));
return btoa(binary);
}
function base64ToBytes(base64) {
const binary = atob(base64);
const bytes = new Uint8Array(binary.length);
for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
return bytes;
}
async function digestText(text) {
const bytes = new TextEncoder().encode(text);
const hash = await crypto.subtle.digest('SHA-256', bytes);
return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function deriveSyncKey(passphrase, saltBytes) {
const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: saltBytes, iterations: SYNC_PBKDF2_ITERATIONS, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encryptSyncPayload(payload, passphrase, syncCode) {
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const key = await deriveSyncKey(passphrase, salt);
const plaintext = new TextEncoder().encode(JSON.stringify(payload));
const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
return { version: 1, algorithm: 'AES-GCM', kdf: 'PBKDF2-SHA256', iterations: SYNC_PBKDF2_ITERATIONS, syncCode, salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(cipherBuffer)), updatedAt: new Date().toISOString() };
}
async function decryptSyncPayload(packageData, passphrase) {
const salt = base64ToBytes(packageData.salt);
const iv = base64ToBytes(packageData.iv);
const ciphertext = base64ToBytes(packageData.ciphertext);
const key = await deriveSyncKey(passphrase, salt);
const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
return JSON.parse(new TextDecoder().decode(plainBuffer));
}
function getSyncSettings() { return JSON.parse(localStorage.getItem('merged_sync_settings') || 'null'); }
function rememberSyncPassphrase(passphrase) { sessionStorage.setItem('merged_sync_passphrase_session', passphrase); }
function getSessionSyncPassphrase() { return sessionStorage.getItem('merged_sync_passphrase_session') || ''; }
function askForSyncPassphrase() {
const passphrase = getSessionSyncPassphrase() || prompt('请输入同步口令，用于本地加密/解密：');
if (passphrase) rememberSyncPassphrase(passphrase);
return passphrase || '';
}
function setSyncStatus(message, tone = 'info') {
const el = document.getElementById('sync-status');
if (!el) return;
const cls = tone === 'success' ? 'rounded-xl bg-success/10 border border-success/30 p-3 text-xs text-success leading-5' : tone === 'danger' ? 'rounded-xl bg-danger/10 border border-danger/30 p-3 text-xs text-danger leading-5' : 'rounded-xl bg-gray-50 border border-gray-100 p-3 text-xs text-gray-500 leading-5';
el.className = cls;
el.textContent = message;
}
function hasRemoteSyncApi() { return SYNC_API_BASE.trim().length > 0; }
function syncApiUrl(syncCode) { return `${SYNC_API_BASE.replace(/\/$/, '')}/sync/${encodeURIComponent(syncCode)}`; }
async function putRemoteSyncPackage(syncCode, encryptedPackage) {
const res = await fetch(syncApiUrl(syncCode), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(encryptedPackage) });
if (!res.ok) throw new Error(`同步上传失败：${res.status}`);
return res.json();
}
async function getRemoteSyncPackage(syncCode) {
const res = await fetch(syncApiUrl(syncCode));
if (!res.ok) throw new Error(`同步下载失败：${res.status}`);
return res.json();
}
async function saveSyncSettings() {
const codeInput = document.getElementById('sync-code-input');
const passInput = document.getElementById('sync-passphrase-input');
const confirmInput = document.getElementById('sync-passphrase-confirm');
const code = (codeInput.value.trim() || generateSyncCode()).toUpperCase();
const passphrase = passInput.value.trim();
const confirm = confirmInput.value.trim();
if (passphrase.length < 8) { alert('同步口令建议至少 8 位。'); passInput.focus(); return; }
if (passphrase !== confirm) { alert('两次输入的同步口令不一致。'); confirmInput.focus(); return; }
const verifier = await digestText(`${code}:${passphrase}`);
localStorage.setItem('merged_sync_settings', JSON.stringify({ enabled: true, syncCode: code, verifier, updatedAt: new Date().toISOString() }));
rememberSyncPassphrase(passphrase);
document.getElementById('sync-code-display').textContent = code;
document.getElementById('sync-btn-text').textContent = '同步已开启';
showSyncStep('done');
await uploadEncryptedBackup(passphrase);
}
function showSyncStep(step) {
document.querySelectorAll('.sync-step').forEach(el => el.classList.add('hidden'));
const target = document.getElementById(`sync-step-${step}`);
if (target) target.classList.remove('hidden');
}
function openSyncModal() {
const modal = document.getElementById('sync-modal');
const saved = getSyncSettings();
if (saved && saved.enabled) {
document.getElementById('sync-code-display').textContent = saved.syncCode || '--';
showSyncStep('done');
const mockPackage = localStorage.getItem(`${SYNC_MOCK_CLOUD_PREFIX}${saved.syncCode}`);
if (hasRemoteSyncApi()) setSyncStatus('已配置远端同步接口。可以生成加密备份并上传，或下载后解密检查。', 'success');
else setSyncStatus(mockPackage ? '已找到本机模拟云端密文。可以点“解密检查”验证口令。' : '尚未生成加密备份。', mockPackage ? 'success' : 'info');
} else {
document.getElementById('sync-risk-check').checked = false;
document.getElementById('sync-risk-next').disabled = true;
document.getElementById('sync-code-input').value = generateSyncCode();
document.getElementById('sync-passphrase-input').value = '';
document.getElementById('sync-passphrase-confirm').value = '';
showSyncStep('risk');
}
modal.classList.remove('hidden');
modal.classList.add('flex');
}
function closeSyncModal() {
const modal = document.getElementById('sync-modal');
modal.classList.add('hidden');
modal.classList.remove('flex');
}
function initSyncTools() {
const saved = getSyncSettings();
if (saved && saved.enabled) document.getElementById('sync-btn-text').textContent = '同步已开启';
document.getElementById('open-sync-btn')?.addEventListener('click', openSyncModal);
document.getElementById('close-sync-modal')?.addEventListener('click', closeSyncModal);
document.getElementById('sync-done-close')?.addEventListener('click', closeSyncModal);
document.getElementById('sync-risk-check')?.addEventListener('change', e => { document.getElementById('sync-risk-next').disabled = !e.target.checked; });
document.getElementById('sync-risk-next')?.addEventListener('click', () => showSyncStep('setup'));
document.getElementById('sync-setup-back')?.addEventListener('click', () => showSyncStep('risk'));
document.getElementById('generate-sync-code')?.addEventListener('click', () => { document.getElementById('sync-code-input').value = generateSyncCode(); });
document.getElementById('sync-setup-save')?.addEventListener('click', saveSyncSettings);
document.getElementById('sync-upload-test')?.addEventListener('click', async () => uploadEncryptedBackup());
document.getElementById('sync-restore-test')?.addEventListener('click', async () => downloadEncryptedBackup());
document.getElementById('sync-modal')?.addEventListener('click', e => { if (e.target.id === 'sync-modal') closeSyncModal(); });
}
async function uploadEncryptedBackup(passphrase = '') {
const settings = getSyncSettings();
if (!settings || !settings.enabled) { alert('请先开启同步。'); return; }
const phrase = passphrase || askForSyncPassphrase();
if (!phrase) return;
try {
setSyncStatus('正在生成加密备份...', 'info');
const backup = collectLocalBackupData();
const encryptedPackage = await encryptSyncPayload(backup, phrase, settings.syncCode);
if (hasRemoteSyncApi()) {
await putRemoteSyncPackage(settings.syncCode, encryptedPackage);
setSyncStatus(`已上传加密备份。明文 ${Object.keys(backup.data || {}).length} 条，密文 ${encryptedPackage.ciphertext.length} 字符。`, 'success');
return encryptedPackage;
}
localStorage.setItem(`${SYNC_MOCK_CLOUD_PREFIX}${settings.syncCode}`, JSON.stringify(encryptedPackage));
setSyncStatus(`已生成本机模拟云端密文。明文 ${Object.keys(backup.data || {}).length} 条，密文 ${encryptedPackage.ciphertext.length} 字符。`, 'success');
return encryptedPackage;
} catch (err) {
console.error(err);
setSyncStatus('生成加密备份失败，请打开控制台查看原因。', 'danger');
}
}
async function downloadEncryptedBackup(passphrase = '') {
const settings = getSyncSettings();
if (!settings || !settings.enabled) { alert('请先开启同步。'); return; }
const phrase = passphrase || askForSyncPassphrase();
if (!phrase) return;
try {
let encryptedPackage = null;
if (hasRemoteSyncApi()) {
setSyncStatus('正在从远端下载密文...', 'info');
encryptedPackage = await getRemoteSyncPackage(settings.syncCode);
} else {
const raw = localStorage.getItem(`${SYNC_MOCK_CLOUD_PREFIX}${settings.syncCode}`);
if (!raw) { setSyncStatus('还没有可解密的密文，请先生成加密备份。', 'danger'); return; }
encryptedPackage = JSON.parse(raw);
}
setSyncStatus('正在解密检查...', 'info');
const backup = await decryptSyncPayload(encryptedPackage, phrase);
const count = Object.keys(backup.data || {}).length;
setSyncStatus(`解密成功，识别到 ${count} 条应用数据。现在只是检查，不会覆盖当前数据。`, 'success');
return backup;
} catch (err) {
console.error(err);
setSyncStatus(hasRemoteSyncApi() ? '下载或解密失败：请检查后端地址、同步码和同步口令。' : '解密失败：同步口令不对，或密文已损坏。', 'danger');
}
}
// 本地数据备份与恢复
const BACKUP_KEY_PREFIX = 'merged_';
function collectLocalBackupData() {
saveData();
const data = {};
for (let i = 0; i < localStorage.length; i++) {
const key = localStorage.key(i);
if (key && key.startsWith(BACKUP_KEY_PREFIX)) data[key] = localStorage.getItem(key);
}
return { app: '生活工作同人平衡器', version: 1, exportedAt: new Date().toISOString(), pageTitle: document.title, data };
}
function exportLocalData() {
try {
const backup = collectLocalBackupData();
const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = `life-work-backup-${date}.json`;
document.body.appendChild(link);
link.click();
link.remove();
setTimeout(() => URL.revokeObjectURL(link.href), 1000);
} catch (err) {
console.error(err);
alert('导出失败，请打开控制台查看原因。');
}
}
function importLocalDataFromFile(file) {
if (!file) return;
const reader = new FileReader();
reader.onload = () => {
try {
const parsed = JSON.parse(reader.result);
const incoming = parsed && parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
const keys = Object.keys(incoming || {}).filter(key => key.startsWith(BACKUP_KEY_PREFIX));
if (keys.length === 0) { alert('这个文件里没有识别到可导入的数据。'); return; }
if (!confirm(`将导入 ${keys.length} 条备份数据，并覆盖当前浏览器里的本应用数据。继续吗？`)) return;
const oldKeys = [];
for (let i = 0; i < localStorage.length; i++) {
const key = localStorage.key(i);
if (key && key.startsWith(BACKUP_KEY_PREFIX)) oldKeys.push(key);
}
oldKeys.forEach(key => localStorage.removeItem(key));
keys.forEach(key => localStorage.setItem(key, typeof incoming[key] === 'string' ? incoming[key] : JSON.stringify(incoming[key])));
alert('导入完成，页面将自动刷新。');
location.reload();
} catch (err) {
console.error(err);
alert('导入失败，请确认选择的是本页面导出的 JSON 备份文件。');
}
};
reader.readAsText(file, 'utf-8');
}
function initBackupTools() {
const exportBtn = document.getElementById('export-data-btn');
const importBtn = document.getElementById('import-data-btn');
const importInput = document.getElementById('import-data-file');
if (exportBtn) exportBtn.addEventListener('click', exportLocalData);
if (importBtn && importInput) importBtn.addEventListener('click', () => importInput.click());
if (importInput) importInput.addEventListener('change', () => { importLocalDataFromFile(importInput.files[0]); importInput.value = ''; });
}

// 长文本笔记保存绑定
function initNotes() {
const saveBtn = document.getElementById('save-notes-btn');
saveBtn.addEventListener('click', () => { saveData(); saveBtn.innerHTML = '<i class="fa fa-check mr-1"></i>保存成功'; saveBtn.classList.replace('bg-primary', 'bg-success'); setTimeout(() => { saveBtn.innerHTML = '<i class="fa fa-save mr-1"></i>保存所有文本'; saveBtn.classList.replace('bg-success', 'bg-primary'); }, 2000); });
}

// 同步计时器按钮界面状态
function syncAllTimerUIs() {
for(let k in T_CFG) { const btn = document.getElementById(T_CFG[k].id); if(btn) { if(timerStates[k].r) { btn.textContent = T_CFG[k].aTxt; btn.className = T_CFG[k].aCls; } else { btn.textContent = T_CFG[k].dTxt; btn.className = T_CFG[k].dCls; } } }
}

// 核心计时启停逻辑（含四大互斥）
function toggleTimer(k) {
const studyKeys = ['literature', 'lamoModule', 'writing', 'exercise']; const now = Date.now(); rolloverTimerDay(now);
if (!timerStates[k].r && studyKeys.includes(k)) { studyKeys.forEach(sk => { if (sk !== k && timerStates[sk].r) { timerStates[sk].t += Math.floor((now - timerStates[sk].s) / 1000); timerStates[sk].r = false; timerStates[sk].s = null; } }); }

if (timerStates[k].r) {
const duration = Math.floor((now - timerStates[k].s) / 1000); timerStates[k].t += duration; timerStates[k].r = false; timerStates[k].s = null;
if (k === 'chores') { const input = document.getElementById('chores-input'); input.disabled = false; slackLogs.push({ text: input.value.trim() || '无记录', duration: duration, time: formatDateTime(now) }); input.value = ''; }
if (k === 'phone') { const input = document.getElementById('phone-input'); input.disabled = false; grindLogs.push({ text: input.value.trim() || '无记录', duration: duration, time: formatDateTime(now) }); input.value = ''; }
} else {
if (k === 'chores') { const input = document.getElementById('chores-input'); if(!input.value.trim()) { alert("摸鱼前请先写下要干嘛！"); input.focus(); return; } input.disabled = true; }
if (k === 'phone') { const input = document.getElementById('phone-input'); if(!input.value.trim()) { alert("拉磨前请先写下要拉什么！"); input.focus(); return; } input.disabled = true; }
timerStates[k].r = true; timerStates[k].s = now;
}
saveData(); syncAllTimerUIs(); updateDisplay();
}

// 初始化全盘计时器
function initTimers() { for(let k in T_CFG) { const btn = document.getElementById(T_CFG[k].id); if(btn) btn.addEventListener('click', () => toggleTimer(k)); } syncAllTimerUIs(); if(timerStates.chores.r) document.getElementById('chores-input').disabled = true; if(timerStates.phone.r) document.getElementById('phone-input').disabled = true; }

// 上下班打卡仅录入时段
function punchPeriod(period, type) { punchRecords[period][type] = Date.now(); saveData(); updateDisplay(); }

// 睡眠结算与强制中断机制
function initSleep() {
const btn = document.getElementById('toggle-sleep'); if(globalSleep.isSleeping) { btn.textContent = '记录醒来时间'; btn.className = 'w-full py-2 rounded-lg bg-sleep text-white font-bold hover:opacity-90 transition-all shadow-sm'; }
btn.addEventListener('click', function() {
const now = Date.now();
if (globalSleep.isSleeping) { todaySleepSecs += Math.floor((now - globalSleep.startTs) / 1000); localSleepDisplay.outStr = formatDateTime(now); globalSleep.isSleeping = false; this.textContent = '记录入睡时间'; this.className = 'w-full py-2 rounded-lg bg-sleep/20 text-sleep font-bold hover:bg-sleep/30 transition-all shadow-sm'; } 
else {
for(let k in timerStates) {
if(timerStates[k].r) {
const duration = Math.floor((now - timerStates[k].s) / 1000); timerStates[k].t += duration; timerStates[k].r = false; timerStates[k].s = null;
if(k === 'chores') { const input = document.getElementById('chores-input'); input.disabled = false; slackLogs.push({ text: input.value.trim() || '睡前强制结束摸鱼', duration: duration, time: formatDateTime(now) }); input.value = ''; }
if(k === 'phone') { const input = document.getElementById('phone-input'); input.disabled = false; grindLogs.push({ text: input.value.trim() || '睡前强制结束拉磨', duration: duration, time: formatDateTime(now) }); input.value = ''; }
}
}
syncAllTimerUIs(); ['morning', 'afternoon', 'evening'].forEach(p => { if (punchRecords[p].in && !punchRecords[p].out) punchRecords[p].out = now; });
globalSleep.isSleeping = true; globalSleep.startTs = now; globalSleep.inStr = formatDateTime(now); localSleepDisplay.outStr = '--:--';
this.textContent = '记录醒来时间'; this.className = 'w-full py-2 rounded-lg bg-sleep text-white font-bold hover:opacity-90 transition-all shadow-sm';
}
saveData(); updateDisplay();
});
}

// 待办清单逻辑
function initTasks(){ document.getElementById('save-task-btn').addEventListener('click', saveNewTask); document.getElementById('new-task-input').addEventListener('keypress', (e)=>{if(e.key==='Enter') saveNewTask()}); renderTasks(); }
function saveNewTask(){ const input = document.getElementById('new-task-input'); const val = input.value.trim(); if(val){ tasks.push({id:Date.now(), text:val, completed:false}); input.value=''; saveData(); renderTasks(); } }
function renderTasks(){ const list = document.getElementById('task-list'); list.innerHTML=''; let completed = 0; tasks.forEach(t=>{ if(t.completed) completed++; const div = document.createElement('div'); div.className = `flex items-center justify-between p-1.5 rounded border ${t.completed ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`; div.innerHTML = `<div class="flex items-center flex-1 min-w-0 pr-2"><input type="checkbox" class="w-4 h-4 text-primary rounded cursor-pointer flex-shrink-0" ${t.completed?'checked':''} onchange="toggleTask(${t.id})"><span class="ml-2 text-sm truncate ${t.completed?'line-through text-gray-400':'text-gray-700'}">${t.text}</span></div><button onclick="deleteTask(${t.id})" class="text-gray-300 hover:text-danger p-1"><i class="fa fa-trash"></i></button>`; list.appendChild(div); }); document.getElementById('task-counter').textContent = `(${completed}/${tasks.length})`; }
function toggleTask(id){ const t = tasks.find(x=>x.id===id); if(t) t.completed = !t.completed; saveData(); renderTasks(); }
function deleteTask(id){ tasks = tasks.filter(x=>x.id!==id); saveData(); renderTasks(); }

// 实时时间刷新渲染
function updateDisplay() {
rolloverTimerDay();
['chores','phone','literature','lamoModule','writing','exercise'].forEach(k => { const el = document.getElementById(`${k}-time`); if(el) el.textContent = formatSecs(getElapsed(k)); });
document.getElementById('display-grind-time').textContent = formatSecs(getElapsed('phone')); 
['morning', 'afternoon', 'evening'].forEach(p => { const inTs = punchRecords[p].in; const outTs = punchRecords[p].out; const prefix = p === 'morning' ? 'm' : (p === 'afternoon' ? 'a' : 'e'); document.getElementById(`${prefix}-in`).textContent = inTs ? formatDateTime(inTs) : '--:--'; document.getElementById(`${prefix}-out`).textContent = outTs ? formatDateTime(outTs) : '--:--'; });
let displaySleepSecs = todaySleepSecs; if (globalSleep.isSleeping && globalSleep.startTs) displaySleepSecs += Math.floor((Date.now() - globalSleep.startTs)/1000);
document.getElementById('sleep-time').textContent = formatSecs(displaySleepSecs); document.getElementById('sleep-in-display').textContent = globalSleep.inStr || '--:--'; document.getElementById('sleep-out-display').textContent = localSleepDisplay.outStr;
const learningSecs = getElapsed('literature') + getElapsed('lamoModule') + getElapsed('writing'); document.getElementById('learning-time').textContent = formatSecs(learningSecs);
}

// 生活与财务收支新增记录
function addLifeItem(type, label = '') {
const nowStr = formatDateTime(Date.now());
if (type === 'meal') { const val = document.getElementById('meal-input').value.trim(); if(val){ dailyLife.meals.unshift({time: nowStr, text: val}); document.getElementById('meal-input').value=''; } } 
else if (type === 'hygiene') { dailyLife.hygiene.unshift({time: nowStr, text: label}); } 
else if (type === 'transaction') { const name = document.getElementById('trans-name').value.trim(); const cost = Math.abs(parseFloat(document.getElementById('trans-cost').value)); const io = document.getElementById('trans-io').value; const dom = document.getElementById('trans-domain').value; const tType = io + '_' + dom; if(name && !isNaN(cost)){ dailyLife.transactions.unshift({time: nowStr, type: tType, text: name, amount: cost}); document.getElementById('trans-name').value=''; document.getElementById('trans-cost').value=''; } }
saveData(); renderLifeZone();
}

// 渲染生活记录账单
function renderLifeZone() {
const mList = document.getElementById('meal-list'); mList.innerHTML=''; dailyLife.meals.forEach((m, i) => { mList.innerHTML += `<div class="flex justify-between p-2 border-b border-gray-50 text-sm"><span class="text-gray-700"><span class="text-gray-400 mr-2">[${m.time}]</span>${m.text}</span><button onclick="delLife('meals',${i})" class="text-gray-300 hover:text-red-400"><i class="fa fa-times"></i></button></div>`; });
const hList = document.getElementById('hygiene-list'); hList.innerHTML=''; dailyLife.hygiene.forEach((h, i) => { hList.innerHTML += `<div class="flex justify-between p-2 border-b border-gray-50 text-sm"><span class="text-gray-700"><span class="text-gray-400 mr-2">[${h.time}]</span>记录：${h.text}</span><button onclick="delLife('hygiene',${i})" class="text-gray-300 hover:text-red-400"><i class="fa fa-times"></i></button></div>`; });
const tList = document.getElementById('transaction-list'); tList.innerHTML=''; let totalExp = 0, totalInc = 0;
dailyLife.transactions.forEach((t, i) => { const meta = TRANS_MAP[t.type]; if(meta.sign > 0) totalInc += t.amount; else totalExp += t.amount; const signStr = meta.sign > 0 ? '+' : '-'; tList.innerHTML += `<div class="flex justify-between p-2 border-b border-gray-50 text-sm"><span class="text-gray-700"><span class="text-gray-400 mr-2">[${t.time}]</span><span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 mr-1">${meta.label}</span>${t.text}</span><div class="flex items-center"><span class="font-bold ${meta.color} mr-3">${signStr}¥${t.amount.toFixed(2)}</span><button onclick="delLife('transactions',${i})" class="text-gray-300 hover:text-red-400"><i class="fa fa-times"></i></button></div></div>`; });
document.getElementById('expense-total').textContent = totalExp.toFixed(2); document.getElementById('income-total').textContent = totalInc.toFixed(2);
}
function delLife(cat, idx) { dailyLife[cat].splice(idx, 1); saveData(); renderLifeZone(); }

// 新生长线计划
function addPlanItem(cat) { const input = document.getElementById(`plan-${cat}-input`); const notesInput = document.getElementById(`plan-${cat}-notes`); const dateInput = document.getElementById(`plan-${cat}-date`); const val = input.value.trim(); const notes = notesInput ? notesInput.value.trim() : ''; const dateVal = dateInput.value; if(val && dateVal){ globalPlans[cat].push({id:Date.now(), text:val, notes, date:dateVal, completed:false}); input.value=''; if(notesInput) notesInput.value=''; dateInput.value=''; saveData(); renderAllPlans(); } else { alert("记得输入内容并选择日期哦！"); } }
function addCommItem() { const client = document.getElementById('comm-client').value.trim(); const title = document.getElementById('comm-title').value.trim(); const node = document.getElementById('comm-node').value; const price = parseFloat(document.getElementById('comm-price').value) || 0; const notes = document.getElementById('comm-notes').value.trim(); const date = document.getElementById('comm-date').value; if(client && title && date) { globalPlans.comm.push({id: Date.now(), client, title, node, price, notes, date, completed: false}); ['client', 'title', 'node', 'price', 'notes', 'date'].forEach(id => document.getElementById(`comm-${id}`).value = ''); saveData(); renderAllPlans(); } else { alert("接稿单主、单名和日期为必填！"); } }

// 渲染所有计划排单
function renderAllPlans() {
syncPlanModeButtons();
['course', 'project', 'con'].forEach(cat => { const list = document.getElementById(`plan-${cat}-list`); list.innerHTML=''; const mode = cat === 'course' || cat === 'project' ? studyPlanMode : fanPlanMode; globalPlans[cat].filter(p => mode === 'completed' ? p.completed : (!p.completed || pendingPlanHides.has(`${cat}:${p.id}`))).forEach(p => { const key = `${cat}:${p.id}`; const isLeaving = mode === 'pending' && p.completed && pendingPlanHides.has(key); const div = document.createElement('div'); div.className = `flex items-start p-2 rounded transition-all ${isLeaving?'bg-success/5 border-2 border-dashed border-success/60':(p.completed?'bg-white/50 border border-white':'bg-white/80 border border-white')}`; div.innerHTML = `<label class="flex items-start flex-1 cursor-pointer"><input type="checkbox" class="plan-check-simple mt-1 mr-2 rounded text-primary focus:ring-0 cursor-pointer" ${p.completed?'checked':''} onchange="togglePlan('${cat}', ${p.id})"><div class="flex flex-col"><span class="text-sm ${p.completed?'line-through text-gray-400':'text-gray-700'} leading-tight">${p.text}</span>${p.notes ? `<span class="text-xs text-gray-500 mt-1 italic">${p.notes}</span>` : ''}<span class="text-xs text-gray-400 mt-0.5"><i class="fa fa-calendar-o mr-1"></i>${p.date}</span></div></label><button onclick="deletePlan('${cat}', ${p.id})" class="ml-2 text-gray-300 hover:text-red-400"><i class="fa fa-trash"></i></button>`; list.appendChild(div); }); });
const commList = document.getElementById('plan-comm-list'); commList.innerHTML=''; globalPlans.comm.filter(p => fanPlanMode === 'completed' ? p.completed : (!p.completed || pendingPlanHides.has(`comm:${p.id}`))).forEach(p => { const key = `comm:${p.id}`; const isLeaving = fanPlanMode === 'pending' && p.completed && pendingPlanHides.has(key); const div = document.createElement('div'); div.className = `flex flex-col p-3 rounded transition-all shadow-sm ${isLeaving?'bg-success/5 border-2 border-dashed border-success/60':(p.completed?'bg-white/50 border border-entertainment/10':'bg-white border border-entertainment/20')}`; div.innerHTML = `<div class="flex justify-between items-start mb-1"><label class="flex items-center cursor-pointer font-bold ${p.completed?'text-gray-400 line-through':'text-gray-800'}"><input type="checkbox" class="plan-check mr-2 rounded text-entertainment focus:ring-0 cursor-pointer" ${p.completed?'checked':''} onchange="toggleComm(${p.id})"><div class="transition-all">${p.title}</div></label><span class="text-xs bg-entertainment/10 text-entertainment px-2 py-0.5 rounded">节点 ${p.node||'-'}</span></div><div class="text-xs text-gray-600 mb-1 flex justify-between"><span title="单主"><i class="fa fa-user-o mr-1"></i>${p.client}</span><span class="text-success font-bold">¥${p.price}</span></div>${p.notes ? `<div class="text-xs text-gray-500 mb-1 italic">${p.notes}</div>` : ''}<div class="flex justify-between items-center mt-1 border-t border-gray-50 pt-1"><span class="text-xs text-gray-400"><i class="fa fa-calendar-o mr-1"></i>${p.date}</span><button onclick="deletePlan('comm', ${p.id})" class="text-xs text-gray-400 hover:text-red-400"><i class="fa fa-trash"></i>删除</button></div>`; commList.appendChild(div); }); renderAutoTimeline();
}

function setPlanListMode(group, mode) { if(group === 'study') studyPlanMode = mode === 'completed' ? 'completed' : 'pending'; else fanPlanMode = mode === 'completed' ? 'completed' : 'pending'; renderAllPlans(); }
function syncPlanModeButtons() { const activeStudy = 'px-2.5 py-1 rounded-md text-xs font-bold bg-secondary text-white shadow-sm'; const activeFan = 'px-2.5 py-1 rounded-md text-xs font-bold bg-entertainment text-white shadow-sm'; const inactive = 'px-2.5 py-1 rounded-md text-xs font-bold text-gray-500 hover:bg-white'; document.getElementById('study-plan-mode-pending').className = studyPlanMode === 'pending' ? activeStudy : inactive; document.getElementById('study-plan-mode-completed').className = studyPlanMode === 'completed' ? activeStudy : inactive; document.getElementById('fan-plan-mode-pending').className = fanPlanMode === 'pending' ? activeFan : inactive; document.getElementById('fan-plan-mode-completed').className = fanPlanMode === 'completed' ? activeFan : inactive; }
function schedulePlanHide(cat, id) { const key = `${cat}:${id}`; pendingPlanHides.add(key); if(pendingPlanTimers.has(key)) clearTimeout(pendingPlanTimers.get(key)); pendingPlanTimers.set(key, setTimeout(() => { pendingPlanHides.delete(key); pendingPlanTimers.delete(key); renderAllPlans(); }, 5000)); }
function cancelPlanHide(cat, id) { const key = `${cat}:${id}`; pendingPlanHides.delete(key); if(pendingPlanTimers.has(key)) { clearTimeout(pendingPlanTimers.get(key)); pendingPlanTimers.delete(key); } }
function togglePlan(cat, id) { const p = globalPlans[cat].find(x=>x.id===id); if(p) { p.completed = !p.completed; if(p.completed) schedulePlanHide(cat,id); else cancelPlanHide(cat,id); } saveData(); renderAllPlans(); }
function deletePlan(cat, id) { globalPlans[cat] = globalPlans[cat].filter(x=>x.id!==id); saveData(); renderAllPlans(); }
function toggleComm(id) { const p = globalPlans.comm.find(x => x.id === id); if(p) { p.completed = !p.completed; if(p.completed) schedulePlanHide('comm',id); else cancelPlanHide('comm',id); if(p.completed && p.price > 0) { if(confirm(`是否将排单（${p.title}）的稿费 ¥${p.price} 记入今日接稿收入？`)) { dailyLife.transactions.unshift({time: formatDateTime(Date.now()), type: 'inc_fan', text: `稿费结算: ${p.title}`, amount: parseFloat(p.price)}); saveData(); renderLifeZone(); alert('已同步至二次收入！'); } } saveData(); renderAllPlans(); } }

function setTimelineMode(mode) { timelineMode = mode === 'all' ? 'all' : 'pending'; renderAutoTimeline(); }
function renderAutoTimeline() {
const tlContainer = document.getElementById('plan-timeline-list'); tlContainer.innerHTML = ''; let allItems = [];
['course', 'project'].forEach(cat => { globalPlans[cat].forEach(item => { if(item.date) allItems.push({ ...item, type: 'study' }); }); });
['con'].forEach(cat => { globalPlans[cat].forEach(item => { if(item.date) allItems.push({ ...item, type: 'passion' }); }); });
globalPlans.comm.forEach(item => { if(item.date) allItems.push({ text: `${item.title}`, notes: item.notes || '', date: item.date, completed:!!item.completed, type: 'comm' }); });
const pendingBtn = document.getElementById('timeline-mode-pending'); const allBtn = document.getElementById('timeline-mode-all'); const activeCls = 'px-3 py-1.5 rounded-md text-xs font-bold bg-primary text-white shadow-sm'; const inactiveCls = 'px-3 py-1.5 rounded-md text-xs font-bold text-gray-500 hover:bg-white'; pendingBtn.className = timelineMode === 'pending' ? activeCls : inactiveCls; allBtn.className = timelineMode === 'all' ? activeCls : inactiveCls;
const visibleItems = (timelineMode === 'pending' ? allItems.filter(item => !item.completed) : allItems).sort((a,b) => new Date(a.date) - new Date(b.date)); const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

visibleItems.forEach(p => {
const isStudy = p.type === 'study';
const isComm = p.type === 'comm';

let colorClass = 'text-gray-700'; 
let borderClass = '';
let dotClass = '';

if (isStudy) {
    borderClass = 'border-secondary bg-[#EBDBC1]';
    dotClass = 'bg-secondary';
} else if (isComm) {
    colorClass = 'text-entertainment'; 
    borderClass = 'border-entertainment bg-[#E5C1C7]';
    dotClass = 'bg-entertainment';
} else {
    colorClass = 'text-fanblue';
    borderClass = 'border-fanblue bg-fanbg';
    dotClass = 'bg-fanblue';
}

const diffDays = Math.ceil((new Date(p.date) - today) / (1000 * 60 * 60 * 24)); let statusHtml = p.completed ? `<span class="font-bold text-success"><i class="fa fa-check mr-1"></i>已完成</span>` : (diffDays > 0 ? `还有 <span class="font-bold">${diffDays}</span> 天` : (diffDays === 0 ? `<span class="font-bold text-danger">就是今天！</span>` : `已过 ${Math.abs(diffDays)} 天`)); const notesHtml = p.notes ? `<div class="text-xs text-gray-600 mt-1 italic break-words">${p.notes}</div>` : ''; const completedCardClass = p.completed ? 'opacity-60' : ''; const titleClass = p.completed ? 'line-through text-gray-500' : 'text-gray-800';
tlContainer.innerHTML += `<div class="relative flex w-full mb-5 ${completedCardClass}">${isStudy ? `<div class="w-1/2 pr-3"><div class="p-2 rounded shadow-sm border ${borderClass} text-dark"><div class="text-xs ${colorClass} font-bold mb-1">${p.date}</div><div class="text-sm font-bold ${titleClass} my-0.5 truncate" title="${p.text}">${p.text}</div>${notesHtml}<div class="text-xs text-gray-600 mt-1">${statusHtml}</div></div></div><div class="w-1/2 pl-3"></div>` : `<div class="w-1/2 pr-3"></div><div class="w-1/2 pl-3"><div class="p-2 rounded shadow-sm border ${borderClass} text-dark"><div class="text-xs ${colorClass} font-bold mb-1">${p.date}</div><div class="text-sm font-bold ${titleClass} my-0.5 truncate" title="${p.text}">${p.text}</div>${notesHtml}<div class="text-xs text-gray-600 mt-1">${statusHtml}</div></div></div>`}<div class="absolute left-1/2 top-3 w-3 h-3 rounded-full transform -translate-x-1/2 ${dotClass} border-2 border-white z-20 shadow-sm"></div></div>`;
});
if(visibleItems.length === 0) tlContainer.innerHTML = `<div class="text-center text-gray-400 mt-10">${timelineMode === 'pending' ? '暂无未完成任务' : '暂无时间线记录'}</div>`;
}

// 提取与渲染历史日历侧边栏
function renderHistoryList() {
const list = document.getElementById('history-date-list'); const empty = document.getElementById('history-empty'); list.innerHTML = ''; let historyKeys = [];
for (let i = 0; i < localStorage.length; i++) { if (localStorage.key(i).startsWith('merged_data_')) historyKeys.push(localStorage.key(i).replace('merged_data_', '')); }
historyKeys.sort((a, b) => new Date(b) - new Date(a)); if (historyKeys.length === 0) { empty.classList.remove('hidden'); return; }
empty.classList.add('hidden');
historyKeys.forEach((dateStr, idx) => {
const btn = document.createElement('button'); btn.className = `w-full text-left p-3 rounded-lg border mb-2 transition-all ${idx===0 ? 'border-primary/50 bg-primary/10 text-primary font-bold' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`; btn.innerHTML = `<i class="fa fa-calendar-o mr-2"></i>${dateStr}`;
btn.onclick = () => { document.querySelectorAll('#history-date-list button').forEach(b => {b.className='w-full text-left p-3 rounded-lg border mb-2 transition-all border-gray-200 bg-white text-gray-700 hover:bg-gray-50';}); btn.className = 'w-full text-left p-3 rounded-lg border mb-2 transition-all border-primary/50 bg-primary/10 text-primary font-bold'; loadHistoryDetail(dateStr); }; list.appendChild(btn);
});
loadHistoryDetail(historyKeys[0]);
}

// 具体历史手账内容回显
function loadHistoryDetail(dateStr) {
document.getElementById('history-placeholder').classList.add('hidden'); document.getElementById('history-detail-panel').classList.remove('hidden'); document.getElementById('history-sidebar-stats').classList.remove('hidden');
const d = JSON.parse(localStorage.getItem(`merged_data_${dateStr}`)) || {}; const sLogs = JSON.parse(localStorage.getItem(`merged_slackLog_${dateStr}`)) || []; const gLogs = JSON.parse(localStorage.getItem(`merged_grindLog_${dateStr}`)) || []; const sleepTot = parseInt(localStorage.getItem(`merged_sleepTot_${dateStr}`)) || 0; const t = JSON.parse(localStorage.getItem(`merged_tasks_${dateStr}`)) || []; const lf = JSON.parse(localStorage.getItem(`merged_life_${dateStr}`)) || { meals:[], hygiene:[], transactions:[] };
document.getElementById('hist-date-title').textContent = dateStr; const learningSecs = (d.literature||0) + (d.lamoModule||0) + (d.writing||0); 
let exp = 0, inc = 0; lf.transactions.forEach(trans => { const m = TRANS_MAP[trans.type]; if(m.sign > 0) inc += trans.amount; else exp += trans.amount; });
document.getElementById('hist-expense').textContent = '¥ ' + exp.toFixed(2); document.getElementById('hist-income').textContent = '¥ ' + inc.toFixed(2); document.getElementById('hist-total-work').textContent = ((learningSecs + (d.exercise||0) + (d.chores||0) + (d.phone||0))/3600).toFixed(1) + ' h';
document.getElementById('hist-chart-focus').textContent = (learningSecs/3600).toFixed(1) + 'h'; document.getElementById('hist-chart-exe').textContent = ((d.exercise||0)/3600).toFixed(1) + 'h'; document.getElementById('hist-chores').textContent = ((d.chores||0)/3600).toFixed(1) + 'h'; document.getElementById('hist-phone').textContent = ((d.phone||0)/3600).toFixed(1) + 'h';
const todoList = document.getElementById('hist-todo-list'); todoList.innerHTML = t.length === 0 ? '<p class="text-sm text-gray-400">无待办</p>' : '';
t.forEach(task => { todoList.innerHTML += `<div class="text-sm p-1.5 border-b border-gray-100 ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}"><i class="fa ${task.completed ? 'fa-check-square text-primary' : 'fa-square-o'} mr-2"></i>${task.text}</div>`; });
document.getElementById('hist-note-lit').textContent = d.literatureNotes || '无记录'; document.getElementById('hist-note-exp').textContent = d.experimentNotes || '无记录'; document.getElementById('hist-note-wri').textContent = d.writingNotes || '无记录'; document.getElementById('hist-note-exe').textContent = d.exerciseNotes || '无记录';
const slackLogDiv = document.getElementById('hist-slack-log'); slackLogDiv.innerHTML = sLogs.length === 0 ? '<span class="text-gray-400">无记录</span>' : ''; sLogs.forEach(l => slackLogDiv.innerHTML += `<div>[${l.time}] ${Math.ceil(l.duration/60)}分钟：${l.text}</div>`);
const grindLogDiv = document.getElementById('hist-grind-log'); grindLogDiv.innerHTML = gLogs.length === 0 ? '<span class="text-gray-400">无记录</span>' : ''; gLogs.forEach(l => grindLogDiv.innerHTML += `<div>[${l.time}] ${Math.ceil(l.duration/60)}分钟：${l.text}</div>`);
const lifeLogDiv = document.getElementById('hist-life-log'); let lifeHtml = ''; lf.meals.forEach(m => lifeHtml += `<div>[${m.time}] 🍴 ${m.text}</div>`); lf.hygiene.forEach(h => lifeHtml += `<div>[${h.time}] 🛁 ${h.text}</div>`); lf.transactions.forEach(trans => { const m=TRANS_MAP[trans.type]; lifeHtml += `<div>[${trans.time}] ${m.sign>0?'💰':'💸'} [${m.label}] ${trans.text} (${m.sign>0?'+':'-'}¥${trans.amount})</div>`; }); lifeLogDiv.innerHTML = lifeHtml || '<span class="text-gray-400">当日无足迹</span>';
if(historyChartObj) historyChartObj.destroy(); historyChartObj = new Chart(document.getElementById('historyChart').getContext('2d'), { type: 'pie', data: { labels: ['睡眠', '学习', '运动', '摸鱼', '拉磨'], datasets: [{ data: [sleepTot, learningSecs, d.exercise||0, d.chores||0, d.phone||0], backgroundColor: ['#8494A3', '#8BAA9E', '#A69CAC', '#D99C6A', '#C5979D'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
}

// 全新数据大盘图表渲染：移除原图例，纯靠左侧说明
function renderStats(days) {
const btns = document.getElementById('stat-range-toggles').children; Array.from(btns).forEach(b => b.className = 'px-4 py-1.5 rounded-md text-sm font-bold text-gray-600 hover:bg-gray-200'); btns[days===7?0:(days===30?1:2)].className = 'px-4 py-1.5 rounded-md text-sm font-bold bg-white shadow-sm text-primary';

let totals = { sleep:0, focus:0, exercise:0, grind:0, tasksDone:0, exp:0, inc:0 }; 
let labels = [], studyArr = [], exeArr = [], grindArr = [], sleepArr = [], choresArr = [];
let fanIncArr = [], fanExpArr = [], irlIncArr = [], irlExpArr = [];

const now = new Date();
for(let i=days-1; i>=0; i--) {
const d = new Date(now); d.setDate(d.getDate() - i); labels.push(`${d.getMonth()+1}/${d.getDate()}`);
const dateStr = d.toDateString();
const data = JSON.parse(localStorage.getItem(`merged_data_${dateStr}`)) || {}; 
const sleepTot = parseInt(localStorage.getItem(`merged_sleepTot_${dateStr}`)) || 0; 
const tsk = JSON.parse(localStorage.getItem(`merged_tasks_${dateStr}`)) || [];
const lf = JSON.parse(localStorage.getItem(`merged_life_${dateStr}`)) || { transactions: [] };

const dailyStudy = (data.literature||0) + (data.lamoModule||0) + (data.writing||0);
const dailyExe = data.exercise||0; const dailyGrind = data.phone || 0; const dailyChores = data.chores || 0;

let fanInc = 0, fanExp = 0, irlInc = 0, irlExp = 0, dailyExp = 0, dailyInc = 0;
lf.transactions.forEach(t => { 
if(t.type === 'inc_fan') fanInc += t.amount; if(t.type === 'exp_fan') fanExp += t.amount;
if(t.type === 'inc_irl') irlInc += t.amount; if(t.type === 'exp_irl') irlExp += t.amount;
const m = TRANS_MAP[t.type]; if(m.sign > 0) dailyInc += t.amount; else dailyExp += t.amount; 
});

totals.sleep += sleepTot; totals.focus += dailyStudy; totals.exercise += dailyExe; totals.grind += dailyGrind; 
totals.tasksDone += tsk.filter(x=>x.completed).length; totals.exp += dailyExp; totals.inc += dailyInc;

studyArr.push(dailyStudy/3600); exeArr.push(dailyExe/3600); grindArr.push(dailyGrind/3600); sleepArr.push(sleepTot/3600); choresArr.push(dailyChores/3600); 
fanIncArr.push(fanInc); fanExpArr.push(-fanExp); irlIncArr.push(irlInc); irlExpArr.push(-irlExp);
}

document.getElementById('stat-month-expense').textContent = '¥' + totals.exp.toFixed(2); document.getElementById('stat-month-income').textContent = '¥' + totals.inc.toFixed(2);
document.getElementById('stat-avg-sleep').textContent = (totals.sleep / days / 3600).toFixed(1) + 'h'; document.getElementById('stat-tasks').textContent = totals.tasksDone; document.getElementById('stat-sum-focus').textContent = (totals.focus / 3600).toFixed(1) + 'h'; document.getElementById('stat-sum-exercise').textContent = (totals.exercise / 3600).toFixed(1) + 'h'; document.getElementById('stat-sum-grind').textContent = (totals.grind / 3600).toFixed(1) + 'h';

// 图一：精力管理折线图 (已关闭原生图例)
if(energyChartObj) energyChartObj.destroy();
energyChartObj = new Chart(document.getElementById('energyChart').getContext('2d'), {
type: 'line', data: { labels: labels, datasets: [ {label: '睡眠时长', data: sleepArr, borderColor: '#8494A3', backgroundColor: '#8494A320', fill: true, tension: 0.4}, {label: '运动时长', data: exeArr, borderColor: '#A69CAC', backgroundColor: '#A69CAC20', fill: true, tension: 0.4} ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: '睡眠与运动趋势 (h)', font: {size: 14, weight:'bold'}, color: '#5C5E58' } }, scales: { y: { beginAtZero: true }, x:{grid:{display:false}} } }
});

// 图二：任务总览折线图 (已关闭原生图例)
if(taskChartObj) taskChartObj.destroy();
taskChartObj = new Chart(document.getElementById('taskChart').getContext('2d'), {
type: 'line', data: { labels: labels, datasets: [ {label: '学习', data: studyArr, borderColor: '#8BAA9E'}, {label: '拉磨', data: grindArr, borderColor: '#C5979D'}, {label: '摸鱼', data: choresArr, borderColor: '#D99C6A'} ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: '学习、拉磨与摸鱼对比 (h)', font: {size: 14, weight:'bold'}, color: '#5C5E58' } }, scales: { y: { beginAtZero: true }, x:{grid:{display:false}} } }
});

// 图三：财务收支背靠背堆叠图 (已关闭原生图例)
if(financeCompositeChartObj) financeCompositeChartObj.destroy();
financeCompositeChartObj = new Chart(document.getElementById('financeCompositeChart').getContext('2d'), {
type: 'bar', 
data: { labels: labels, datasets: [ 
{ label: '二次收入', data: fanIncArr, backgroundColor: TRANS_MAP['inc_fan'].chartCol, stack: 'Stack 0' }, 
{ label: '二次支出', data: fanExpArr, backgroundColor: TRANS_MAP['exp_fan'].chartCol, stack: 'Stack 0' },
{ label: '三次收入', data: irlIncArr, backgroundColor: TRANS_MAP['inc_irl'].chartCol, stack: 'Stack 1' }, 
{ label: '三次支出', data: irlExpArr, backgroundColor: TRANS_MAP['exp_irl'].chartCol, stack: 'Stack 1' }
]}, 
options: { 
responsive: true, maintainAspectRatio: false, 
plugins: { 
legend: { display: false },
title: { display: true, text: '二次/三次收支对比 (¥)', font: {size: 14, weight:'bold'}, color: '#5C5E58' },
tooltip: { callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += '¥' + Math.abs(context.parsed.y).toFixed(2); } return label; } } }
}, 
scales: { x:{stacked:true, grid:{display:false}}, y: { stacked:true, ticks: { callback: function(value) { return '¥' + Math.abs(value); } } } } 
} 
});
}
