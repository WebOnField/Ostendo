chrome.storage.sync.get('option_activate', function(response) {
  const option_activate = response.option_activate;
  // Check if the option to activate the extension is turned on
  if(option_activate){
    // Connect to the background script (service-worker)
    let port = chrome.runtime.connect({name: "a11y"});
    // Get all the links of the search results
    const resultsLinks = document.querySelectorAll("div[data-hveid] .yuRUbf > a");
    // Iterate over each link
    resultsLinks.forEach(function(resultLink, index, array) {
      // Get the href attribute of the link
      const href = resultLink.getAttribute("href");
      // Get the id of the search result
      const hrefID = resultLink.closest('div[data-hveid]').getAttribute("data-hveid");
      // Send a message to the background script with the url to fetch and the id of the search result
      // it's to recover the html dom without having CORS problems
      // IMPORTANT :
      // Find a way to get HTML DOM from websites with JS framework that only render DOM in javascript
      port.postMessage({action: "urlToFetch", href: href, hrefID: hrefID});
    });

    port.onMessage.addListener(function(msg) {
      if (msg.action === "domHtml"){
        // A message is received from the background script with the HTML of the page as a text/plain
        const parser = new DOMParser();
        // Parse the text/plain of the html fetched to get the HTML document
        let doc = parser.parseFromString(msg.domHtml, "text/html");
        // Retrieve all the links in the HTML document
        const docLinks = doc.querySelectorAll("a, [role=link]");
        // Convert the NodeList to an array
        const docLinksArr = Array.from(docLinks);
        let mustBeAccessible = false;
        let hasALinkAboutA11y = false;

        // Check if this URL need to have accessibility declaration
        let hrefURL = new URL(msg.href);
        var request = new XMLHttpRequest();
        request.open("GET", chrome.runtime.getURL('/json/list.json'), false);
        request.send(null);
        var jsonUrlLists = JSON.parse(request.responseText);
        jsonUrlLists.forEach(function(url) {
          if(url == hrefURL.host){
            mustBeAccessible = true;
          } 
        });
        // All url ending with gouv.fr need to have accessibility declaration
        if(hrefURL.host.endsWith('gouv.fr')){
          mustBeAccessible = true;
        }
        docLinksArr.every(function(docLink, idx, array) {
          // get the text inside each link and convert it to lowercase
          let textLinkLowerCase = docLink.innerText.toLowerCase();
          // check if the text includes the word "accessibilité" or "accessibilite"
          if(textLinkLowerCase.includes("accessibilité") || textLinkLowerCase.includes("accessibilite")){
            hasALinkAboutA11y = true;
            // get the href attribute of each link
            let declaHref = docLink.getAttribute("href");

            // check if the href is not a valid http url, if not, add it to the origin of the page
            if(!isValidHttpUrl(declaHref)){
              if(declaHref.startsWith('/')){
                declaHref = hrefURL.origin+declaHref;
              }else{
                declaHref = hrefURL.origin+"/"+declaHref;
              }
            }
            declaHref = new URL(declaHref);
            // check if the text includes the words "conforme" or "conformité"
            if( textLinkLowerCase.includes("conforme") || textLinkLowerCase.includes("conformité")){
              // Call the function dealwithA11yInfo and pass the text, the hrefID, and the declaration href
              dealwithA11yInfo(textLinkLowerCase, msg.hrefID, declaHref);
              // Stop the "every" loop
              return false;
            }
          }else if(mustBeAccessible && idx === array.length - 1 && !hasALinkAboutA11y){
            // If the website must be accessible but no accessibility link was found, call the function dealwithA11yInfo with "must_be" as the text and pass the hrefID and null as the declaration href
            dealwithA11yInfo("must_be", msg.hrefID, null);
            // Stop the "every" loop
            return false;
          }
          return true;
        });
      }
    });
  }
});

function isValidHttpUrl(string) {
  // Create a new URL object
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  // Check if the url protocol is "http:" or "https:"
  return url.protocol === "http:" || url.protocol === "https:";
}

function dealwithA11yInfo(textLink, hrefID, declaHref) {
  // Initialize variables
  let text;
  let className;
  let backgroundColor;
  let borderColor;
  let textColor;
  // Check if the textLink is "must_be" and set the corresponding variables
  if(textLink == "must_be"){
    addInGoogleResult({
      textLink: textLink,
      hrefID: hrefID,
      declaHref: declaHref,
      text: "Absence de déclaration d'accessibilité obligatoire",
      backgroundColor: "#fff0f0",
      borderColor: "#e4b0ac",
      textColor: "#660100",
      className: "ostendo-mb"
    });
  }
  // Check if the textLink includes "partiellement" or "partielle" and set the corresponding variables
  else if(textLink.includes("partiellement") || textLink.includes("partielle")){
    addInGoogleResult({
      textLink: textLink,
      hrefID: hrefID,
      declaHref: declaHref,
      text: "Site partiellement accessible aux personnes handicapées",
      backgroundColor: "#ffefd9",
      borderColor: "#e0c3a3",
      textColor: "#4d2700",
      className: "ostendo-pa"
    });
  }
  // Check if the textLink includes "non" and set the corresponding variables
  else if(textLink.includes("non")){
    addInGoogleResult({
      textLink: textLink,
      hrefID: hrefID,
      declaHref: declaHref,
      text: "Site non accessible aux personnes handicapées",
      backgroundColor: "#fff0f0",
      borderColor: "#e4b0ac",
      textColor: "#660100",
      className: "ostendo-na"
    });
  }
  // If none of the above conditions are met, set the corresponding variables
  else{
    addInGoogleResult({
      textLink: textLink,
      hrefID: hrefID,
      declaHref: declaHref,
      text: "Site accessible aux personnes handicapées",
      backgroundColor: "#f8fff0",
      borderColor: "#e2e9e3",
      textColor: "#004f0a",
      className: "ostendo-a"
    });
  }
}

