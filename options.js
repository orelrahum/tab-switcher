"use strict";

var radios = document.querySelectorAll('input[name="sort"]');
var options = document.querySelectorAll('.option');

function setActive(value) {
  options.forEach(function(o) {
    o.classList.toggle('active', o.dataset.value === value);
  });
}

chrome.storage.local.get({ sortOrder: "recent" }, function(data) {
  var el = document.querySelector('input[value="' + data.sortOrder + '"]');
  if (el) el.checked = true;
  setActive(data.sortOrder);
});

radios.forEach(function(r) {
  r.addEventListener("change", function() {
    chrome.storage.local.set({ sortOrder: r.value }, function() {
      setActive(r.value);
      var el = document.getElementById("saved");
      el.style.opacity = "1";
      setTimeout(function() { el.style.opacity = "0"; }, 1500);
    });
  });
});
