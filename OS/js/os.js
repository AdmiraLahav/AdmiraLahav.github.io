// Clock updater
function updateClock() {
    const c = document.getElementById("clock");
    const now = new Date();
    c.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
setInterval(updateClock, 1000);
updateClock();

// OS boot placeholder
console.log("FakeOS initialized.");
