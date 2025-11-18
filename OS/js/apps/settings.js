FakeOS.openSettings = function() {
    const page = document.createElement("div");
    page.innerHTML = `
        <h2>System Settings</h2>
        <p>Theme: Ubuntu Cyber</p>
        <p>Version: 0.1</p>
        <p>More settings will be added...</p>
    `;
    FakeOS.createWindow("Settings", page);
};
