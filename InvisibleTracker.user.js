// ==UserScript==
// @name         Discord Invisible Tracker
// @version      14.9
// @description  Advanced presence monitoring tool that detects users hiding in "Invisible" mode. Adds a new tab to your Friends menu.
// @author       Mr G & Gemini
// @match        https://discord.com/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/g-reborn/InvisibleTracker/main/InvisibleTracker.user.js
// @downloadURL  https://raw.githubusercontent.com/g-reborn/InvisibleTracker/main/InvisibleTracker.user.js
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
            width: 500px; height: 550px; background: #313338;
            border-radius: 8px; display: flex; flex-direction: column;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5); overflow: hidden;
            border: 1px solid rgba(255,255,255,0.05);
        }
        #inv-tracker-tab {
            cursor: pointer;
            padding: 2px 8px;
            margin: 0 8px;
            border-radius: 4px;
            color: var(--interactive-normal);
            font-size: 16px;
            font-weight: 500;
            display: flex;
            align-items: center;
            transition: background-color 0.1s ease, color 0.1s ease, opacity 0.1s ease;
        }
        #inv-tracker-tab:hover {
            background-color: var(--background-modifier-hover);
            color: var(--interactive-hover);
            opacity: 0.8;
        }

        .tracker-header { padding: 16px; background: #2b2d31; display: flex; justify-content: space-between; align-items: center; color: #f2f3f5; font-weight: 600; }
        .section-header { color: #b5bac1; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; padding: 16px 16px 8px; }
        .tracker-list { flex: 1; overflow-y: auto; padding: 0 16px 16px; }
        .user-card { background: #2b2d31; padding: 10px; margin-top: 8px; border-radius: 4px; display: flex; align-items: center; gap: 12px; }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; }
        .user-name { color: #f2f3f5; font-size: 14px; font-weight: 600; }
        .no-results { color: #949ba4; text-align: center; margin-top: 40px; font-size: 14px; }
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
        list.innerHTML = '<div class="no-results">Fetching invisible users...</div>';
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
                    list.innerHTML = '<div class="no-results">No invisible users detected.</div>';
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
                        <div style="color:#f2f3f5; font-weight:600">Invisible Tracker</div>
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

    const injectTracker = () => {
        const tabBar = document.querySelector('[class*="tabBar"]');
        if (tabBar && !document.getElementById('inv-tracker-tab')) {
            const invTab = document.createElement('div');
            invTab.id = 'inv-tracker-tab';
            invTab.innerText = 'Invisible';
            invTab.onclick = () => toggleUI();

            const separator = tabBar.querySelector('[class*="separator"]');
            if (separator) {
                separator.before(invTab);
            } else {
                tabBar.appendChild(invTab);
            }
        }
    };

    setInterval(injectTracker, 1000);
})();
