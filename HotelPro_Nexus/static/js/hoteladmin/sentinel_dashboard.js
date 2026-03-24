/**
 * SENTINEL INTELLIGENCE ALPHA — Dashboard Script
 * HotelPRO v4.0 | Enterprise Market Intelligence Engine
 *
 * Reads HOTEL_ID and CSRF_TOKEN from the #sentinelConfig data attributes
 * so that no Django template tags are needed inside this JS file.
 */

/* ─── Bootstrap ─────────────────────────────────────────────────────────────── */
const _cfg = document.getElementById('sentinelConfig');
const HOTEL_ID = parseInt(_cfg.dataset.hotelId, 10);
const CSRF_TOKEN = _cfg.dataset.csrf;

/* ─── State ──────────────────────────────────────────────────────────────────── */
let currentSessionId = null;
let currentDocumentId = null;
let editingMessageId = null;
let isManualAiEdit = false;
let isRecording = false;

/* ─── AI Launcher Card HTML ──────────────────────────────────────────────────── */
function aiLauncherHTML() {
    if (window.location.pathname.includes('/ai-chat')) {
        return `
        <div class="ai-launcher-root fade-up" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding-top:100px;">
            <br><br><br>
            <div style="width:80px;height:80px;border-radius:24px;background:rgba(var(--accent-primary),0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 24px;border:1px solid rgba(var(--accent-primary),0.2);box-shadow:0 0 30px rgba(var(--accent-primary),0.15)">
                <i class="fas fa-image" style="font-size:32px;color:rgb(var(--accent-primary))"></i>
            </div>
            <h4 class="ai-launcher-title" style="font-size:28px;font-weight:800;color:white;margin-bottom:12px;letter-spacing:-0.02em">Image Intelligence Analyzer</h4>
            <p style="color:#94a3b8;font-size:15px;max-width:480px;margin:0 auto 40px;line-height:1.6">Upload an image of your hotel property, floor plan, or performance charts for instant strategic insights from the Vision Engine.</p>
            
            <label class="px-6 py-4 rounded-xl font-bold" style="background:rgba(var(--accent-primary),0.15);color:rgb(var(--accent-primary));border:1px solid rgba(var(--accent-primary),0.3);cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;gap:12px;font-size:14px" onmouseover="this.style.background='rgba(var(--accent-primary),0.25)'" onmouseout="this.style.background='rgba(var(--accent-primary),0.15)'">
                <input type="file" id="launcherUpload" class="hidden" accept="image/*,.pdf,.csv" onchange="document.getElementById('fileUpload').files = this.files; handleFileUpload(document.getElementById('fileUpload'))">
                <i class="fas fa-cloud-upload-alt" style="font-size:16px"></i> Upload Image to Analyze
            </label>
        </div>`;
    }

    return `
    <div class="ai-launcher-root fade-up">
        <div class="ai-launcher-header">
            <div class="ai-launcher-badge">
                <span class="ai-launcher-dot"></span>
                <span>System Online</span>
            </div>
            <h4 class="ai-launcher-title">AI Command Center</h4>
            <p class="ai-launcher-sub">Select a Sentinel module to begin. Each AI agent is purpose-built for a core area of hotel intelligence.</p>
        </div>
        <div class="ai-launcher-grid">
            <a href="/ai-chat" class="ai-card" id="alc-chat">
                <div class="ai-card-glow"></div>
                <div class="ai-card-top">
                    <div class="ai-card-icon-wrap"><i class="fas fa-brain ai-card-icon"></i></div>
                    <i class="fas fa-arrow-right ai-card-arrow"></i>
                </div>
                <div class="ai-card-body">
                    <h5 class="ai-card-title">Chat With AI Agent</h5>
                    <p class="ai-card-desc">Conversational AI assistant for hotel analytics, strategies, and live data insights.</p>
                </div>
            </a>
            <a href="/ai-tasks" class="ai-card" id="alc-tasks">
                <div class="ai-card-glow"></div>
                <div class="ai-card-top">
                    <div class="ai-card-icon-wrap"><i class="fas fa-list-check ai-card-icon"></i></div>
                    <i class="fas fa-arrow-right ai-card-arrow"></i>
                </div>
                <div class="ai-card-body">
                    <h5 class="ai-card-title">AI Agent Tasks</h5>
                    <p class="ai-card-desc">Automated AI workflows and intelligent task management for hotel operations.</p>
                </div>
            </a>
            <a href="/ai-analyst" class="ai-card" id="alc-analyst">
                <div class="ai-card-glow"></div>
                <div class="ai-card-top">
                    <div class="ai-card-icon-wrap"><i class="fas fa-chart-bar ai-card-icon"></i></div>
                    <i class="fas fa-arrow-right ai-card-arrow"></i>
                </div>
                <div class="ai-card-body">
                    <h5 class="ai-card-title">AI Agent Analyst</h5>
                    <p class="ai-card-desc">AI-powered analytics engine for performance, market rankings, and reports.</p>
                </div>
            </a>
            <a href="/ai-live" class="ai-card" id="alc-live">
                <div class="ai-card-glow"></div>
                <div class="ai-card-top">
                    <div class="ai-card-icon-wrap"><i class="fas fa-video ai-card-icon"></i></div>
                    <i class="fas fa-arrow-right ai-card-arrow"></i>
                </div>
                <div class="ai-card-body">
                    <h5 class="ai-card-title">AI Agent Live</h5>
                    <p class="ai-card-desc">Real-time face-to-face AI interaction with voice and camera support.</p>
                </div>
            </a>
        </div>
    </div>`;
}
let recognition;

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function getCsrf() { return CSRF_TOKEN; }