function addInGoogleResult(options) {
  // Initialize variables from option object
  const textLink = options.textLink;
  const hrefID = options.hrefID;
  const declaHref = options.declaHref;
  const text = options.text;
  const backgroundColor = options.backgroundColor;
  const borderColor = options.borderColor;
  const textColor = options.textColor;
  const className = options.className;

  chrome.storage.sync.get('option_rgaa_link', function(response) {
    // Retrieve the value of the 'option_rgaa_link' key in chrome.storage
    // the option allows the user to choose whether to display the link to the accessibility statement
    const option_rgaa_link = response.option_rgaa_link;

    // Select the div of the google result with the data-hveid attribute matching the passed in hrefID
    let divResults = document.querySelector("div[data-hveid="+hrefID+"]");
    // Add the class name to the parent div
    divResults.closest(".MjjYud").classList.add(className);

    // If the option_rgaa_link is not set and a declaration of accessibility URL exists
    if(!option_rgaa_link && declaHref){ 
      // Set an ID for the h3 tag
      divResults.querySelector('.yuRUbf > a:not([aria-describedby]) h3').setAttribute("id", "site-"+hrefID+"");
      // Insert the accessibility information with a link to the declaration of accessibility
      divResults.querySelector('.yuRUbf > a:not([aria-describedby])').insertAdjacentHTML('afterend', 
        "<div><p style=\"margin:1px 0 4px 0;\"><span id=\"ostendo-"+hrefID+"\" class=\"iUh30 tjvcx\" style=\"background: "+backgroundColor+";color: "+textColor+";border: 1px solid "+borderColor+";padding: 2px 4px;border-radius: 4px;\">"+text+"</span><a href=\""+declaHref+"\" style=\"margin-left:10px;font-size:0.9rem;\" aria-labelledby=\"decla-"+hrefID+" site-"+hrefID+"\"><span id=\"decla-"+hrefID+"\">Déclaration d'accessibilité</span></a></p></div>");
    }else{
      // If the option_rgaa_link is set or there is no declaration of accessibility URL, insert the accessibility information without a link
      divResults.querySelector('.yuRUbf > a:not([aria-describedby])').insertAdjacentHTML('afterend', "<div><p style=\"margin:1px 0 4px 0;\"><span id=\"ostendo-"+hrefID+"\" class=\"iUh30 tjvcx\" style=\"background: "+backgroundColor+";color: "+textColor+";border: 1px solid "+borderColor+";padding: 2px 4px;border-radius: 4px;\">"+text+"</span></p></div>");
    }
    // Add the accessibility information's id to the link as aria-describedby attribute
    divResults.querySelector('.yuRUbf > a').setAttribute("aria-describedby", "ostendo-"+hrefID);
  });

  // if user choose to sort the order of result by accessibility state
  chrome.storage.sync.get('option_order', function(response) {
    const option_order = response.option_order;
    if(option_order){ 
      // Select the parent element where the search results are located
      let parent = document.querySelector(".v7W49e");
      // Select all elements with class "ostendo-mb" (must be accessible)
      let resultsMustBeAccessible = document.querySelectorAll(".ostendo-mb");
      // Select all elements with class "ostendo-a" (accessible)
      let resultsAccessible = document.querySelectorAll(".ostendo-a");
      // Select all elements with class "ostendo-pa" (partially accessible)
      let resultsPartiellementAccessible = document.querySelectorAll(".ostendo-pa");
      // Select all elements with class "ostendo-na" (not accessible)
      let resultsNonAccessible = document.querySelectorAll(".ostendo-na");

      // Convert the NodeList to a real array and reverse order of it
      // That's for keeping order set by google for results whith the same accessibility state
      resultsMustBeAccessible = [].slice.call(resultsMustBeAccessible, 0).reverse();
      resultsAccessible = [].slice.call(resultsAccessible, 0).reverse();
      resultsPartiellementAccessible = [].slice.call(resultsPartiellementAccessible, 0).reverse();
      resultsNonAccessible = [].slice.call(resultsNonAccessible, 0).reverse();

      // Insert each result in the parent element
      // From the bottom
      // First the not accessible result
      resultsNonAccessible.forEach((resultNonAccessible) => {
        parent.insertBefore(resultNonAccessible, parent.lastChild.nextSibling);
      });
      // And after the result who must have à accessible declaration
      resultsMustBeAccessible.forEach((resultMustBeAccessible) => {
        parent.insertBefore(resultMustBeAccessible, parent.lastChild.nextSibling);
      });

      // And from the top
      // First the partially accessible
      resultsPartiellementAccessible.forEach((resultPartiellementAccessible) => {
        parent.insertBefore(resultPartiellementAccessible, parent.firstChild);
      });
      // And before the full accessible
      resultsAccessible.forEach((resultAccessible) => {
        parent.insertBefore(resultAccessible, parent.firstChild);
      });
    }
  });
}