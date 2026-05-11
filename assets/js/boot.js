"use strict";

/*
  LAHAV SYSTEMS BOOT SEQUENCE
  Purpose:
  - Displays a staged terminal boot sequence.
  - Runs CRT flicker transition.
  - Automatically redirects to home.html.
*/

const bootOutput = document.getElementById("bootOutput");
const bootStatus = document.getElementById("bootStatus");
const bootScreen = document.getElementById("bootScreen");

const REDIRECT_TARGET = "home.html";

const bootLines = [
  { text: "> INITIALIZING SYSTEM...", delay: 450 },
  { text: "LOADING CORE MODULES.................[OK]", delay: 420 },
  { text: "INITIALIZING UI ENGINE...............[OK]", delay: 420 },
  { text: "CALIBRATING DISPLAY MATRIX...........[OK]", delay: 420 },
  { text: "VERIFYING SYSTEM STATUS..............[OK]", delay: 420 },
  { text: "LOADING ORBITAL DATABASE.............[OK]", delay: 420 },
  { text: "CONNECTING LOCAL INTERFACE...........[OK]", delay: 420 },
  { text: "AUTHORIZATION TOKEN..................[ACCEPTED]", delay: 460 },
  { text: "", delay: 240 },
  { text: "LAHAV SYSTEMS NODE", delay: 380 },
  { text: "STATUS: OPERATIONAL", delay: 380 },
  { text: "CLEARANCE LEVEL: AUTHORIZED", delay: 420 },
  { text: "", delay: 240 },
  { text: "TRANSFER TARGET: HOME DASHBOARD", delay: 380 },
  { text: "INITIATING CRT TRANSITION...", delay: 500 }
];

function sleep(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function formatLine(text) {
  return text
    .replaceAll("[OK]", '<span class="ok">[OK]</span>')
    .replaceAll("[ACCEPTED]", '<span class="warn">[ACCEPTED]</span>');
}

function createBootLine(text) {
  const line = document.createElement("div");
  line.className = "boot-line";
  line.innerHTML = formatLine(text);
  return line;
}

async function runBootSequence() {
  for (const line of bootLines) {
    const element = createBootLine(line.text);
    bootOutput.appendChild(element);

    if (line.text.includes("STATUS: OPERATIONAL")) {
      bootStatus.textContent = "BOOT STATUS: OPERATIONAL";
    }

    await sleep(line.delay);
  }

  bootStatus.textContent = "BOOT STATUS: TRANSFERRING";
  bootOutput.lastElementChild.classList.add("cursor");

  await sleep(650);

  bootScreen.classList.add("crt-flicker");

  await sleep(1100);

  window.location.href = REDIRECT_TARGET;
}

runBootSequence();