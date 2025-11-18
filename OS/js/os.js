// Clock
function updateClock() {
    const c = document.getElementById("clock");
    const now = new Date();
    c.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
setInterval(updateClock, 1000); updateClock();

// Add icons to dock
const dock = document.getElementById("dock");

function addDockIcon(icon, action) {
    const d = document.createElement("div");
    d.className = "dock-icon";
    d.style.backgroundImage = `url(assets/icons/${icon})`;
    d.style.backgroundSize = "cover";
    d.onclick = action;
    dock.appendChild(d);
}

addDockIcon("terminal.svg", FakeOS.openTerminal);
addDockIcon("settings.svg", FakeOS.openSettings);
addDockIcon("folder.svg", FakeOS.openExplorer);

// System Tray icon placeholders
document.querySelector(".right-section").innerHTML = `
    <img class="sys-icon" src="assets/icons/network.svg">
    <img class="sys-icon" src="assets/icons/sound.svg">
    <span id="clock"></span>
`;
