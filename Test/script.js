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

function play_song() {
  const audio = new Audio('./beggining_in_the_end.mp3');
  audio.play();
}