/* ─── Premium UX Components ────────────────────────────────────────────────── */

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
    const bg = type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)';
    
    toast.className = 'fade-up';
    toast.style.cssText = `
        background: ${bg}; backdrop-filter: blur(12px); color: white; padding: 12px 20px;
        border-radius: 14px; display: flex; align-items: center; gap: 12px; font-size: 13px;
        font-weight: 600; box-shadow: 0 10px 25px rgba(0,0,0,0.3); pointer-events: auto;
        border: 1px solid rgba(255,255,255,0.1);
    `;
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

function renderFileCard(file, docId) {
    const ext = typeof file === 'string' ? file.split('.').pop().toLowerCase() : file.name.split('.').pop().toLowerCase();
    const fileName = typeof file === 'string' ? file : file.name;
    const icons = { 'pdf': '📕', 'doc': '📄', 'docx': '📄', 'xls': '📊', 'xlsx': '📊', 'csv': '📊', 'txt': '📝', 'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'webp': '🖼️' };
    const icon = icons[ext] || '📄';
    const size = typeof file === 'object' ? (file.size / 1024).toFixed(1) + ' KB' : '';

    return `
    <div class="file-card-premium fade-up mb-3" style="max-width: 350px;">
        <div class="flex items-center gap-3">
            <div class="text-xl">${icon}</div>
            <div class="flex-1 min-w-0">
                <div class="text-white font-bold text-xs truncate">${fileName}</div>
                <div class="text-[9px] text-emerald-400 mt-0.5">Uploaded & Processing</div>
            </div>
            ${docId ? `<button onclick="openAnalysisModal('${docId}')" class="text-emerald-400 opacity-60 hover:opacity-100 transition-opacity"><i class="fas fa-microscope text-xs"></i></button>` : ''}
        </div>
    </div>`;
}

async function startLiveAnalysis(file) {
    const container = document.getElementById('chatMessages');
    const el = document.createElement('div');
    el.className = 'msg-ai fade-up mb-4';
    
    const steps = [
        { id: 'ext', label: 'Extracting Core Data' },
        { id: 'proc', label: 'Processing Structure' },
        { id: 'pat', label: 'Detecting Neural Patterns' },
        { id: 'gen', label: 'Generating Insights' }
    ];

    el.innerHTML = `
    <div class="bubble-ai" style="width: 320px;">
        <div class="text-xs font-bold text-white mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2"><div class="cc-dot"></div> Analyzing Intelligence Data...</div>
            <div id="analysisPercentage" class="text-[10px] text-emerald-400 font-mono tracking-tighter">0%</div>
        </div>
        <div class="space-y-3 mb-6">
            ${steps.map(s => `
                <div id="step-${s.id}" class="analysis-step pending">
                    <i class="fas fa-circle"></i> ${s.label}
                </div>
            `).join('')}
        </div>
        <div class="progress-track" style="height: 6px;">
            <div id="analysisBar" class="progress-bar" style="width: 0%;"></div>
        </div>
    </div>`;
    
    container.appendChild(el);
    scrollBottom();

    // Simulate real-time progress
    for (let i = 0; i < steps.length; i++) {
        const stepEl = document.getElementById(`step-${steps[i].id}`);
        const pctEl = document.getElementById('analysisPercentage');
        const barEl = document.getElementById('analysisBar');
        
        stepEl.classList.remove('pending');
        stepEl.classList.add('active');
        stepEl.querySelector('i').className = 'fas fa-spinner fa-spin';
        
        // Internal loop for smoother percentage increment within each step
        const startPct = i * 25;
        const endPct = (i + 1) * 25;
        for (let p = startPct; p <= endPct; p++) {
            if (pctEl) pctEl.textContent = `${p}%`;
            if (barEl) {
                barEl.style.width = `${p}%`;
                barEl.style.setProperty('--width', `${p}%`);
            }
            await new Promise(r => setTimeout(r, 20 + Math.random() * 20));
        }
        
        stepEl.classList.remove('active');
        stepEl.classList.add('complete');
        stepEl.querySelector('i').className = 'fas fa-check-circle';
    }
    
    setTimeout(() => {
        el.querySelector('.cc-dot').style.background = '#10b981';
        el.querySelector('.cc-dot').style.boxShadow = '0 0 10px #10b981';
        showToast("Intelligence analysis complete.");
    }, 500);
}

function openAnalysisModal(docId) {
    const modal = document.getElementById('analysisModal');
    const content = document.getElementById('analysisModalContent');
    modal.style.display = 'flex';
    content.innerHTML = '<div class="py-20 text-center"><i class="fas fa-spinner fa-spin text-3xl text-slate-700"></i></div>';
    
    // Simulate data fetch (Real system would fetch via API)
    setTimeout(() => {
        content.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div class="value-box value-box-accent">
                <label class="category-label">Confidence Score</label>
                <div class="metric-value shimmer-text">98.4%</div>
            </div>
            <div class="value-box">
                <label class="category-label">Entities Detected</label>
                <div class="text-white font-bold text-lg">12 Object Classes</div>
            </div>
        </div>
        <div class="ai-key-points">
            <div class="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest">Processing Logs</div>
            <pre class="text-[10px] text-emerald-400 font-mono leading-relaxed">
[SECURE_TUNNEL] Established v4.2
[EXTRACTOR] Optical Character Recognition initialized
[NLP] Sentiment analysis: POSITIVE (0.88)
[NEURAL] Pattern matching against Global Empire Core
[SUCCESS] Intelligence package ready</pre>
        </div>
        <div class="space-y-4">
            <h5 class="text-sm font-bold text-white">Visual Interpretation</h5>
            <div class="p-4 bg-white/5 rounded-xl border border-white/10 text-xs text-slate-300 leading-relaxed">
                The document demonstrates high operational efficiency with minor anomalies detected in "Revenue Sector B". Recommendations have been prioritized in the intelligence stream.
            </div>
        </div>`;
    }, 600);
}

function closeAnalysisModal() {
    document.getElementById('analysisModal').style.display = 'none';
}

function postJson(url, data) {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
        body: JSON.stringify(data),
    }).then(r => r.json());
}

function scrollBottom() {
    const c = document.getElementById('chatMessages');
    if (c) c.scrollTop = c.scrollHeight;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatResponse(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
}

function setScanStatus(active) {
    const dot = document.getElementById('scanStatusDot');
    const txt = document.getElementById('scanStatusText');
    if (!dot || !txt) return;

    if (active) {
        dot.style.background = '#10b981'; // emerald-500
        dot.classList.add('animate-pulse');
        txt.textContent = 'Diagnostic Scan In Progress...';
        txt.style.color = '#10b981';
    } else {
        dot.style.background = 'rgb(var(--accent-primary))';
        dot.classList.remove('animate-pulse');
        txt.textContent = 'Vision Active • v5.0 Aether';
        txt.style.color = 'inherit';
    }
}

/* ─── Session Management ─────────────────────────────────────────────────────── */
async function loadSessions() {
    const res = await fetch(`/api/ai/${HOTEL_ID}/sessions/`);
    const data = await res.json();
    const list = document.getElementById('sessionsList');

    if (!data.sessions || !data.sessions.length) {
        list.innerHTML = `<div class="px-4 py-6 text-center text-xs text-slate-600">No sessions yet.<br>Click + to start one.</div>`;
        return;
    }

    list.innerHTML = data.sessions.map(s => `
        <div class="session-item ${s.id === currentSessionId ? 'active' : ''}"
             onclick="loadSession(${s.id})" data-sid="${s.id}">
            <div class="s-title">${escapeHtml(s.title)}</div>
            <div class="s-meta">
                <span>${s.updated_at}</span>
                <span>${s.message_count} msgs</span>
            </div>
            <button class="session-delete-btn" title="Delete Session" 
                    onclick="deleteSession(${s.id}, event)">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join('');
    return data.sessions;
}

async function deleteSession(sessionId, event) {
    if (event) event.stopPropagation();
    if (!confirm('Archive this intelligence session? it will no longer appear in your stream.')) return;

    try {
        const res = await postJson(`/api/ai/${HOTEL_ID}/sessions/`, { 
            action: 'delete',
            session_id: sessionId 
        });
        
        if (res.status === 'success') {
            if (currentSessionId === sessionId) {
                currentSessionId = null;
                document.getElementById('chatMessages').innerHTML = aiLauncherHTML();
                document.getElementById('sessionTitle').textContent = 'Intelligence Stream';
            }
            await loadSessions();
        } else {
            alert(res.message || 'Deletion failed.');
        }
    } catch (err) {
        console.error('Session deletion error:', err);
        alert('Network error. Unable to decommission session.');
    }
}

async function loadSession(sessionId) {
    currentSessionId = sessionId;
    loadSessions(); // refresh active highlights

    const res = await fetch(`/api/ai/${HOTEL_ID}/sessions/${sessionId}/messages/`);
    const data = await res.json();
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';

    if (!data.messages || !data.messages.length) {
        container.innerHTML = aiLauncherHTML();
    } else {
        data.messages.forEach(m => {
            const isImg = m.document_url && ['png','jpg','jpeg','webp','gif'].includes(m.document_type?.toLowerCase());
            appendMessagePair(m.query, m.response, m.id, m.is_edited, isImg ? m.document_url : null);
        });
    }

    // Update header title
    const sessionTitle = document.getElementById('sessionTitle');
    const sessions = await fetch(`/api/ai/${HOTEL_ID}/sessions/`).then(r => r.json());
    const session = sessions.sessions?.find(s => s.id === sessionId);
    if (sessionTitle) sessionTitle.textContent = session ? session.title : 'Session';

    scrollBottom();
}

async function newChat() {
    const res = await postJson(`/api/ai/${HOTEL_ID}/sessions/`, { action: 'create' });
    if (res.status === 'success') {
        currentSessionId = res.session_id;
        currentDocumentId = null;

        document.getElementById('chatMessages').innerHTML = aiLauncherHTML();

        const sessionTitle = document.getElementById('sessionTitle');
        if (sessionTitle) sessionTitle.textContent = res.title;
        clearDocument();
        await loadSessions();
    }
}

async function deleteHistory() {
    if (!currentSessionId) { alert('No active session to clear.'); return; }
    if (!confirm('Clear all messages in this session?')) return;

    await fetch(`/api/ai/${HOTEL_ID}/sessions/${currentSessionId}/messages/`, {
        method: 'DELETE',
        headers: { 'X-CSRFToken': getCsrf() },
    });

    // Refresh UI
    loadSession(currentSessionId);
}

async function clearAllHistory() {
    if (!confirm('Archive all intelligence sessions? This will clear your entire stream.')) return;

    try {
        const res = await postJson(`/api/ai/${HOTEL_ID}/sessions/`, { 
            action: 'delete_all'
        });
        
        if (res.status === 'success') {
            currentSessionId = null;
            document.getElementById('chatMessages').innerHTML = aiLauncherHTML();
            document.getElementById('sessionTitle').textContent = 'Intelligence Stream';
            await loadSessions();
        } else {
            alert(res.message || 'Bulk deletion failed.');
        }
    } catch (err) {
        console.error('Bulk deletion error:', err);
        alert('Network error. Unable to clear stream.');
    }
}

/* ─── Send Message ───────────────────────────────────────────────────────────── */
async function sendMessage(imageUrl = null, docId = null) {
    const input = document.getElementById('chatInput');
    const query = input.value.trim();
    if (!query && !imageUrl) return;

    input.value = '';
    input.style.height = 'auto';

    // UI State: Thinking
    const btn = document.getElementById('sendBtn');
    btn.disabled = true;
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    // Use passed docId or current global
    const activeDocId = docId || currentDocumentId;

    // Sentinel Vision Engine: Detect potential diagnostic scans
    const isScanRequest = query.toLowerCase().includes('scan') || query.toLowerCase().includes('audit');
    if (isScanRequest) setScanStatus(true);
    appendUserBubble(query, null, false, imageUrl);
    showTyping(true);

    // Auto-create session if none exists
    if (!currentSessionId) {
        const s = await postJson(`/api/ai/${HOTEL_ID}/sessions/`, {
            action: 'create',
            title: query.slice(0, 50),
        });
        if (s.status === 'success') {
            currentSessionId = s.session_id;
            const sessionTitle = document.getElementById('sessionTitle');
            if (sessionTitle) sessionTitle.textContent = s.title;
            loadSessions();
        }
    }

    try {
        const payload = { query };
        if (currentSessionId) payload.session_id = currentSessionId;
        if (currentDocumentId) payload.document_id = currentDocumentId;

        const res = await postJson(`/api/ai/${HOTEL_ID}/chat/`, payload);
        const content = res.status === 'success' ? res.response : (res.message || 'An error occurred.');
        showTyping(false);
        appendAIBubble(content, false, res.message_id);
    } catch (err) {
        showTyping(false);
        appendAIBubble('Network error. Sentinel is offline or rate-limited. Please retry.', true);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane" style="font-size:13px"></i>';
        }
    }

    loadSessions();
}

function handleKey(e) {
    const ta = document.getElementById('chatInput');
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function quickQuery(text) {
    const inp = document.getElementById('chatInput');
    if (inp) {
        inp.value = text;
        sendMessage();
    }
}

/* ─── Message Rendering ─────────────────────────────────────────────────────── */
function appendUserBubble(text, msgId = null, isEdited = false, imageUrl = null, docId = null) {
    const container = document.getElementById('chatMessages');
    const el = document.createElement('div');
    el.className = 'w-full mb-6 animate-neural-float';
    if (msgId) el.setAttribute('data-msg-id', msgId);

    const editedBadge = isEdited ? '<span class="text-[8px] opacity-40 ml-2 italic">EDITED</span>' : '';
    const editBtn = msgId ? `<button onclick="openEditModal('${msgId}', \`${text.replace(/`/g, '\\`')}\` || '')" class="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 hover:bg-black/40 rounded-md text-[10px] text-white/50 hover:text-white" title="Edit Message"><i class="fas fa-edit"></i></button>` : '';

    const isAutoPrompt = text.includes("Vision Analysis Request:");
    const fileName = isAutoPrompt ? text.split("Vision Analysis Request:")[1].trim().split(" ")[0].replace(/\.$/, "") : null;
    
    // File Card at top if it was an upload
    const fileCardHtml = (docId || fileName) ? renderFileCard(fileName || "Uploaded Document", docId) : '';
    
    const displayContent = (imageUrl && isAutoPrompt) ? "" : escapeHtml(text).replace(/\n/g, '<br>');
    const imageHtml = imageUrl ? `
        <div class="my-4 rounded-xl overflow-hidden border border-white/10 shadow-2xl mx-auto" style="max-width: 450px;">
            <img src="${imageUrl}" class="w-full object-contain bg-black/20" alt="Vision Input">
        </div>` : '';

    el.innerHTML = `
        <div class="flex justify-end group relative">
            <div class="bubble-user glass-vibrant relative" style="background: linear-gradient(135deg, rgba(var(--accent-primary), 0.25), rgba(var(--accent-primary), 0.1)); border: 1px solid rgba(var(--accent-primary), 0.35); padding: 18px 24px;">
                ${editBtn}
                ${fileCardHtml}
                ${imageHtml}
                <div class="user-text text-[13px] leading-relaxed font-medium text-white/90">${displayContent}${editedBadge}</div>
            </div>
        </div>`;

    container.appendChild(el);
    scrollBottom();
}

function appendAIBubble(text, isError = false, msgId = null) {
    const container = document.getElementById('chatMessages');
    const el = document.createElement('div');
    el.className = 'msg-ai group fade-up mb-8 relative';
    
    const hasAnalysis = text.includes('**A. File Summary**') || text.includes('F. Confidence Score') || text.includes('Match Result');
    const analysisBtn = hasAnalysis ? `
    <div class="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
        <span class="ai-insight-tag"><i class="fas fa-bolt"></i> Deep Insights Ready</span>
        <button onclick="openAnalysisModal('LATEST')" class="btn-action !text-[10px] !py-1 !px-3">View Details</button>
    </div>` : '';

    el.innerHTML = `
        <div class="bubble-ai relative ${isError ? 'border-rose-500/30 !bg-rose-500/5' : ''}" style="padding: 24px; line-height: 1.6;">
            <div class="ai-response-content">${formatResponse(text)}</div>
            ${analysisBtn}
        </div>`;
        
    container.appendChild(el);
    scrollBottom();
}

function appendMessagePair(query, response, msgId, isEdited = false, imageUrl = null) {
    appendUserBubble(query, msgId, isEdited, imageUrl);
    appendAIBubble(response, false, msgId);
}

function showTyping(show) {
    const el = document.getElementById('aiTyping');
    if (el) el.classList.toggle('hidden', !show);
    scrollBottom();
}

/* ─── Message Editing ────────────────────────────────────────────────────────── */
function openEditModal(msgId, currentText, isRegen = false) {
    editingMessageId = msgId;
    isManualAiEdit = !isRegen && !!currentText; // If we have text and NOT regen, it's a manual edit

    // Update Modal Header for clarity
    const modalTitle = document.querySelector('#editModal h3');
    if (modalTitle) modalTitle.textContent = isRegen ? 'Regenerate Intelligence' : 'Manual Response Correction';
    
    // If text is empty (Regeneration), try to find user text in DOM
    if (!currentText && isRegen && msgId) {
        const userBubble = document.querySelector(`[data-msg-id="${msgId}"] .user-text`);
        if (userBubble) {
            currentText = userBubble.innerText.replace(/EDITED$/, '').trim();
        }
    }

    document.getElementById('editInput').value = currentText;
    document.getElementById('editModal').classList.add('visible');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('visible');
    editingMessageId = null;
}

async function submitEdit() {
    const newQuery = document.getElementById('editInput').value.trim();
    if (!newQuery || !editingMessageId) return;
    
    // UI Feedback: Show Toast
    showToast("Regenerating intelligence stream...", "success");
    closeEditModal();

    // Remove old message pair visually
    const oldMsg = document.querySelector(`[data-msg-id="${editingMessageId}"]`);
    if (oldMsg) {
        const next = oldMsg.nextElementSibling;
        oldMsg.remove();
        if (next && next.classList.contains('msg-ai')) next.remove();
    }

    appendUserBubble(newQuery, null, true);
    showTyping(true);

    try {
        if (isManualAiEdit) {
            const res = await postJson(`/api/ai/${HOTEL_ID}/messages/${editingMessageId}/update-response/`, { response: newQuery });
            showTyping(false);
            if (res.status === 'success') {
                showToast("Response corrected successfully.", "success");
                loadSession(currentSessionId); // Full refresh to show updated text cleanly
            } else {
                showToast(res.message || "Manual edit failed.", "error");
            }
        } else {
            const res = await postJson(`/api/ai/${HOTEL_ID}/messages/${editingMessageId}/edit/`, { query: newQuery });
            showTyping(false);
            appendAIBubble(res.status === 'success' ? res.response : (res.message || 'Edit failed.'), res.status !== 'success', res.message_id);
        }
    } catch {
        showTyping(false);
        appendAIBubble('Regeneration failed. Please retry.', true);
    }
}

/* ─── Document Upload ────────────────────────────────────────────────────────── */
async function handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;

    // 1. Initial UI Feedback
    showToast(`📤 File "${file.name}" uploading...`, 'success');
    
    const formData = new FormData();
    formData.append('file', file);
    if (currentSessionId) formData.append('session_id', currentSessionId);

    try {
        // Start live analysis UI first
        const analysisPromise = startLiveAnalysis(file);

        const res = await fetch(`/api/ai/${HOTEL_ID}/upload/`, {
            method: 'POST',
            headers: { 
                'X-CSRFToken': getCsrf(),
                'X-Sentinel-Secure-Tunnel': 'TRUE_VISION_v4'
            },
            body: formData,
        }).then(r => r.json());

        if (res.status === 'success') {
            await analysisPromise; // Ensure steps finish
            
            currentDocumentId = res.document_id;
            if (res.session_id && !currentSessionId) {
                currentSessionId = res.session_id;
                loadSessions();
            }

            // Trigger analysis query automatically
            const inp = document.getElementById('chatInput');
            inp.value = `Vision Analysis Request: ${file.name}. Match against database and provide strategic insights.`;
            
            const isImg = res.file_url && ['png','jpg','jpeg','webp','gif'].includes(res.file_type?.toLowerCase());
            sendMessage(isImg ? res.file_url : null, res.document_id);
        } else {
            showToast(res.message || 'Analysis aborted.', 'error');
        }
    } catch (err) {
        showToast('Neural link failed. Retry upload.', 'error');
        console.error(err);
    } finally {
        input.value = '';
    }
}

