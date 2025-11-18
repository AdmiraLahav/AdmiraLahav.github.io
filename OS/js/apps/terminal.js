FakeOS.openTerminal = function() {
    const el = document.createElement("div");
    el.innerHTML = `
        <div style="font-family: monospace; color: var(--green);">
            FakeOS Terminal<br><br>
            > Ready.
        </div>
    `;
    FakeOS.createWindow("Terminal", el);
};
