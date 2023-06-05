# Changelog
All notable changes to the Ostendo extension will be documented in this file.

## [Unreleased]
- Retrieve information from the accessibility declaration
- Continue to add URL to the Json list (thanks to https://www.webscraper.io/)
- Find a way to get HTML DOM from websites with JS framework that only render DOM in javascript
- Port to Firefox (already done but need to understand how permission for all url in manifest v3 work)

## [1.3] - 24 may 2023
### Added
- Add Bing Search support
- Add URLs of the sites of the french departments
### Improvement
- Some improvement to retrieve accessibility state
- Change design (font-size, color pallet)

## [1.2] - 28 january 2023
### Added
- Add some URL to the JSON 

## [1.1] - 18 january 2023
### Improvement
- Overall code improvement and added comment

## [1.0] - 04 january 2023
### Added
- Add a JSON list of url of websites affected by the obligation to have an accessibility declaration
- Add a new status "Absence de déclaration d'accessibilité obligatoire"
### Fixed
- Fixed url ptah of the declaration for relative url

## [0.6] - 19 december 2022
### Added
- Adding sort order for results based on accessibility level
- Add a link to the accessibility statement directly on search results 
### Fixed
- Some improvement

## [0.5] - 8 august 2022
### Fixed
- Performance improvement : send only the HTML DOM, from service-worker to front, of google search urls that contain the term "accessibilité".

## [0.0.4] - 5 august 2022
### Added
- Changelog file and link to access it

### Fixed
- Multiple banner under one search result

## [0.0.3] - 4 august 2022
### Fixed
- Performance improvement

## [0.0.2] - 19 july 2022
### Added
- FAQ

### Changed
- Design of the popup and settings page

## [0.0.1] - 10 july 2022
### Added
- First publication of the extension