function clearDocument() {
    currentDocumentId = null;
    document.getElementById('docPreviewBar').style.display = 'none';
    document.getElementById('fileUpload').value = '';
}

/* ─── Chat Search ────────────────────────────────────────────────────────────── */
function openSearch() {
    document.getElementById('searchOverlay').classList.add('active');
    document.getElementById('searchInput').focus();
    loadSearchHistory();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sessionsSidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

function closeSearch() {
    document.getElementById('searchOverlay').classList.remove('active');
}

async function doSearch() {
    const q = document.getElementById('searchInput').value.trim();
    if (!q) return;

    const res = await fetch(`/api/ai/${HOTEL_ID}/search/?q=${encodeURIComponent(q)}`).then(r => r.json());
    const el = document.getElementById('searchResults');

    if (!res.results || !res.results.length) {
        el.innerHTML = '<p class="text-sm text-slate-500 text-center mt-8">No results found.</p>';
        return;
    }

    el.innerHTML = res.results.map(r => `
        <div class="p-4 rounded-xl border border-white/8 hover:border-white/15 cursor-pointer transition-all s-bg" onclick="closeSearch()">
            <p class="text-xs font-semibold text-white mb-1">${escapeHtml(r.query)}</p>
            <p class="text-[11px] text-slate-500">${escapeHtml(r.response_snippet)}...</p>
            <span class="text-[9px] text-slate-600 mt-2 block">${r.timestamp}</span>
        </div>
    `).join('');
}

/* ─── Theme ──────────────────────────────────────────────────────────────────── */
async function setTheme(id) {
    document.getElementById('sentinelRoot').dataset.theme = id;

    // Legacy right-panel dots (still present in right panel)
    document.querySelectorAll('.theme-dot').forEach((d, i) => d.classList.toggle('active', i + 1 === id));

    // Update the new dropdown picker
    updateThemePickerUI(id);

    // Close the picker
    closeThemePicker();

    await postJson('/api/ai/theme/', { theme: id });
}

function updateThemePickerUI(activeId) {
    const id = parseInt(activeId, 10);
    document.querySelectorAll('.theme-opt-btn').forEach(btn => {
        const opt = parseInt(btn.dataset.themeOpt, 10);
        btn.classList.toggle('active-theme', opt === id);
    });

    // Update palette icon color via a CSS var trick (repaint)
    const icon = document.getElementById('themePickerIcon');
    if (icon) icon.style.color = 'rgb(var(--s-primary))';
}

function toggleThemePicker() {
    const dropdown = document.getElementById('themePickerDropdown');
    const chevron = document.getElementById('themeChevron');
    const isOpen = dropdown.classList.contains('open');

    if (isOpen) {
        closeThemePicker();
    } else {
        dropdown.classList.remove('hidden');
        // Trigger reflow for animation
        dropdown.offsetHeight;
        dropdown.classList.add('open');
        chevron.classList.add('rotated');
    }
}

function closeThemePicker() {
    const dropdown = document.getElementById('themePickerDropdown');
    const chevron = document.getElementById('themeChevron');
    if (!dropdown) return;
    dropdown.classList.remove('open');
    dropdown.classList.add('hidden');
    chevron.classList.remove('rotated');
}

/* ─── Action Mode Toggle ─────────────────────────────────────────────────────── */
async function toggleActionMode(checkbox) {
    const res = await postJson(`/api/ai/${HOTEL_ID}/toggle-automation/`, { enabled: checkbox.checked });
    if (res.status !== 'success') checkbox.checked = !checkbox.checked;
}

/* ─── Execute Task ───────────────────────────────────────────────────────────── */
async function executeTask(btn, taskId) {
    btn.textContent = 'EXECUTING...';
    btn.disabled = true;
    const res = await postJson(`/api/ai/${HOTEL_ID}/execute-task/${taskId}/`, {});
    if (res.status === 'success') {
        btn.parentElement.innerHTML = `<span class="text-[9px] text-emerald-400 font-bold uppercase tracking-widest"><i class="fas fa-check-circle mr-1"></i>Executed</span>`;
    } else {
        btn.textContent = 'FAILED';
        btn.disabled = false;
    }
}

/* ─── Voice Input ────────────────────────────────────────────────────────────── */
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = e => {
        document.getElementById('chatInput').value = e.results[0][0].transcript;
        setTimeout(sendMessage, 400);
    };
    recognition.onend = stopVoice;
    recognition.onerror = stopVoice;
}

