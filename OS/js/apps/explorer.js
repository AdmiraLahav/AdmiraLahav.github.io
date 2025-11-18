FakeOS.openExplorer = async function() {
    const explorer = document.createElement("div");
    explorer.innerHTML = `<h2>File Explorer</h2><p>Loading fake FS...</p>`;

    const win = FakeOS.createWindow("Files", explorer);

    const fs = await fetch("data/filesystem.json").then(r => r.json());

    explorer.innerHTML = `<h2>File Explorer</h2>`;
    fs.files.forEach(file => {
        const div = document.createElement("div");
        div.textContent = "📄 " + file.name;
        div.style.cursor = "pointer";
        explorer.appendChild(div);
    });
};
