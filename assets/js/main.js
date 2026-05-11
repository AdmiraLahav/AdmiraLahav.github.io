"use strict";

/*
  LAHAV SYSTEMS MAIN SCRIPT
  Purpose:
  - Controls mobile navigation.
  - Updates live local and UTC clocks.
*/

const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

const localTimeElement = document.getElementById("localTime");
const utcTimeElement = document.getElementById("utcTime");

function toggleNavigation() {
  navLinks.classList.toggle("open");
}

function padTime(value) {
  return String(value).padStart(2, "0");
}

function getLocalTimeString(date) {
  return [
    padTime(date.getHours()),
    padTime(date.getMinutes()),
    padTime(date.getSeconds())
  ].join(":");
}

function getUtcTimeString(date) {
  return [
    padTime(date.getUTCHours()),
    padTime(date.getUTCMinutes()),
    padTime(date.getUTCSeconds())
  ].join(":");
}

function updateClocks() {
  const now = new Date();

  localTimeElement.textContent = getLocalTimeString(now);
  utcTimeElement.textContent = getUtcTimeString(now);
}

if (navToggle && navLinks) {
  navToggle.addEventListener("click", toggleNavigation);

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
    });
  });
}

updateClocks();
window.setInterval(updateClocks, 1000);