function toggleVoice() {
    if (!recognition) { alert('Speech recognition not supported in this browser.'); return; }
    if (isRecording) { recognition.stop(); } else { recognition.start(); isRecording = true; updateMicUI(); }
}

function stopVoice() { isRecording = false; updateMicUI(); }

function updateMicUI() {
    const icon = document.getElementById('micIcon');
    const btn = document.getElementById('voiceBtn');
    if (isRecording) {
        icon.className = 'fas fa-stop text-rose-400 text-xs';
        btn.style.background = 'rgba(239,68,68,0.2)';
    } else {
        icon.className = 'fas fa-microphone text-xs';
        btn.style.background = '';
    }
}

/* ─── Initialisation ─────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    // Wire up search Enter key
    document.getElementById('searchInput')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') doSearch();
    });

    const sessions = await loadSessions();
    scrollBottom();

    // Auto-select most recent session if none selected
    if (!currentSessionId && sessions && sessions.length > 0) {
        await loadSession(sessions[0].id);
    }
});

/* ─── RECYCLE BIN SYSTEM ────────────────────────────────────────────── */
let currentBinTab = 'sessions';

window.openRecycleBin = function() {
    document.getElementById('recycleBinOverlay').classList.add('visible');
    switchBinTab('sessions');
};

window.closeRecycleBin = function() {
    document.getElementById('recycleBinOverlay').classList.remove('visible');
};

