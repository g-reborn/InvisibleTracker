// ==UserScript==
// @name         Discord Invisible Tracker
// @version      4.27
// @description  Advanced presence monitoring tool that detects friends hiding in "Invisible" mode using real-time gateway status updates.
// @author       Mr G
// @icon         https://cdn3.emoji.gg/emojis/6849-invisible.png
// @match        https://discord.com/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/g-reborn/InvisibleTracker/main/InvisibleTracker.user.js
// @updateURL    https://raw.githubusercontent.com/g-reborn/InvisibleTracker/main/InvisibleTracker.user.js
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
            backdrop-filter: blur(4px);
        }
        #inv-tracker-overlay {
            width: 700px; height: 500px; background: #313338;
            border-radius: 8px; display: flex; flex-direction: column;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5); overflow: hidden;
            border: 1px solid rgba(255,255,255,0.05);
        }
        #inv-tracker-tab {
            cursor: pointer; padding: 2px 8px; margin: 0 8px; border-radius: 4px;
            color: #b5bac1; font-size: 16px; font-weight: 500; display: flex; align-items: center;
        }
        #inv-tracker-tab:hover { background-color: rgba(78, 80, 88, 0.3); color: #dbdee1; }

        .tracker-header { padding: 16px; background: #2b2d31; display: flex; justify-content: space-between; align-items: center; }
        .section-container { padding: 16px 16px 0; }
        .section-header {
            color: #b5bac1;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            margin-bottom: 4px;
            font-family: sans-serif;
        }
        .section-header::before { content: attr(data-text); }

        .tracker-list { flex: 1; overflow-y: auto; padding: 0 16px 16px; }
        .user-card { background: #2b2d31; padding: 10px; margin-top: 8px; border-radius: 4px; display: flex; align-items: center; gap: 12px; }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; }
        .user-name { color: #f2f3f5; font-size: 14px; font-weight: 600; }
        .no-results { color: #949ba4; text-align: center; margin-top: 20px; font-size: 14px; }
    `;
    document.head.appendChild(style);

    const closeTracker = () => { document.getElementById('tracker-wrapper').style.display = 'none'; };

    const createOverlay = () => {
        if (document.getElementById('tracker-wrapper')) return;
        const wrapper = document.createElement('div');
        wrapper.id = 'tracker-wrapper';
        wrapper.onclick = (e) => { if (e.target.id === 'tracker-wrapper') closeTracker(); };
        wrapper.innerHTML = `
            <div id="inv-tracker-overlay">
                <div class="tracker-header">
                    <div style="color:#f2f3f5; font-weight:600">Invisible Tracker</div>
                    <div style="cursor:pointer; color:#b5bac1; font-size:24px" id="tracker-close-btn">×</div>
                </div>
                <div class="section-container">
                    <div class="section-header" data-text="FRIEND RESULT"></div>
                </div>
                <div id="tracker-results" class="tracker-list"></div>
            </div>
        `;
        document.body.appendChild(wrapper);
        document.getElementById('tracker-close-btn').onclick = closeTracker;
    };

    const getDiscordToken = () => {
        let token = "";
        try {
            window.webpackChunkdiscord_app.push([[Symbol()],{},o=>{for(let e of Object.values(o.c))try{if(e.exports?.getToken)token=e.exports.getToken()}catch{}}]);
            window.webpackChunkdiscord_app.pop();
        } catch(e) {}
        return token;
    };

    const renderUser = (data) => {
        if (excludedIds.includes(data.id)) return;
        const list = document.getElementById('tracker-results');
        const card = document.createElement('div');
        card.className = 'user-card';
        const avatar = data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : "https://cdn.discordapp.com/embed/avatars/0.png";
        card.innerHTML = `<img src="${avatar}" class="user-avatar"><span class="user-name">${data.global_name || data.username}</span>`;
        list.prepend(card);
    };

    const loadAutomated = async () => {
        const list = document.getElementById('tracker-results');
        list.innerHTML = '<div class="no-results">Fetching data...</div>';
        const token = getDiscordToken();
        const ws = new WebSocket("wss://gateway.discord.gg/?v=9&encoding=json");
        ws.onopen = () => ws.send(JSON.stringify({ op: 2, d: { token, intents: 513, properties: { $os: "pc", $browser: "chrome" } } }));
        ws.onmessage = async (msg) => {
            const p = JSON.parse(msg.data);
            if (p.t === 'READY') {
                const targets = (p.d.presences || []).filter(u => (u.status === 'offline' || !u.status) && !excludedIds.includes(u.user.id));
                list.innerHTML = "";
                if (targets.length === 0) {
                    list.innerHTML = '<div class="no-results">No invisible users detected in your direct reach.</div>';
                } else {
                    for (const u of targets.slice(0, 20)) {
                        const r = await fetch(`https://discord.com/api/v9/users/${u.user.id}`, { headers: { "Authorization": token } });
                        if (r.ok) renderUser(await r.json());
                    }
                }
                ws.close();
            }
        };
    };

    const injectTracker = () => {
        const tabBar = document.querySelector('[class*="tabBar"]');
        const separator = document.querySelector('[class*="separator"]');
        if (!tabBar || document.getElementById('inv-tracker-tab')) return;

        const invTab = document.createElement('div');
        invTab.id = 'inv-tracker-tab';
        invTab.innerText = 'Invisible';
        invTab.onclick = () => {
            createOverlay();
            document.getElementById('tracker-wrapper').style.display = 'flex';
            loadAutomated();
        };

        if (separator) separator.before(invTab);
        else tabBar.appendChild(invTab);
    };

    setInterval(injectTracker, 1000);
})();
