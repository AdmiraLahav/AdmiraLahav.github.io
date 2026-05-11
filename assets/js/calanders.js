const grid = document.getElementById("grid");

const now = new Date();
const year = now.getFullYear();
const start = new Date(year, 0, 1);
const today = new Date(year, now.getMonth(), now.getDate());
const dayOfYear = Math.floor((today - start) / 86400000) + 1;

const isLeap = new Date(year, 1, 29).getMonth() === 1;
const months = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

let dayCounter = 0;

months.forEach(daysInMonth => {
    const col = document.createElement("div");
    col.className = "month";

    for (let d = 0; d < daysInMonth; d++) {
        dayCounter++;
        const dot = document.createElement("div");
        dot.className = "dot" + (dayCounter <= dayOfYear ? " passed" : "");
        col.appendChild(dot);
    }

    grid.appendChild(col);
});

const totalDays = months.reduce((a,b)=>a+b,0);
const daysLeft = totalDays - dayOfYear;
const percent = ((dayOfYear / totalDays) * 100).toFixed(1);

document.getElementById("daysLeft").textContent = `${daysLeft}d left`;
document.getElementById("percent").textContent = `· ${percent}%`;