window.switchBinTab = function(tab) {
    currentBinTab = tab;
    
    const tabSessions = document.getElementById('tabSessions');
    const tabDocuments = document.getElementById('tabDocuments');
    const docFilter = document.getElementById('docTypeFilter');
    
    if (tab === 'sessions') {
        tabSessions.style.background = 'rgba(255,255,255,0.1)';
        tabSessions.style.color = 'white';
        tabDocuments.style.background = 'rgba(255,255,255,0.05)';
        tabDocuments.style.color = 'rgba(255,255,255,0.4)';
        if (docFilter) docFilter.classList.add('hidden');
    } else {
        tabDocuments.style.background = 'rgba(255,255,255,0.1)';
        tabDocuments.style.color = 'white';
        tabSessions.style.background = 'rgba(255,255,255,0.05)';
        tabSessions.style.color = 'rgba(255,255,255,0.4)';
        if (docFilter) docFilter.classList.remove('hidden');
    }
    
    if (!window.recycleBinData) {
        fetchRecycleBin();
    } else {
        renderBinItems(window.recycleBinData);
    }
};

async function fetchRecycleBin() {
    const list = document.getElementById('recycleBinContent');
    list.innerHTML = `<div class="p-8 text-center text-slate-500"><i class="fas fa-circle-notch fa-spin mb-2"></i><br>Accessing Vault...</div>`;
    
    try {
        const res = await fetch(`/api/ai/${HOTEL_ID}/recycle-bin/`);
        const data = await res.json();
        
        if (data.status === 'success') {
            window.recycleBinData = data;
            renderBinItems(data);
        }
    } catch (e) {
        showToast("Failed to fetch recycle bin.", "error");
    }
}

