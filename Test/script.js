// Restored alert button behavior (original)
const learnBtn = document.getElementById("learnBtn");
if (learnBtn) {
  learnBtn.addEventListener("click", () => {
    alert("You’re officially learning web design, AdmiraLahav!");
  });
}

// XSS demo (unsafe) — educational only
const submitBtn = document.getElementById("submitBtn");
if (submitBtn) {
  submitBtn.addEventListener("click", () => {
    const input = document.getElementById("userInput").value;
    const output = document.getElementById("outputArea");

    // ❗ UNSAFE DEMONSTRATION — DO NOT USE IN REAL PROJECTS
    output.innerHTML = input;

    // Safe alternative:
    // output.textContent = input;
  });
}

const audio = new Audio("03 - Beginning In The End.mp3");

function play_song() {
    // Always reset before playing again
    audio.currentTime = 0;

    audio.play()
        .catch(err => console.error("Audio playback failed:", err));
}

