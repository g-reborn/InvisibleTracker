// ==UserScript==
// @name         Discord Invisible Tracker
// @version      4.43
// @description  Deep Scan without deleting DM channels.
// @author       Mr G
// @icon         https://cdn3.emoji.gg/emojis/6849-invisible.png
// @match        https://discord.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const style = document.createElement('style');
    style.innerHTML = `
        #tracker-wrapper {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.7); z-index: 99999;
            display: none; justify-content: center; align-items: center;
            backdrop-filter: blur(4px);
        }
        #inv-tracker-overlay {
            width: 700px; height: 550px; background: #313338;
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
        .tracker-controls { padding: 16px; display: flex; gap: 8px; }
        .tracker-input { flex: 1; background: #1e1f22; border: none; color: #f2f3f5; padding: 8px 12px; border-radius: 4px; outline: none; }
        .tracker-btn { background: #5865f2; color: #fff; border: none; padding: 8px 16px; border-radius: 3px; cursor: pointer; }
        .section-container { padding: 0 16px; margin-bottom: 10px; }
        #search-result-container { display: none; }
        .section-header { color: #b5bac1; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 4px; font-family: sans-serif; }
        .section-header::before { content: attr(data-text); }
        .tracker-list { flex: 1; overflow-y: auto; padding: 0 16px 16px; }
        .user-card { background: #2b2d31; padding: 10px; margin-top: 8px; border-radius: 4px; display: flex; align-items: center; gap: 12px; }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; }
        .user-name { color: #f2f3f5; font-size: 14px; font-weight: 600; }
        .status-tag { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; margin-left: auto; text-transform: uppercase; }
        .status-online { color: #23a55a; background: rgba(35, 165, 90, 0.1); }
        .status-dnd { color: #f23f43; background: rgba(242, 63, 67, 0.1); }
        .status-idle { color: #f0b232; background: rgba(240, 178, 50, 0.1); }
        .status-streaming { color: #593695; background: rgba(89, 54, 149, 0.1); }
        .status-invisible { color: #949ba4; background: rgba(148, 155, 164, 0.1); }
        .no-results { color: #949ba4; text-align: center; margin-top: 20px; font-size: 14px; }
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

    const createOverlay = () => {
        if (document.getElementById('tracker-wrapper')) return;
        const wrapper = document.createElement('div');
        wrapper.id = 'tracker-wrapper';
        wrapper.onclick = (e) => { if (e.target.id === 'tracker-wrapper') document.getElementById('tracker-wrapper').style.display = 'none'; };
        wrapper.innerHTML = `
            <div id="inv-tracker-overlay">
                <div class="tracker-header">
                    <div style="color:#f2f3f5; font-weight:600">Invisible Tracker</div>
                    <div style="cursor:pointer; color:#b5bac1; font-size:24px" id="close-x">×</div>
                </div>
                <div class="tracker-controls">
                    <input type="text" id="manual-id" class="tracker-input" placeholder="Enter User ID...">
                    <button id="scan-id-btn" class="tracker-btn">Search ID</button>
                </div>
                <div id="search-result-container" class="section-container">
                    <div class="section-header" data-text="SEARCH RESULT"></div>
                    <div id="manual-result-slot"></div>
                </div>
                <div class="section-container" style="margin-bottom: 0;">
                    <div class="section-header" data-text="FRIEND RESULT"></div>
                </div>
                <div id="tracker-results" class="tracker-list"></div>
            </div>
        `;
        document.body.appendChild(wrapper);
        document.getElementById('close-x').onclick = () => document.getElementById('tracker-wrapper').style.display = 'none';

        document.getElementById('scan-id-btn').onclick = async () => {
            const id = document.getElementById('manual-id').value.trim();
            const token = getDiscordToken();
            const slot = document.getElementById('manual-result-slot');
            const container = document.getElementById('search-result-container');

            if (!id || !token) return;

            container.style.display = 'block';
            slot.innerHTML = '<div class="no-results">Searching...</div>';

            const ws = new WebSocket("wss://gateway.discord.gg/?v=9&encoding=json");
            let found = false;

            const timeout = setTimeout(() => {
                if (!found) {
                    slot.innerHTML = '<div class="no-results">This user is truly offline</div>';
                    ws.close();
                }
            }, 10000); 

            ws.onopen = () => {
                ws.send(JSON.stringify({
                    op: 2,
                    d: {
                        token,
                        capabilities: 16381,
                        properties: { $os: "pc", $browser: "chrome" },
                        presence: { status: "online", since: 0, activities: [], afk: false }
                    }
                }));
            };
            
            ws.onmessage = async (msg) => {
                const p = JSON.parse(msg.data);
                
                if (p.t === 'READY') {
                    // Sadece DM kanalını açma/tetikleme (Kapatma/Silme kaldırıldı)
                    fetch(`https://discord.com/api/v9/users/@me/channels`, {
                        method: "POST",
                        headers: { "Authorization": token, "Content-Type": "application/json" },
                        body: JSON.stringify({ recipients: [id] })
                    }).then(res => res.json()).then(chan => {
                        if(chan.id) ws.send(JSON.stringify({ op: 13, d: { channel_id: chan.id } }));
                    }).catch(() => {});

                    for (const g of p.d.guilds) {
                        ws.send(JSON.stringify({ op: 8, d: { guild_id: g.id, user_ids: [id], presences: true } }));
                    }
                }

                const presences = (p.d?.presences) || (p.t === 'PRESENCE_UPDATE' ? [p.d] : []) || (p.t === 'GUILD_MEMBERS_CHUNK' ? p.d.presences : []);
                const target = presences.find(u => (u.user?.id === id || u.user_id === id));

                if (target) {
                    found = true;
                    clearTimeout(timeout);
                    
                    let statusLabel = target.status;
                    if (target.activities && target.activities.some(a => a.type === 1)) statusLabel = "STREAMING";
                    
                    if (statusLabel === "offline" || !statusLabel) statusLabel = "INVISIBLE";
                    else statusLabel = statusLabel.toUpperCase();

                    const r = await fetch(`https://discord.com/api/v9/users/${id}`, { headers: { "Authorization": token } });
                    if (r.ok) {
                        const data = await r.json();
                        const avatar = data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : "https://cdn.discordapp.com/embed/avatars/0.png";
                        slot.innerHTML = `
                            <div class="user-card">
                                <img src="${avatar}" class="user-avatar">
                                <span class="user-name">${data.global_name || data.username}</span>
                                <span class="status-tag status-${statusLabel.toLowerCase()}">${statusLabel}</span>
                            </div>`;
                    }
                    ws.close();
                }
            };
        };
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
                const targets = (p.d.presences || []).filter(u => u.status === 'offline' || !u.status);
                list.innerHTML = "";
                if (targets.length === 0) {
                    list.innerHTML = '<div class="no-results">No invisible users found</div>';
                } else {
                    for (const u of targets.slice(0, 20)) {
                        const r = await fetch(`https://discord.com/api/v9/users/${u.user.id}`, { headers: { "Authorization": token } });
                        if (r.ok) {
                            const data = await r.json();
                            const card = document.createElement('div');
                            card.className = 'user-card';
                            const avatar = data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : "https://cdn.discordapp.com/embed/avatars/0.png";
                            card.innerHTML = `<img src="${avatar}" class="user-avatar"><span class="user-name">${data.global_name || data.username}</span>`;
                            list.appendChild(card);
                        }
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
        invTab.onclick = () => { createOverlay(); document.getElementById('tracker-wrapper').style.display = 'flex'; loadAutomated(); };
        if (separator) separator.before(invTab);
        else tabBar.appendChild(invTab);
    };

    setInterval(injectTracker, 1000);
})();