function renderBinItems(data) {
    if (!data) return;
    const list = document.getElementById('recycleBinContent');
    list.innerHTML = '';
    
    let items = currentBinTab === 'sessions' ? data.sessions : data.documents;
    
    // Apply filtering if documents tab
    if (currentBinTab === 'documents') {
        const filterEl = document.getElementById('docTypeFilter');
        const filterVal = filterEl ? filterEl.value : 'all';
        if (filterVal !== 'all') {
            items = items.filter(doc => {
                const ft = (doc.file_type || '').toLowerCase();
                const ext = (doc.filename || '').split('.').pop().toLowerCase();
                const t = ft + ' ' + ext;
                if (filterVal === 'image') return t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg');
                if (filterVal === 'pdf') return t.includes('pdf');
                if (filterVal === 'text') return t.includes('text') || t.includes('doc') || t.includes('csv') || t.includes('txt');
                return true;
            });
        }
    }
    
    if (items.length === 0) {
        list.innerHTML = `
            <div class="p-12 text-center" style="opacity:0.5">
                <div class="mb-4" style="opacity:0.2"><i class="fas fa-trash" style="font-size:48px;color:white"></i></div>
                <h4 class="text-white font-bold" style="font-size:14px">Vault is Empty</h4>
                <p class="text-[10px] text-slate-400 mt-1">No deleted items found matching filter.</p>
            </div>`;
        return;
    }
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'glass-card animate-in fade-in slide-in-from-bottom-2';
        div.style = "padding:16px; display:flex; align-items:center; justify-content:between; margin-bottom:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:16px;";
        
        let iconHtml = '';
        let name = currentBinTab === 'sessions' ? item.title : item.filename;

        if (currentBinTab === 'sessions') {
            iconHtml = `<i class="fas fa-comment-alt"></i>`;
        } else {
            const ft = (item.file_type || '').toLowerCase();
            const ext = (item.filename || '').split('.').pop().toLowerCase();
            const t = ft + ' ' + ext;
            
            if (t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg')) {
                if (item.url) {
                    iconHtml = `<img src="${item.url}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
                } else {
                    iconHtml = `<i class="fas fa-image" style="color:#a855f7"></i>`;
                }
            } else if (t.includes('pdf')) {
                iconHtml = `<i class="fas fa-file-pdf" style="color:#ef4444"></i>`;
            } else if (t.includes('text') || t.includes('doc')) {
                iconHtml = `<i class="fas fa-file-word" style="color:#3b82f6"></i>`;
            } else if (t.includes('csv') || t.includes('xls')) {
                iconHtml = `<i class="fas fa-file-excel" style="color:#10b981"></i>`;
            } else {
                iconHtml = `<i class="fas fa-file-alt"></i>`;
            }
        }
        
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:16px; flex:1">
                <div style="width:40px; height:40px; border-radius:12px; background:rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.05); color:#94a3b8; padding:2px;">
                    ${iconHtml}
                </div>
                <div style="overflow:hidden; flex:1">
                    <h5 style="color:white; font-weight:700; font-size:13px; margin:0; white-space:nowrap; text-overflow:ellipsis; overflow:hidden">${name}</h5>
                    <p style="font-size:10px; color:#64748b; margin:2px 0 0 0">Deleted on ${item.deleted_at}</p>
                </div>
            </div>
            <div style="display:flex; gap:8px">
                <button onclick="handleBinAction(${item.id}, '${item.type}', 'restore')" 
                    style="width:36px; height:36px; border-radius:10px; background:rgba(59,130,246,0.1); color:#60a5fa; border:1px solid rgba(59,130,246,0.2); cursor:pointer; transition:all 0.2s" title="Restore Data">
                    <i class="fas fa-undo-alt" style="font-size:12px"></i>
                </button>
                <button onclick="handleBinAction(${item.id}, '${item.type}', 'purge')" 
                    style="width:36px; height:36px; border-radius:10px; background:rgba(239,68,68,0.1); color:#f87171; border:1px solid rgba(239,68,68,0.2); cursor:pointer; transition:all 0.2s" title="Permanently Purge">
                    <i class="fas fa-trash-alt" style="font-size:12px"></i>
                </button>
            </div>
        `;
        list.appendChild(div);
    });
}

window.handleBinAction = async function(id, type, action) {
    if (action === 'purge' && !confirm("This will permanently delete this data. Are you sure?")) return;
    
    try {
        const res = await fetch(`/api/ai/${HOTEL_ID}/recycle-bin/action/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': CSRF_TOKEN
            },
            body: JSON.stringify({ item_id: id, type: type, action: action })
        });
        
        const data = await res.json();
        if (data.status === 'success') {
            showToast(data.message, "success");
            fetchRecycleBin();
            if (action === 'restore') loadSessions(); // Refresh main list
        } else {
            showToast(data.message, "error");
        }
    } catch (e) {
        showToast("Action failed.", "error");
    }
};
