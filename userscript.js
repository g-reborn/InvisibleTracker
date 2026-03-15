// ==UserScript==
// @name         Discord Invisible Radar
// @version      14.4
// @description  This script allows you to detect friends who are browsing Discord in Invisible mode. Even if they appear "offline," this tool identifies their active session signals and reveals them to you.
// @author       Mr G & Gemini
// @match        https://discord.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const excludedIds = ["615470400889159691", "1178837358523719704"];

    const style = document.createElement('style');
    style.innerHTML = `
        #tracker-wrapper {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.7); z-index: 99999;
            display: none; justify-content: center; align-items: center;
            backdrop-filter: blur(4px); font-family: 'gg sans', sans-serif;
        }
        #inv-tracker-overlay {
            width: 450px; height: 500px; background: #313338;
            border-radius: 8px; display: flex; flex-direction: column;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5); overflow: hidden;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .tracker-header { padding: 16px; background: #2b2d31; display: flex; justify-content: space-between; align-items: center; color: #f2f3f5; font-weight: 600; }
        .section-header { color: #b5bac1; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; padding: 16px 16px 8px; }
        .tracker-list { flex: 1; overflow-y: auto; padding: 0 16px 16px; }
        .user-card { background: #2b2d31; padding: 10px; margin-top: 8px; border-radius: 4px; display: flex; align-items: center; gap: 12px; }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; }
        .user-name { color: #f2f3f5; font-size: 14px; font-weight: 600; }
        .no-results { color: #949ba4; text-align: center; margin-top: 40px; font-size: 14px; }
        .inv-scan-btn {
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #b5bac1;
            transition: 0.2s;
            width: 24px;
            height: 24px;
            margin: 0 8px;
        }
        .inv-scan-btn:hover {
            color: #dbdee1;
        }
    `;
    document.head.appendChild(style);

    const getDiscordToken = () => {
        let token = "";
        try {
            window.webpackChunkdiscord_app.push([[Symbol()],{},o=>{for(let e of Object.values(o.c))try{if(e.exports?.getToken)token=e.exports.getToken()}catch{}}]);
            window.webpackChunkdiscord_app.pop();
        } catch(e) {}
        return token;
    };

    const renderUser = (data) => {
        const list = document.getElementById('tracker-results');
        const card = document.createElement('div');
        card.className = 'user-card';
        const avatar = data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : "https://cdn.discordapp.com/embed/avatars/0.png";
        card.innerHTML = `<img src="${avatar}" class="user-avatar"><span class="user-name">${data.global_name || data.username}</span>`;
        list.appendChild(card);
    };

    const loadAutomated = async () => {
        const list = document.getElementById('tracker-results');
        list.innerHTML = '<div class="no-results">Fetching invisible friends...</div>';
        const token = getDiscordToken();
        const ws = new WebSocket("wss://gateway.discord.gg/?v=9&encoding=json");

        ws.onopen = () => ws.send(JSON.stringify({ op: 2, d: { token, intents: 513, properties: { $os: "pc", $browser: "chrome" } } }));

        ws.onmessage = async (msg) => {
            const p = JSON.parse(msg.data);
            if (p.t === 'READY') {
                const targets = (p.d.presences || []).filter(u =>
                    (u.status === 'offline' || !u.status) && !excludedIds.includes(u.user.id)
                );

                list.innerHTML = "";
                if (targets.length === 0) {
                    list.innerHTML = '<div class="no-results">No invisible friends detected.</div>';
                } else {
                    for (const u of targets.slice(0, 30)) {
                        const r = await fetch(`https://discord.com/api/v9/users/${u.user.id}`, { headers: { "Authorization": token } });
                        if (r.ok) renderUser(await r.json());
                    }
                }
                ws.close();
            }
        };
    };

    const toggleUI = () => {
        let wrapper = document.getElementById('tracker-wrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'tracker-wrapper';
            wrapper.onclick = (e) => { if (e.target.id === 'tracker-wrapper') wrapper.style.display = 'none'; };
            wrapper.innerHTML = `
                <div id="inv-tracker-overlay">
                    <div class="tracker-header">
                        <div style="color:#f2f3f5; font-weight:600">Invisible Radar</div>
                        <div style="cursor:pointer; color:#b5bac1; font-size:24px" id="tracker-close-x">×</div>
                    </div>
                    <div class="section-header">RESULT</div>
                    <div id="tracker-results" class="tracker-list"></div>
                </div>`;
            document.body.appendChild(wrapper);
            document.getElementById('tracker-close-x').onclick = () => wrapper.style.display = 'none';
        }
        wrapper.style.display = 'flex';
        loadAutomated();
    };

    const injectButton = () => {
        const targetContainer = document.querySelector('.inviteToolbar__133bf');
        if (targetContainer && !document.getElementById('inv-scan-trigger')) {
            const btn = document.createElement('div');
            btn.id = 'inv-scan-trigger';
            btn.className = 'inv-scan-btn clickable__9293f iconWrapper__9293f';
            btn.title = 'Scan Invisible Friends';
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
            btn.onclick = (e) => { e.stopPropagation(); toggleUI(); };

            targetContainer.prepend(btn);
        }
    };

    setInterval(injectButton, 1000);
})();
