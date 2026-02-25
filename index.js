export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const cf = request.cf || {};
    const location = `${cf.country || "Unknown"}-${cf.city || "Unknown"}`;
    const ip = request.headers.get("cf-connecting-ip") || "Unknown";
    const ROOM_PWD = env.CHAT_PASSWORD || "123456";

    const isAuth = (req) => req.headers.get("Authorization") === ROOM_PWD;

    // --- 后端 API 部分 ---
    if (pathname === "/api/messages") {
      if (!isAuth(request)) return new Response("Unauthorized", { status: 401 });
      const data = await env.CHAT_KV.get("msgs");
      return new Response(data || "[]", { headers: { "content-type": "application/json" } });
    }

    if (pathname === "/api/send" && request.method === "POST") {
      if (!isAuth(request)) return new Response("Unauthorized", { status: 401 });
      const body = await request.json();
      if (!body.text?.trim()) return new Response("Empty", { status: 400 });
      const raw = await env.CHAT_KV.get("msgs") || "[]";
      let history = JSON.parse(raw);
      history.push({
        id: "m-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
        nick: body.nick || "小巫师",
        text: body.text.substring(0, 1000),
        ip: ip, loc: location,
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })
      });
      await env.CHAT_KV.put("msgs", JSON.stringify(history.slice(-50)));
      return new Response("ok");
    }

    if (pathname === "/api/delete" && request.method === "POST") {
      if (!isAuth(request)) return new Response("Unauthorized", { status: 401 });
      const { id } = await request.json();
      const raw = await env.CHAT_KV.get("msgs") || "[]";
      let history = JSON.parse(raw);
      await env.CHAT_KV.put("msgs", JSON.stringify(history.filter(m => m.id !== id)));
      return new Response("ok");
    }

    if (pathname === "/api/clear") {
      if (!isAuth(request)) return new Response("Unauthorized", { status: 401 });
      await env.CHAT_KV.put("msgs", "[]");
      return new Response("ok");
    }

    // --- 前端 UI 部分 ---
    return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>魔法小屋 🪄</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
    <style>
        body { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; background: #f6f8fa; color: #1f2328; font-family: -apple-system,system-ui,sans-serif; }
        #chat-scroll { flex: 1; overflow-y: auto; padding: 1rem; -webkit-overflow-scrolling: touch; scroll-behavior: smooth; }
        .gh-card { border: 1px solid #d0d7de; border-radius: 6px; background: #fff; margin-bottom: 0.8rem; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .gh-header { background: #f6f8fa; border-bottom: 1px solid #d0d7de; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; }
        .bottom-bar { background: #fff; border-top: 1px solid #d0d7de; padding: 12px; z-index: 50; }
        @supports (padding-bottom: env(safe-area-inset-bottom)) { .bottom-bar { padding-bottom: calc(env(safe-area-inset-bottom) + 12px); } }
        input, button { -webkit-tap-highlight-color: transparent; outline: none; }
        .capsule-control { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 999px; padding: 2px 10px; display: flex; align-items: center; gap: 8px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.03); }
    </style>
</head>
<body>
    <header class="bg-[#24292f] text-white px-4 py-3 flex justify-between items-center shrink-0 shadow-sm z-10">
        <div class="flex items-center gap-2">
            <i class="fa-solid fa-wand-magic-sparkles text-yellow-400"></i>
            <span class="font-bold text-sm tracking-tight">魔法小屋</span>
        </div>
        <button onclick="clearChat()" class="text-[11px] border border-white/20 px-2 py-1 rounded-md active:bg-white/10">打扫小屋</button>
    </header>

    <div id="chat-scroll" class="max-w-4xl mx-auto w-full"></div>

    <div class="bottom-bar shrink-0">
        <div class="max-w-4xl mx-auto">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md px-2 py-1 shadow-sm">
                    <i class="fa-solid fa-hat-wizard text-[10px] text-purple-400"></i>
                    <input id="nick" type="text" value="小巫师_${Math.floor(Math.random()*900+100)}" class="bg-transparent font-bold text-xs text-[#0969da] w-24 outline-none">
                </div>
                
                <div class="capsule-control">
                    <button onclick="playMagicSound()" title="激活音频权限" class="text-gray-400 hover:text-yellow-500 transition-colors">
                        <i class="fa-solid fa-volume-high text-[10px]"></i>
                    </button>
                    <div class="h-3 w-[1px] bg-gray-300"></div>
                    <label class="flex items-center cursor-pointer gap-1">
                        <input type="checkbox" id="notify-toggle" checked class="w-3 h-3 accent-green-600">
                        <span class="text-[10px] text-gray-500 font-bold select-none">提醒</span>
                    </label>
                    <button onclick="showHelp()" class="text-gray-300 hover:text-blue-500">
                        <i class="fa-solid fa-circle-question text-[10px]"></i>
                    </button>
                </div>
            </div>
            
            <div class="flex gap-2">
                <input id="msg" type="text" placeholder="输入新咒语..." autocomplete="off" class="flex-1 bg-[#f6f8fa] border border-[#d0d7de] rounded-md px-3 py-2.5 text-sm focus:bg-white focus:border-[#0969da] transition-all outline-none">
                <button onclick="send()" id="sendBtn" class="bg-[#2da44e] text-white px-5 py-2.5 rounded-md text-sm font-semibold active:scale-95 transition-transform">发射</button>
            </div>
        </div>
    </div>

    <script>
        let password = localStorage.getItem('chat_token');
        let lastMsgId = null;
        let isFocused = true;
        // 使用选定的音效 A
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3');

        window.onfocus = () => { isFocused = true; document.title = "魔法小屋 🪄"; };
        window.onblur = () => { isFocused = false; };

        function playMagicSound() {
            audio.currentTime = 0;
            audio.play().catch(e => console.log("请先交互以激活音频"));
        }

        function showHelp() {
            alert("🧙‍♂️ 魔法小屋使用指南：\\n\\n1. 激活：首次进入请点一次【喇叭】，浏览器才允许自动播报声音。\\n2. 提醒：开启状态下，当你不在当前页面时，新消息会触发魔法铃声。\\n3. 延迟：目前每2秒同步一次魔法能量，发送消息会即刻刷新。");
        }

        async function api(url, options = {}) {
            options.headers = { ...options.headers, 'Authorization': password, 'Content-Type': 'application/json' };
            const res = await fetch(url, options);
            if (res.status === 401) {
                const input = prompt("🔐 请输入通关暗号：");
                if (input) { password = input; localStorage.setItem('chat_token', input); location.reload(); }
            }
            return res;
        }

        async function load() {
            try {
                const res = await api('/api/messages');
                const data = await res.json();
                const box = document.getElementById('chat-scroll');
                const isAtBottom = box.scrollHeight - box.scrollTop <= box.clientHeight + 150;

                if (data.length > 0) {
                    const latest = data[data.length - 1];
                    if (lastMsgId && latest.id !== lastMsgId) {
                        if (!isFocused && document.getElementById('notify-toggle').checked) {
                            document.title = "🌟【新咒语】魔法小屋";
                            playMagicSound();
                        }
                    }
                    lastMsgId = latest.id;
                }

                box.innerHTML = data.map(m => \`
                    <div class="gh-card">
                        <div class="gh-header">
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-[#1f2328] text-xs">\${m.nick}</span>
                                <span class="text-[#636c76] text-[10px]">\${m.time}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="fa-regular fa-copy text-gray-400 cursor-pointer hover:text-blue-500 p-1" onclick="copyText(this, \\\`\${m.text}\\\`)"></i>
                                <i class="fa-solid fa-trash-can text-gray-400 cursor-pointer hover:text-red-500 p-1" onclick="deleteMsg('\${m.id}')"></i>
                            </div>
                        </div>
                        <div class="p-3 text-sm leading-6 text-[#1f2328] break-words whitespace-pre-wrap">\${m.text}</div>
                    </div>
                \`).join('');

                if (isAtBottom) box.scrollTop = box.scrollHeight;
            } catch (e) {}
        }

        async function deleteMsg(id) {
            if (!confirm("确定要抹除这条咒语吗？")) return;
            const res = await api('/api/delete', { method: 'POST', body: JSON.stringify({ id }) });
            if (res.ok) load();
        }

        async function clearChat() {
            if (!confirm("确定要打扫整个小屋吗？所有咒语都将消失。")) return;
            const res = await api('/api/clear');
            if (res.ok) load();
        }

        async function copyText(el, text) {
            await navigator.clipboard.writeText(text);
            el.className = 'fa-solid fa-check text-green-500';
            setTimeout(() => { el.className = 'fa-regular fa-copy text-gray-400'; }, 2000);
        }

        async function send() {
            const input = document.getElementById('msg');
            const val = input.value.trim();
            if (!val) return;
            const btn = document.getElementById('sendBtn');
            btn.disabled = true;
            const res = await api('/api/send', { method: 'POST', body: JSON.stringify({ nick: document.getElementById('nick').value, text: val }) });
            if (res.ok) { 
                input.value = ''; 
                load(); // 发送成功后立即加载，提升体感速度
            }
            btn.disabled = false;
        }

        document.getElementById('msg').onkeydown = (e) => { if (e.key === 'Enter') send(); };

        load();
        setInterval(load, 2000); // 设定为 2 秒轮询
    </script>
</body>
</html>
    `, { headers: { "content-type": "text/html;charset=UTF-8" } });
  }
};
