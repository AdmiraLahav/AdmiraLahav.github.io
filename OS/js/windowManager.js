window.FakeOS = {
    windows: [],
    zIndex: 10,

    createWindow(title, contentElement) {
        const win = document.createElement("div");
        win.className = "os-window";
        win.style.left = "200px";
        win.style.top = "120px";
        win.style.zIndex = ++this.zIndex;

        win.innerHTML = `
            <div class="window-titlebar">
                <div class="window-title">${title}</div>
                <div class="window-buttons">
                    <div class="win-btn win-close"></div>
                    <div class="win-btn win-min"></div>
                    <div class="win-btn win-max"></div>
                </div>
            </div>
            <div class="window-content"></div>
        `;

        win.querySelector(".window-content").appendChild(contentElement);
        document.getElementById("desktop").appendChild(win);

        this.makeDraggable(win);

        win.querySelector(".win-close").onclick = () => win.remove();

        return win;
    },

    makeDraggable(win) {
        const bar = win.querySelector(".window-titlebar");
        let offsetX = 0, offsetY = 0, dragging = false;

        bar.onmousedown = (e) => {
            dragging = true;
            offsetX = e.clientX - win.offsetLeft;
            offsetY = e.clientY - win.offsetTop;
            win.style.zIndex = ++this.zIndex;
        };

        document.onmousemove = (e) => {
            if (!dragging) return;
            win.style.left = (e.clientX - offsetX) + "px";
            win.style.top = (e.clientY - offsetY) + "px";
        };

        document.onmouseup = () => dragging = false;
    }
};
