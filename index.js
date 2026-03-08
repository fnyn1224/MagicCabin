export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const ROOM_PWD = env.CHAT_PASSWORD || "123456";
    const isAuth = (req) => req.headers.get("Authorization") === ROOM_PWD;

    const json = (data, init = {}) =>
      new Response(JSON.stringify(data), {
        headers: { "content-type": "application/json;charset=UTF-8" },
        ...init,
      });

    if (pathname === "/api/messages") {
      if (!isAuth(request)) return new Response("Unauthorized", { status: 401 });
      const data = await env.CHAT_KV.get("msgs");
      return new Response(data || "[]", {
        headers: { "content-type": "application/json;charset=UTF-8" },
      });
    }

    if (pathname === "/api/send" && request.method === "POST") {
      if (!isAuth(request)) return new Response("Unauthorized", { status: 401 });

      const body = await request.json();
      const raw = (await env.CHAT_KV.get("msgs")) || "[]";
      const history = JSON.parse(raw);

      const now = Date.now();
      const newMsg = {
        id: "m-" + now + "-" + Math.random().toString(36).slice(2, 8),
        nick: (body.nick || "小巫师").trim() || "小巫师",
        text: String(body.text || ""),
        tag: (body.tag || "").trim().slice(0, 20),
        timestamp: now,
      };

      history.push(newMsg);
      await env.CHAT_KV.put("msgs", JSON.stringify(history.slice(-100)));

      return json({ id: newMsg.id, timestamp: newMsg.timestamp });
    }

    if (pathname === "/api/update-tag" && request.method === "POST") {
      if (!isAuth(request)) return new Response("Unauthorized", { status: 401 });

      const { id, tag } = await request.json();
      const history = JSON.parse((await env.CHAT_KV.get("msgs")) || "[]");
      const idx = history.findIndex((m) => m.id === id);

      if (idx !== -1) {
        history[idx].tag = (tag || "").trim();
        await env.CHAT_KV.put("msgs", JSON.stringify(history));
      }

      return new Response("ok");
    }

    if (pathname === "/api/delete" && request.method === "POST") {
      if (!isAuth(request)) return new Response("Unauthorized", { status: 401 });

      const { id } = await request.json();
      const history = JSON.parse((await env.CHAT_KV.get("msgs")) || "[]");
      await env.CHAT_KV.put(
        "msgs",
        JSON.stringify(history.filter((m) => m.id !== id))
      );

      return new Response("ok");
    }

    if (pathname === "/api/clear" && request.method === "POST") {
      if (!isAuth(request)) return new Response("Unauthorized", { status: 401 });
      await env.CHAT_KV.put("msgs", "[]");
      return new Response("ok");
    }

    return new Response(
      `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>MagicCabin 🪄</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
  <style>
    body {
      height: 100dvh;
      display: flex;
      flex-direction: column;
      background: #f1f5f9;
      color: #334155;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
      -webkit-tap-highlight-color: transparent;
    }

    #chat-flow {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      scroll-behavior: smooth;
    }

    #chat-flow::-webkit-scrollbar {
      width: 6px;
    }

    #chat-flow::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 999px;
    }

    .magic-shell {
      width: 100%;
      max-width: 56rem;
      margin: 0 auto;
    }

    .magic-avatar {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      flex: 0 0 auto;
    }

    .spell-card {
      background: white;
      border-radius: 20px;
      margin-bottom: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }

    .magic-tag {
      font-size: 10px;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 8px;
      border: 1px solid transparent;
      white-space: nowrap;
    }

    .bottom-console {
      background: rgba(255,255,255,0.96);
      backdrop-filter: blur(20px);
      border-top: 1px solid #e2e8f0;
      padding: 12px 16px 24px;
    }

    .sealed-overlay {
      position: absolute;
      inset: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      user-select: none;
      pointer-events: none;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.01em;
      background:
        repeating-linear-gradient(
          -45deg,
          #f8fafc 0px,
          #f8fafc 12px,
          #f1f5f9 12px,
          #f1f5f9 24px
        );
      box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.8);
    }

    .message-body {
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
      transition: opacity .16s ease;
    }

    .toolbar-btn {
      width: 28px;
      height: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #cbd5e1;
      border-radius: 8px;
      transition: background .15s ease, color .15s ease;
      background: transparent;
      border: none;
      outline: none;
    }

    .toolbar-btn-primary.is-active {
      color: #6366f1;
    }

    .toolbar-btn-danger {
      color: #cbd5e1;
    }

    .toolbar-btn-danger:focus,
    .toolbar-btn-danger:active {
      color: #cbd5e1;
      background: transparent;
      outline: none;
    }

    .toolbar-btn-soft {
      color: #cbd5e1;
    }

    .fade-enter {
      animation: fadeEnter .18s ease-out;
    }

    @keyframes fadeEnter {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .top-action-btn {
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: #cbd5e1;
      border-radius: 10px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background .15s ease, color .15s ease, border-color .15s ease;
      outline: none;
    }

    .top-action-btn:focus,
    .top-action-btn:active {
      color: #cbd5e1;
      background: rgba(255,255,255,0.04);
      border-color: rgba(255,255,255,0.08);
      outline: none;
    }

    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }

    #confirm-modal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 999;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    #confirm-modal.show {
      display: flex;
    }

    @media (hover: hover) and (pointer: fine) {
      .toolbar-btn:hover {
        background: #f8fafc;
      }

      .toolbar-btn-primary:hover {
        color: #6366f1;
      }

      .toolbar-btn-danger:hover {
        color: #ef4444;
        background: #fef2f2;
      }

      .toolbar-btn-soft:hover {
        color: #64748b;
      }

      .top-action-btn:hover {
        background: rgba(255,255,255,0.08);
        color: white;
      }

      #tagBtn:hover {
        background: #f8fafc;
      }
    }

    @media (hover: none) and (pointer: coarse) {
      .toolbar-btn:hover,
      .toolbar-btn-danger:hover,
      .toolbar-btn-primary:hover,
      .toolbar-btn-soft:hover,
      .top-action-btn:hover,
      #tagBtn:hover {
        background: inherit;
        color: inherit;
      }
    }

    @media (max-width: 640px) {
      #chat-flow { padding: 12px 10px 14px; }
      .bottom-console { padding: 10px 10px 16px; }
      .spell-card { margin-bottom: 12px; border-radius: 18px; }
    }
  </style>
</head>
<body>
  <header class="h-14 shrink-0 bg-[#0f172a] text-white px-4 flex justify-between items-center z-50">
    <div class="flex items-center gap-2">
      <i class="fa-solid fa-wand-magic-sparkles text-yellow-400"></i>
      <span class="font-bold text-sm">MagicCabin</span>
    </div>

    <button onclick="clearAllMessages(event)" class="top-action-btn" title="清空消息">
      <i class="fa-solid fa-broom text-[11px]"></i>
      <span>清空</span>
    </button>
  </header>

  <div id="tag-filter-bar" class="flex gap-2 overflow-x-auto p-3 bg-white border-b border-slate-100 scrollbar-hide"></div>

  <main id="chat-flow">
    <div class="magic-shell">
      <div id="chat-list"></div>
    </div>
  </main>

  <footer class="bottom-console shrink-0">
    <div class="magic-shell">
      <div class="flex items-center justify-between mb-3 px-1 gap-3">
        <div class="flex items-center gap-2 min-w-0">
          <div class="magic-avatar !w-8 !h-8 !text-xs">我</div>
          <input
            type="text"
            id="nick"
            value="小巫师_${Math.floor(Math.random()*900+100)}"
            class="bg-transparent text-xs font-bold text-indigo-600 outline-none w-28 min-w-0"
          >
        </div>

        <div class="flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-full shrink-0">
          <button onclick="handleManualSoundUnlock()" class="text-slate-400 hover:text-indigo-600 transition" title="激活提示音">
            <i class="fa-solid fa-volume-high text-[10px]"></i>
          </button>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" id="notify-toggle" class="w-3.5 h-3.5 accent-indigo-600">
            <span class="text-[9px] font-bold text-slate-500 uppercase">Notify</span>
          </label>
        </div>
      </div>

      <div class="flex gap-2 items-center bg-slate-100 rounded-2xl p-1.5 border border-slate-200">
        <button
          id="tagBtn"
          onclick="editSendTag()"
          class="text-xs font-bold px-3 h-11 rounded-xl bg-white border border-slate-200 text-slate-500 shrink-0"
          title="设置发送标签"
        >
          #标签
        </button>

        <textarea
          id="msg"
          placeholder="输入咒语..."
          class="flex-1 bg-transparent text-sm px-3 py-2 outline-none min-h-[44px] max-h-32 resize-none"
          rows="1"
        ></textarea>

        <button
          onclick="send()"
          id="sendBtn"
          class="bg-indigo-600 text-white w-11 h-11 rounded-xl flex items-center justify-center shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <i class="fa-solid fa-paper-plane text-xs"></i>
        </button>
      </div>
    </div>
  </footer>

  <div id="confirm-modal">
    <div id="confirm-backdrop" class="absolute inset-0 bg-slate-900/28 backdrop-blur-[2px]"></div>

    <div class="relative w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-xl p-5">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <div class="min-w-0">
          <div id="confirm-title" class="text-sm font-bold text-slate-800">确认操作</div>
          <div id="confirm-desc" class="text-xs text-slate-500 mt-1 leading-5">请确认是否继续。</div>
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-5">
        <button
          id="confirm-cancel"
          class="px-4 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold bg-white hover:bg-slate-50 transition"
        >
          取消
        </button>
        <button
          id="confirm-ok"
          class="px-4 h-10 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition"
        >
          确定
        </button>
      </div>
    </div>
  </div>

  <script>
    let password = localStorage.getItem('chat_token');
    let rawData = [];
    let currentFilter = null;
    let currentTag = "";

    let manualRevealedIds = new Set();
    let autoRevealedIds = new Set();
    let autoHideTimers = new Map();
    let mySentIds = new Set();
    let knownMsgIds = new Set();
    let isFirstLoad = true;
    let isLoading = false;
    let isSending = false;
    let lastSendAt = 0;

    const messageDomMap = new Map();
    let pendingDeleteSnapshots = new Map();

    const AUTO_HIDE_MS = 5000;

    const chatList = document.getElementById('chat-list');
    const nickInput = document.getElementById('nick');
    const msgInput = document.getElementById('msg');
    const sendBtn = document.getElementById('sendBtn');
    const notifyToggle = document.getElementById('notify-toggle');

    const confirmModal = document.getElementById('confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmDesc = document.getElementById('confirm-desc');
    const confirmOkBtn = document.getElementById('confirm-ok');
    const confirmCancelBtn = document.getElementById('confirm-cancel');
    const confirmBackdrop = document.getElementById('confirm-backdrop');

    let confirmResolver = null;

    const savedNick = localStorage.getItem('chat_nick');
    if (savedNick) nickInput.value = savedNick;
    nickInput.addEventListener('change', (e) => {
      localStorage.setItem('chat_nick', e.target.value);
    });

    const savedNotify = localStorage.getItem('notify_enabled');
    notifyToggle.checked = savedNotify === null ? true : savedNotify === 'true';
    notifyToggle.onchange = () => {
      localStorage.setItem('notify_enabled', String(notifyToggle.checked));
    };

    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3');
    audio.preload = 'auto';
    let audioUnlocked = false;

    async function unlockAudio() {
      if (audioUnlocked) return;
      try {
        audio.muted = true;
        audio.currentTime = 0;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        audioUnlocked = true;
      } catch (e) {}
    }

    async function handleManualSoundUnlock() {
      await unlockAudio();
      playMagicSound();
    }

    document.body.addEventListener('click', unlockAudio, { once: true });
    msgInput.addEventListener('focus', unlockAudio, { once: true });

    function playMagicSound() {
      audio.currentTime = 0;
      audio.play().catch((e) => {
        console.log('notify sound failed:', e);
      });
    }

    function escapeHtml(str) {
      return String(str || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function formatDate(m) {
      if (!m.timestamp) return "";
      const d = new Date(m.timestamp);
      return \`\${d.getFullYear()}-\${String(d.getMonth()+1).padStart(2,'0')}-\${String(d.getDate()).padStart(2,'0')} \${String(d.getHours()).padStart(2,'0')}:\${String(d.getMinutes()).padStart(2,'0')}\`;
    }

    function getTagStyle(str) {
      const colors = [
        { bg:'#eef2ff', text:'#4f46e5', border:'#c7d2fe' },
        { bg:'#f0fdf4', text:'#16a34a', border:'#bbf7d0' },
        { bg:'#fff7ed', text:'#ea580c', border:'#fed7aa' },
        { bg:'#fff1f2', text:'#e11d48', border:'#fecdd3' },
        { bg:'#ecfeff', text:'#0891b2', border:'#a5f3fc' }
      ];
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    }

    function renderSendTagButton() {
      const btn = document.getElementById('tagBtn');
      if (!btn) return;

      btn.removeAttribute('style');

      if (!currentTag) {
        btn.textContent = '#标签';
        btn.className =
          'text-xs font-bold px-3 h-11 rounded-xl bg-white border border-slate-200 text-slate-500 shrink-0';
        return;
      }

      const s = getTagStyle(currentTag);
      btn.textContent = '#' + currentTag;
      btn.className = 'text-xs font-bold px-3 h-11 rounded-xl border shrink-0';
      btn.style.background = s.bg;
      btn.style.color = s.text;
      btn.style.borderColor = s.border;
    }

    function editSendTag() {
      const t = prompt("输入发送标签（留空可清除）：", currentTag || "");
      if (t === null) return;

      currentTag = t.trim().replace(/^#/, '').slice(0, 20);
      renderSendTagButton();
    }

    function parseInlineTag(text) {
      const value = String(text || '');
      const match = value.match(/^#([^\\s#]+)\\s+([\\s\\S]+)$/);

      if (!match) {
        return {
          tag: currentTag,
          text: value
        };
      }

      const parsedTag = match[1].trim().slice(0, 20);
      const parsedText = match[2].trim();

      return {
        tag: parsedTag,
        text: parsedText
      };
    }

    function isRevealed(id) {
      return manualRevealedIds.has(id) || autoRevealedIds.has(id);
    }

    function openConfirmModal({
      title = '确认操作',
      desc = '请确认是否继续。',
      okText = '确定',
      okClass = 'bg-red-500 hover:bg-red-600'
    } = {}) {
      confirmTitle.textContent = title;
      confirmDesc.textContent = desc;
      confirmOkBtn.textContent = okText;
      confirmOkBtn.className =
        'px-4 h-10 rounded-xl text-white text-sm font-semibold transition ' + okClass;

      confirmModal.classList.add('show');

      return new Promise((resolve) => {
        confirmResolver = resolve;
      });
    }

    function closeConfirmModal(result) {
      confirmModal.classList.remove('show');
      if (confirmResolver) {
        confirmResolver(result);
        confirmResolver = null;
      }
    }

    confirmCancelBtn.addEventListener('click', () => closeConfirmModal(false));
    confirmBackdrop.addEventListener('click', () => closeConfirmModal(false));
    confirmOkBtn.addEventListener('click', () => closeConfirmModal(true));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && confirmModal.classList.contains('show')) {
        closeConfirmModal(false);
      }
    });

    function autoRevealMessage(id, ms = AUTO_HIDE_MS) {
      if (manualRevealedIds.has(id)) return;

      autoRevealedIds.add(id);
      updateMessageRevealState(id);

      if (autoHideTimers.has(id)) {
        clearTimeout(autoHideTimers.get(id));
      }

      const timer = setTimeout(() => {
        autoRevealedIds.delete(id);
        autoHideTimers.delete(id);
        updateMessageRevealState(id);
      }, ms);

      autoHideTimers.set(id, timer);
    }

    function clearAutoReveal(id) {
      if (autoHideTimers.has(id)) {
        clearTimeout(autoHideTimers.get(id));
        autoHideTimers.delete(id);
      }
      autoRevealedIds.delete(id);
      updateMessageRevealState(id);
    }

    async function api(url, options = {}) {
      options.headers = {
        ...options.headers,
        'Authorization': password,
        'Content-Type': 'application/json'
      };

      const res = await fetch(url, options);

      if (res.status === 401) {
        const input = prompt("🔐 暗号：");
        if (input) {
          password = input;
          localStorage.setItem('chat_token', input);
          location.reload();
        }
      }

      return res;
    }

    function getFilteredData() {
      const list = currentFilter
        ? rawData.filter(m => m.tag === currentFilter)
        : rawData.slice();

      return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    function renderTags() {
      const bar = document.getElementById('tag-filter-bar');
      const tags = [...new Set(rawData.map(m => m.tag).filter(Boolean))];

      let html = \`
        <span onclick="setFilter(null)" class="magic-tag shrink-0 cursor-pointer \${!currentFilter ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}">全部</span>
      \`;

      tags.forEach(t => {
        const s = getTagStyle(t);
        const active = currentFilter === t;
        html += \`
          <span
            onclick="setFilter(\${JSON.stringify(t)})"
            class="magic-tag shrink-0 cursor-pointer \${active ? 'ring-1 ring-slate-300 shadow-sm' : ''}"
            style="background:\${s.bg}; color:\${s.text}; border-color:\${s.border}"
          >#\${escapeHtml(t)}</span>
        \`;
      });

      bar.innerHTML = html;
    }

    function renderEmptyState() {
      chatList.innerHTML = \`
        <div id="empty-state" class="text-center text-slate-400 text-sm py-12">
          <div class="text-2xl mb-2">✨</div>
          <div>\${currentFilter ? '这个标签下还没有咒语' : '这里还没有咒语'}</div>
        </div>
      \`;
    }

    function removeEmptyState() {
      const empty = document.getElementById('empty-state');
      if (empty) empty.remove();
    }

    function buildCardHtml(m) {
      const s = m.tag ? getTagStyle(m.tag) : null;
      const revealed = isRevealed(m.id);
      const timeText = formatDate(m);

      return \`
        <div class="flex justify-between items-start mb-4 gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="magic-avatar">\${escapeHtml((m.nick || '咒').slice(0, 1))}</div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 min-w-0 flex-wrap">
                <div class="text-[13px] font-bold text-slate-800 truncate" data-role="nick">\${escapeHtml(m.nick || '匿名')}</div>
                <div class="text-[11px] text-slate-400" data-role="time">\${escapeHtml(timeText)}</div>
              </div>
            </div>
          </div>

          <div class="flex gap-2 shrink-0">
            <button onclick="toggleEye('\${m.id}')" class="toolbar-btn toolbar-btn-primary \${revealed ? 'is-active' : ''}" data-role="eye-btn" title="\${revealed ? '隐藏' : '查看'}">
              <i class="fa-solid \${revealed ? 'fa-eye' : 'fa-eye-slash'} text-[13px]" data-role="eye-icon"></i>
            </button>

            <button onclick="deleteMsg('\${m.id}', event)" class="toolbar-btn toolbar-btn-danger" title="删除">
              <i class="fa-solid fa-trash-can text-[13px]"></i>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 mb-2 min-h-[20px]">
          <div data-role="tag-box">
            \${m.tag ? \`<span class="magic-tag" style="background:\${s.bg}; color:\${s.text}; border-color:\${s.border}">#\${escapeHtml(m.tag)}</span>\` : ''}
          </div>

          <button onclick="updateTag('\${m.id}', \${JSON.stringify(m.tag || '')})" class="toolbar-btn toolbar-btn-soft !w-6 !h-6" title="编辑标签">
            <i class="fa-solid fa-pen text-[10px]"></i>
          </button>
        </div>

        <div class="relative min-h-[54px] bg-slate-50 rounded-xl p-3" data-role="body-wrap">
          \${!revealed ? \`<div class="sealed-overlay" data-role="sealed"><span style="display:flex;align-items:center;gap:6px;"><i class="fa-solid fa-lock" style="font-size:11px;"></i><span>咒语已被封印，点击眼睛解封</span></span></div>\` : ''}
          <div class="message-body text-sm text-slate-700 leading-6 \${!revealed ? 'opacity-0' : 'opacity-100'}" data-role="message-body">\${escapeHtml(m.text || '')}</div>
        </div>
      \`;
    }

    function createMessageCard(m, animate = false) {
      const div = document.createElement('div');
      div.className = 'spell-card p-5' + (animate ? ' fade-enter' : '');
      div.dataset.id = m.id;
      div.innerHTML = buildCardHtml(m);
      return div;
    }

    function rebuildVisibleList(animateNewIds = new Set()) {
      const filtered = getFilteredData();

      messageDomMap.clear();
      chatList.innerHTML = '';

      if (!filtered.length) {
        renderEmptyState();
        return;
      }

      filtered.forEach((m) => {
        const el = createMessageCard(m, animateNewIds.has(m.id));
        chatList.appendChild(el);
        messageDomMap.set(m.id, el);
      });
    }

    function updateMessageRevealState(id) {
      const el = messageDomMap.get(id);
      if (!el) return;

      const revealed = isRevealed(id);
      const eyeBtn = el.querySelector('[data-role="eye-btn"]');
      const eyeIcon = el.querySelector('[data-role="eye-icon"]');
      const body = el.querySelector('[data-role="message-body"]');
      const sealed = el.querySelector('[data-role="sealed"]');

      if (eyeBtn) {
        eyeBtn.title = revealed ? '隐藏' : '查看';
        eyeBtn.classList.toggle('is-active', revealed);
      }

      if (eyeIcon) {
        eyeIcon.className = 'fa-solid ' + (revealed ? 'fa-eye' : 'fa-eye-slash') + ' text-[13px]';
      }

      if (body) {
        body.classList.toggle('opacity-0', !revealed);
        body.classList.toggle('opacity-100', revealed);
      }

      if (revealed) {
        if (sealed) sealed.remove();
      } else if (!sealed) {
        const wrap = el.querySelector('[data-role="body-wrap"]');
        if (wrap) {
          const overlay = document.createElement('div');
          overlay.className = 'sealed-overlay';
          overlay.dataset.role = 'sealed';
          overlay.innerHTML = '<span style="display:flex;align-items:center;gap:6px;"><i class="fa-solid fa-lock" style="font-size:11px;"></i><span>咒语已被封印，点击眼睛解封</span></span>';
          wrap.appendChild(overlay);
        }
      }
    }

    function updateMessageCard(id, message) {
      const el = messageDomMap.get(id);
      if (!el) return;

      const s = message.tag ? getTagStyle(message.tag) : null;
      const nickEl = el.querySelector('[data-role="nick"]');
      const timeEl = el.querySelector('[data-role="time"]');
      const tagBox = el.querySelector('[data-role="tag-box"]');
      const body = el.querySelector('[data-role="message-body"]');

      if (nickEl) nickEl.textContent = message.nick || '匿名';
      if (timeEl) timeEl.textContent = formatDate(message);
      if (body) body.textContent = message.text || '';

      if (tagBox) {
        tagBox.innerHTML = message.tag
          ? \`<span class="magic-tag" style="background:\${s.bg}; color:\${s.text}; border-color:\${s.border}">#\${escapeHtml(message.tag)}</span>\`
          : '';
      }

      updateMessageRevealState(id);
    }

    function insertMessageCard(message, animate = true) {
      removeEmptyState();

      const el = createMessageCard(message, animate);
      const currentEls = [...chatList.querySelectorAll('.spell-card')];

      if (!currentEls.length) {
        chatList.appendChild(el);
        messageDomMap.set(message.id, el);
        return;
      }

      let inserted = false;
      for (const existingEl of currentEls) {
        const existingId = existingEl.dataset.id;
        const existingMsg = rawData.find(m => m.id === existingId);
        const existingTs = existingMsg?.timestamp || 0;
        const newTs = message.timestamp || 0;

        if (newTs >= existingTs) {
          chatList.insertBefore(el, existingEl);
          inserted = true;
          break;
        }
      }

      if (!inserted) chatList.appendChild(el);
      messageDomMap.set(message.id, el);
    }

    function removeMessageCard(id) {
      const el = messageDomMap.get(id);
      if (el) el.remove();
      messageDomMap.delete(id);

      if (!messageDomMap.size && !getFilteredData().length) {
        renderEmptyState();
      }
    }

    function getMessageById(id) {
      return rawData.find(m => m.id === id) || null;
    }

    function removeMessageFromLocalState(id) {
      rawData = rawData.filter(m => m.id !== id);
      manualRevealedIds.delete(id);
      clearAutoReveal(id);
      mySentIds.delete(id);
      knownMsgIds.delete(id);
    }

    function insertMessageToLocalState(message) {
      if (!message) return;
      if (!rawData.some(m => m.id === message.id)) {
        rawData.push(message);
      }
    }

    function setFilter(tag) {
      currentFilter = tag;
      renderTags();
      rebuildVisibleList();
    }

    async function load() {
      if (isLoading) return;
      isLoading = true;

      try {
        const res = await api('/api/messages');
        if (!res.ok) return;

        const newData = await res.json();
        const incomingIds = new Set(newData.map(m => m.id));
        const oldMap = new Map(rawData.map(m => [m.id, m]));
        const newMap = new Map(newData.map(m => [m.id, m]));

        let shouldPlay = false;
        let tagsMayChanged = false;
        let needRebuildForFilter = false;

        if (isFirstLoad) {
          rawData = newData;
          knownMsgIds = incomingIds;
          isFirstLoad = false;
          renderTags();
          rebuildVisibleList();
          isLoading = false;
          return;
        }

        for (const oldMsg of rawData) {
          if (!newMap.has(oldMsg.id)) {
            tagsMayChanged = true;
            if (!currentFilter || oldMsg.tag === currentFilter) {
              removeMessageCard(oldMsg.id);
            }
            manualRevealedIds.delete(oldMsg.id);
            clearAutoReveal(oldMsg.id);
            mySentIds.delete(oldMsg.id);
          }
        }

        for (const m of newData) {
          const old = oldMap.get(m.id);
          const isNew = !old;

          if (isNew) {
            tagsMayChanged = true;
            const isMine = mySentIds.has(m.id);

            autoRevealMessage(m.id);

            if (!isMine) {
              shouldPlay = true;
            }

            const shouldShowInCurrentView = !currentFilter || m.tag === currentFilter;
            if (shouldShowInCurrentView) {
              insertMessageCard(m, true);
            }
          } else {
            const changed =
              old.nick !== m.nick ||
              old.text !== m.text ||
              (old.tag || '') !== (m.tag || '') ||
              (old.timestamp || 0) !== (m.timestamp || 0);

            if (changed) {
              tagsMayChanged = true;

              const oldVisible = !currentFilter || old.tag === currentFilter;
              const newVisible = !currentFilter || m.tag === currentFilter;

              if (oldVisible && newVisible) {
                updateMessageCard(m.id, m);
                if ((old.timestamp || 0) !== (m.timestamp || 0)) {
                  needRebuildForFilter = true;
                }
              } else if (oldVisible && !newVisible) {
                removeMessageCard(m.id);
              } else if (!oldVisible && newVisible) {
                insertMessageCard(m, false);
              }
            }
          }
        }

        for (const id of [...manualRevealedIds]) {
          if (!incomingIds.has(id)) manualRevealedIds.delete(id);
        }
        for (const id of [...autoRevealedIds]) {
          if (!incomingIds.has(id)) clearAutoReveal(id);
        }
        for (const id of [...autoHideTimers.keys()]) {
          if (!incomingIds.has(id)) clearAutoReveal(id);
        }
        for (const id of [...mySentIds]) {
          if (incomingIds.has(id)) mySentIds.delete(id);
        }

        rawData = newData;
        knownMsgIds = incomingIds;

        if (needRebuildForFilter) {
          rebuildVisibleList();
        }

        if (tagsMayChanged) {
          renderTags();
          if (currentFilter && !getFilteredData().length) {
            rebuildVisibleList();
          }
        }

        if (shouldPlay && notifyToggle.checked) {
          playMagicSound();
        }
      } catch (e) {
        console.error('load failed:', e);
      } finally {
        isLoading = false;
      }
    }

    function toggleEye(id) {
      if (manualRevealedIds.has(id)) {
        manualRevealedIds.delete(id);
      } else {
        manualRevealedIds.add(id);
        clearAutoReveal(id);
      }
      updateMessageRevealState(id);
    }

    async function updateTag(id, old) {
      const n = prompt("修改标签（留空可清除标签）：", old || "");
      if (n === null) return;

      await api('/api/update-tag', {
        method: 'POST',
        body: JSON.stringify({ id, tag: n.trim() })
      });

      await load();
    }

    async function deleteMsg(id, ev) {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.currentTarget) {
          ev.currentTarget.blur();
          setTimeout(() => ev.currentTarget && ev.currentTarget.blur(), 0);
        }
      }

      const confirmed = await openConfirmModal({
        title: '删除这条消息？',
        desc: '删除后不可恢复。',
        okText: '删除',
        okClass: 'bg-red-500 hover:bg-red-600'
      });

      if (!confirmed) return;

      const msg = getMessageById(id);
      if (!msg) return;

      pendingDeleteSnapshots.set(id, msg);

      removeMessageFromLocalState(id);
      removeMessageCard(id);
      renderTags();

      if (!getFilteredData().length) {
        rebuildVisibleList();
      }

      try {
        const res = await api('/api/delete', {
          method: 'POST',
          body: JSON.stringify({ id })
        });

        if (!res.ok) throw new Error('delete failed');
        pendingDeleteSnapshots.delete(id);
      } catch (e) {
        console.error('delete failed:', e);
        const snapshot = pendingDeleteSnapshots.get(id);
        pendingDeleteSnapshots.delete(id);

        if (snapshot) {
          insertMessageToLocalState(snapshot);
          renderTags();

          const shouldShowInCurrentView = !currentFilter || snapshot.tag === currentFilter;
          if (shouldShowInCurrentView) {
            insertMessageCard(snapshot, false);
            updateMessageCard(snapshot.id, snapshot);
          } else if (!getFilteredData().length) {
            rebuildVisibleList();
          }
        }
      }
    }

    async function clearAllMessages(ev) {
      if (ev?.currentTarget) {
        ev.currentTarget.blur();
        setTimeout(() => ev.currentTarget && ev.currentTarget.blur(), 0);
      }

      const confirmed = await openConfirmModal({
        title: '清空全部消息？',
        desc: '此操作不可恢复，请谨慎操作。',
        okText: '清空',
        okClass: 'bg-red-500 hover:bg-red-600'
      });

      if (!confirmed) return;

      try {
        const res = await api('/api/clear', {
          method: 'POST',
          body: JSON.stringify({})
        });

        if (!res.ok) throw new Error('clear failed');

        currentFilter = null;
        manualRevealedIds.clear();
        autoRevealedIds.clear();

        for (const timer of autoHideTimers.values()) clearTimeout(timer);
        autoHideTimers.clear();

        mySentIds.clear();
        knownMsgIds.clear();
        rawData = [];
        messageDomMap.clear();
        pendingDeleteSnapshots.clear();
        chatList.innerHTML = '';

        renderTags();
        rebuildVisibleList();
      } catch (e) {
        console.error('clear failed:', e);
      }
    }

    async function send() {
      if (isSending) return;

      const now = Date.now();
      if (now - lastSendAt < 600) return;

      const rawVal = msgInput.value.trim();
      if (!rawVal) return;

      isSending = true;
      lastSendAt = now;

      await unlockAudio();

      const parsed = parseInlineTag(rawVal);
      const finalText = parsed.text.trim();
      const finalTag = (parsed.tag || "").trim().slice(0, 20);

      if (!finalText) {
        isSending = false;
        return;
      }

      sendBtn.disabled = true;
      sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i>';

      try {
        const res = await api('/api/send', {
          method: 'POST',
          body: JSON.stringify({
            nick: nickInput.value,
            text: finalText,
            tag: finalTag
          })
        });

        if (!res.ok) return;

        currentTag = finalTag;
        renderSendTagButton();

        const result = await res.json();
        if (result?.id) {
          mySentIds.add(result.id);
          autoRevealMessage(result.id);
        }

        msgInput.value = '';
        autoResizeTextarea();
        await load();
      } catch (e) {
        console.error('send failed:', e);
      } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane text-xs"></i>';
        isSending = false;
      }
    }

    function autoResizeTextarea() {
      msgInput.style.height = 'auto';
      msgInput.style.height = Math.min(msgInput.scrollHeight, 128) + 'px';
    }

    msgInput.addEventListener('input', autoResizeTextarea);
    msgInput.addEventListener('focus', unlockAudio);
    msgInput.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    };

    renderTags();
    rebuildVisibleList();
    renderSendTagButton();
    load();
    setInterval(load, 4000);
  </script>
</body>
</html>
      `,
      {
        headers: { "content-type": "text/html;charset=UTF-8" },
      }
    );
  },
};