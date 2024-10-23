chrome.storage.sync.get('option_activate', function(response) {
  const option_activate = response.option_activate;
  // Check if the option to activate the extension is turned on
  if(option_activate){
    let searchSelector;
    let searchEngine;
    switch (window.location.hostname) {
      case 'www.google.com':
      case 'www.google.fr':
        searchSelector = "div[data-hveid] .yuRUbf a";
        searchEngine = "google";
        break;
      case 'www.bing.com':
      case 'www.bing.fr':
        searchSelector = "#b_results>li.b_algo h2 a[h]";
        searchEngine = "bing";
        break;
    } 
    // Connect to the background script (service-worker)
    let port = chrome.runtime.connect({name: "a11y"});
    // Get all the links of the search results
    const resultsLinks = document.querySelectorAll(searchSelector);
    // Iterate over each link
    resultsLinks.forEach(function(resultLink, index, array) {
      // Get the href attribute of the link
      const href = resultLink.getAttribute("href");
      // Get the id of the search result
      let hrefID;
      switch (searchEngine) {
        case 'google':
          hrefID = resultLink.closest('div[data-hveid]').getAttribute("data-hveid");
          break;
        case 'bing':
            hrefID = resultLink.getAttribute("h");
          break;
      }
      // Send a message to the background script with the url to fetch and the id of the search result
      // it's to recover the html dom without having CORS problems
      // IMPORTANT :
      // Find a way to get HTML DOM from websites with JS framework that only render DOM in javascript
      port.postMessage({action: "urlToFetch", href: href, hrefID: hrefID, searchEngine: searchEngine});
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
          let textLinkLowerCase = "";
          if(docLink.innerText){
            textLinkLowerCase = docLink.innerText.toLowerCase();
          }
          // check if the text includes the word "accessibilité" or "accessibilite"
          if(textLinkLowerCase.includes("accessibilité") || textLinkLowerCase.includes("accessibilite") || textLinkLowerCase.includes("rgaa")){
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
              // Send a message to the background script with the "déclaration d'accessibilité url to fetch and the id of the search result
              // it's to recover the html dom without having CORS problems
              port.postMessage({action: "declaUrlToFetch", href: declaHref, hrefID: msg.hrefID, searchEngine: searchEngine, textLink: textLinkLowerCase});
              // Stop the "every" loop
              return false;
            }
          }else if(mustBeAccessible && idx === array.length - 1 && !hasALinkAboutA11y){
            // If the website must be accessible but no accessibility link was found, call the function dealwithA11yInfo with "must_be" as the text and pass the hrefID and null as the declaration href
            dealwithA11yInfo("must_be", msg.hrefID, null, searchEngine);
            // Stop the "every" loop
            return false;
          }
          return true;
        });
      } else if (msg.action === "declaDomHtml"){
        // A message is received from the background script with the HTML of the page as a text/plain
        const parser = new DOMParser();
        // Parse the text/plain of the html fetched to get the HTML document
        let doc = parser.parseFromString(msg.domHtml, "text/html");
        // Get all text from page
        let bodyText = doc.body.innerText;

        // Regex to find the "taux d'accessibilité"
        let regex = /(?:taux d’accessibilité de\s+(\d+(?:[.,]\d+)?))\s*%|(\d+(?:[.,]\d+)?)(?=\s*%\s*(?:des critères|au RGAA))/g;
        let match;
        let lastMatch = null;
        let schemaUrl = null;
        // Get throuht all and select the last one
        // (sometimes website display the old and new one "taux")
        // NEED IMPROVEMENT
        while ((match = regex.exec(bodyText)) !== null) {
            lastMatch = match[1] || match[2];  // Get the number
        }
        // Search all link to get the one to the "Schéma"
        let links = doc.querySelectorAll('a[href]'); 
        let hrefURL = new URL(msg.href);
        // Get throught all the link to find the one talking about "Schéma pluriannuel"
        links.forEach((link) => {
            if (link.textContent.includes("chéma pluriannuel")) {
              schemaUrl = link.getAttribute("href");
              if(!isValidHttpUrl(schemaUrl)){
                if(schemaUrl.startsWith('/')){
                  schemaUrl = hrefURL.origin+schemaUrl;
                }else{
                  schemaUrl = hrefURL.origin+"/"+schemaUrl;
                }
              }
              schemaUrl = new URL(schemaUrl);
            }
        });
        if (lastMatch) {
          let pourcent = lastMatch;
          // Call the function dealwithA11yInfo with pourcent
          dealwithA11yInfo(msg.textLink, msg.hrefID, msg.href, msg.searchEngine, pourcent, schemaUrl);
        }else{
          // Call the function dealwithA11yInfo without pourcents
          dealwithA11yInfo(msg.textLink, msg.hrefID, msg.href, msg.searchEngine, 0, schemaUrl);
        }
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

function dealwithA11yInfo(textLink, hrefID, declaHref, searchEngine, pourcent, schema) {
  // Initialize variables
  let text;
  let className;
  let backgroundColor;
  let borderColor;
  let textColor;
  let pourcentage;

  if (pourcent == 0) {
    pourcentage = "Déclaration d'accessibilité";
  }else{
    pourcentage = "Taux de conformité : "+pourcent+"%";
  }
  // Check if the textLink is "must_be" and set the corresponding variables
  if(textLink == "must_be"){
    addInGoogleResult({
      textLink: textLink,
      hrefID: hrefID,
      declaHref: declaHref,
      searchEngine: searchEngine,
      text: "Accessibilité numérique : Absence de déclaration de conformité",
      pourcent : pourcentage,
      schema : schema,
      backgroundColor: "#ce0500",
      borderColor: "#f60700",
      textColor: "#fff4f4",
      className: "ostendo-mb"
    });
  }
  // Check if the textLink includes "partiellement" or "partielle" and set the corresponding variables
  else if(textLink.includes("partiellement") || textLink.includes("partielle")){
    addInGoogleResult({
      textLink: textLink,
      hrefID: hrefID,
      declaHref: declaHref,
      searchEngine: searchEngine,
      text: "Accessibilité numérique : partiellement conforme",
      pourcent : pourcentage,
      schema : schema,
      backgroundColor: "#ffce90",
      textColor: "#5b2213",
      className: "ostendo-pa"
    });
  }
  // Check if the textLink includes "non" and set the corresponding variables
  else if(textLink.includes("non")){
    addInGoogleResult({
      textLink: textLink,
      hrefID: hrefID,
      declaHref: declaHref,
      searchEngine: searchEngine,
      text: "Accessibilité numérique : non conforme",
      pourcent : pourcentage,
      schema : schema,
      backgroundColor: "#ffc4c4",
      textColor: "#490503",
      className: "ostendo-na"
    });
  }
  // Check if the textLink includes "totalement" and set the corresponding variables
  else if(textLink.includes("totalement")){
    addInGoogleResult({
      textLink: textLink,
      hrefID: hrefID,
      declaHref: declaHref,
      searchEngine: searchEngine,
      text: "Accessibilité numérique : totalement conforme",
      pourcent : pourcentage,
      schema : schema,
      backgroundColor: "#dffee6",
      textColor: "#204129",
      className: "ostendo-a"
    });
  }
}

function addInGoogleResult(options) {
  // Initialize variables from option object
  const textLink = options.textLink;
  const hrefID = options.hrefID;
  const searchEngine = options.searchEngine;
  const declaHref = options.declaHref;
  const text = options.text;
  const pourcent = options.pourcent;
  const schemaUrl = options.schema;
  const backgroundColor = options.backgroundColor;
  const borderColor = options.borderColor;
  const textColor = options.textColor;
  const className = options.className;

  chrome.storage.sync.get('option_rgaa_link', function(response) {
    // Retrieve the value of the 'option_rgaa_link' key in chrome.storage
    // the option allows the user to choose whether to display the link to the accessibility statement
    const option_rgaa_link = response.option_rgaa_link;
    let divResults;
    let divResultsLink;
    let divResultsLinkWAD;
    let divResultsTitle;
    switch (searchEngine) {
      case 'google':
        // Select the div of the google result with the data-hveid attribute matching the passed in hrefID
        divResults = document.querySelector("div[data-hveid="+hrefID+"]");
        // Add the class name to the parent div
        divResults.closest(".MjjYud").classList.add(className);
        divResultsLink = divResults.querySelector('.yuRUbf a:not([aria-describedby])');
        divResultsLinkWAD = divResults.querySelector('.yuRUbf a');
        divResultsTitle = divResults.querySelector('.yuRUbf a:not([aria-describedby]) h3');
        break;
      case 'bing':
        // Select the div of the bing result with the h attribute matching the passed in hrefID
        divResults = document.querySelector('li.b_algo a[h="' + hrefID + '"]');
        // Add the class name to the parent div
        divResults.closest("li.b_algo").classList.add(className);
        divResultsLink = divResults;
        divResultsLinkWAD =  divResults;
        divResultsTitle = divResults.closest("h2");
        break;
    }

    // If the option_rgaa_link is not set and a declaration of accessibility URL exists
    if(!option_rgaa_link && declaHref && divResults){ 
      // Set an ID for the h3 tag
      divResultsTitle.setAttribute("id", "site-"+hrefID+"");
      let schemaLink;
      //create the link to the schéma if exist
      if(schemaUrl != null){
        schemaLink = "<span aria-hidden=\"true\"> · &lrm;</span><a href=\""+schemaUrl+"\" style=\"font-size:0.9rem;\" aria-labelledby=\"schema-"+hrefID+" site-"+hrefID+"\"><span id=\"schema-"+hrefID+"\">Schéma pluriannuel</span></a>";
      }else{
        schemaLink = "";
      }
      // Insert the accessibility information with a link to the declaration of accessibility
      divResultsLink.insertAdjacentHTML('afterend', 
        "<div><p style=\"margin:1px 0 4px 0;\"><span id=\"ostendo-"+hrefID+"\" style=\"background: "+backgroundColor+";color: "+textColor+";padding: 4px 5px;border-radius: 4px;font-size:0.9rem;\">"+text+"</span><span aria-hidden=\"true\"> · &lrm;</span><a href=\""+declaHref+"\" style=\"font-size:0.9rem;\" aria-labelledby=\"decla-"+hrefID+" site-"+hrefID+"\"><span id=\"decla-"+hrefID+"\">"+pourcent+"</span></a>"+schemaLink+"</p></div>");
    }else if(divResultsLink){
      // If the option_rgaa_link is set or there is no declaration of accessibility URL, insert the accessibility information without a link
      divResultsLink.insertAdjacentHTML('afterend', "<div><p style=\"margin:1px 0 4px 0;\"><span id=\"ostendo-"+hrefID+"\" style=\"background: "+backgroundColor+";color: "+textColor+";padding: 4px 5px;border-radius: 4px;font-size:0.9rem;\">"+text+"</span></p></div>");
    }
    // Add the accessibility information's id to the link as aria-describedby attribute
    divResultsLinkWAD.setAttribute("aria-describedby", "ostendo-"+hrefID);
  });

  // if user choose to sort the order of result by accessibility state
  chrome.storage.sync.get('option_order', function(response) {
    const option_order = response.option_order;
    if(option_order){ 
      let parent;
      let lastSearchResult;
      switch (searchEngine) {
        case 'google':
          // Select the parent element where the search results are located
          parent = document.querySelector("#search");
          lastSearchResult = parent.lastChild.nextSibling;
          break;
        case 'bing':
          // Select the parent element where the search results are located
          parent = document.querySelector("#b_results");
          lastSearchResult = parent.querySelector(".b_pag").previousSibling;
          break;
      }
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
        parent.insertBefore(resultNonAccessible, lastSearchResult);
      });
      // And after the result who must have à accessible declaration
      resultsMustBeAccessible.forEach((resultMustBeAccessible) => {
        parent.insertBefore(resultMustBeAccessible, lastSearchResult);
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