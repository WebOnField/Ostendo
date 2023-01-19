function display_options() {
  chrome.storage.sync.get({
    option_activate: true
  }, function(items) {
      if(items.option_activate){
        document.querySelector(".info").innerText = "Activé";
        document.querySelector(".info").classList.add("activate");
        document.querySelector(".info2").innerText = "activé";
      }else{
        document.querySelector(".info").innerText = "Désactivé";
        document.querySelector(".info").classList.add("disable");
        document.querySelector(".info2").innerText = "désactivé";
      }
  });
}
function goSettings() {
  chrome.runtime.openOptionsPage();
}

document.querySelector(".settings").addEventListener('click', event => {
  goSettings();
});
document.querySelector(".settings2").addEventListener('click', event => {
  goSettings();
});
document.addEventListener('DOMContentLoaded', display_options);