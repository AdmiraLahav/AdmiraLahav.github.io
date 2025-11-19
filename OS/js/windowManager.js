// --- WINDOW MANAGER ---
window.FakeOS = {
    windows: [],
    zIndex: 10,

    createWindow(title, contentElement) {
        // Create window element
        const win = document.createElement("div");
        win.className = "os-window";
        win.style.left = "250px";
        win.style.top = "150px";
        win.style.zIndex = ++this.zIndex;

        // Window structure
        win.innerHTML = `
            <div class="window-titlebar">
                <span class="window-title">${title}</span>

                <div class="window-buttons">
                    <div class="win-btn win-close"></div>
                    <div class="win-btn win-min"></div>
                    <div class="win-btn win-max"></div>
                </div>
            </div>

            <div class="window-content"></div>
        `;

        // Append user content
        win.querySelector(".window-content").appendChild(contentElement);

        // Add to desktop
        document.getElementById("desktop").appendChild(win);

        // Enable dragging
        this.makeDraggable(win);

        // Close window
        win.querySelector(".win-close").onclick = () => win.remove();

        // Focus on click
        win.onmousedown = () => {
            win.style.zIndex = ++this.zIndex;
        };

        return win;
    },

    makeDraggable(win) {
        const bar = win.querySelector(".window-titlebar");

        let offsetX = 0;
        let offsetY = 0;
        let dragging = false;

        bar.addEventListener("mousedown", (e) => {
            dragging = true;
            win.style.zIndex = ++this.zIndex;

            offsetX = e.clientX - win.offsetLeft;
            offsetY = e.clientY - win.offsetTop;

            document.body.style.userSelect = "none";
        });

        document.addEventListener("mousemove", (e) => {
            if (!dragging) return;

            win.style.left = (e.clientX - offsetX) + "px";
            win.style.top = (e.clientY - offsetY) + "px";
        });

        document.addEventListener("mouseup", () => {
            dragging = false;
            document.body.style.userSelect = "auto";
        });
    }
};
