chrome.runtime.onInstalled.addListener(() => {
  // This event is fired when the extension is first installed or when it is updated to a new version.
  // We use it to set the default value for the "option_activate" option in the extension's storage.
  chrome.storage.sync.set({ option_activate: true });
});

chrome.runtime.onConnect.addListener(port => {
  // This event is fired when a connection is established between the extension and another part of the browser, such as a content script.
  // We use it to listen for messages from the content script and take appropriate actions.
  console.assert(port.name === "a11y");

  port.onMessage.addListener(msg => {
    if (msg.action === "urlToFetch") {
      // This message is sent when the content script wants the extension to fetch the HTML of a specific URL.
      fetchUrl(msg.href)
        .then(html => {
          // Once the HTML is fetched, we send a message back to the content script with the HTML and other information.
          port.postMessage({
            action: "domHtml",
            domHtml: html,
            href: msg.href,
            hrefID: msg.hrefID,
            searchEngine: msg.searchEngine,
          });
        })
        .catch(err => {
          console.log("Failed to fetch page: ", err);
        });
    }
  });
});


async function fetchUrl(url) {
  // This function fetches the HTML of a specific URL using the Fetch API.
  const response = await fetch(url);
  return response.text();
}

