"use strict";

const radios = document.querySelectorAll('input[name="sort"]');

chrome.storage.local.get({ sortOrder: "recent" }, (data) => {
  const el = document.querySelector('input[value="' + data.sortOrder + '"]');
  if (el) el.checked = true;
});

radios.forEach(r => r.addEventListener("change", () => {
  chrome.storage.local.set({ sortOrder: r.value }, () => {
    const el = document.getElementById("saved");
    el.style.opacity = "1";
    setTimeout(() => el.style.opacity = "0", 1500);
  });
}));
