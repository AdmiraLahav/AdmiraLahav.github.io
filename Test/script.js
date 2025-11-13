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

// One persistent audio object
const audio = new Audio("03 - Beginning In The End.mp3");

function play_song() {
    // Stop current playback immediately
    audio.pause();
    audio.currentTime = 0;

    // Start from the beginning each time
    audio.play()
        .catch(err => console.error("Playback error:", err));
}

function stop_song() {
    audio.pause()
}

