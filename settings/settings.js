// Saves options to chrome.storage
function save_options() {
  let option_activate = document.querySelector("[name=option_activate]").checked;
  let option_order = document.querySelector("[name=option_order]").checked;
  let option_rgaa_link = document.querySelector("[name=option_rgaa_link]").checked;
  chrome.storage.sync.set({
    option_activate: option_activate,
    option_order: option_order,
    option_rgaa_link: option_rgaa_link
  }, function() {
    // Update status to let user know options were saved.
    let message = document.querySelector('#message');
    let status = document.querySelector('#status');
    message.hidden = false;
    status.innerHTML = '<p>La mise à jour des options a été sauvegardée</p>';
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get(['option_activate','option_order','option_rgaa_link'], function(items) {
    document.querySelector("[name=option_activate]").checked = items.option_activate;
    document.querySelector("[name=option_order]").checked = items.option_order;
    document.querySelector("[name=option_rgaa_link]").checked = items.option_rgaa_link;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.querySelector('#save').addEventListener('click', save_options);
document.querySelector("#version").textContent = chrome.runtime.getManifest().version;

function close_status() {
  status.innerHTML = "";
};

function toggleDisclosure(btnID) {
  // Get the button that triggered this
  let theButton = document.querySelector('#'+btnID);
  let theIcon = theButton.querySelector('.chevron');
  // If the button is not expanded...
  if (theButton.getAttribute("aria-expanded") == "false") {
    // Now set the button to expanded
    theButton.setAttribute("aria-expanded", "true");
    theIcon.classList.remove("right");
    theIcon.classList.add("bottom");
  // Otherwise button is not expanded...
  } else {
    // Now set the button to collapsed
    theButton.setAttribute("aria-expanded", "false");
    theIcon.classList.add("right");
    theIcon.classList.remove("bottom");
  }
}

const btnsDisclosure = document.querySelectorAll(".disclosure");
btnsDisclosure.forEach(function(btnDisclosure, index, array) {
  btnDisclosure.addEventListener('click', event => {
    toggleDisclosure(btnDisclosure.id);
  });
});