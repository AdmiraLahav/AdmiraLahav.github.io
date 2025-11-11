document.getElementById("submitBtn").addEventListener("click", () => {
  const input = document.getElementById("userInput").value;
  const output = document.getElementById("outputArea");

  // ❗ UNSAFE DEMONSTRATION — DO NOT USE IN REAL PROJECTS
  output.innerHTML = input; 

  // In a real site, this should be:
  // output.textContent = input; // to prevent XSS
});