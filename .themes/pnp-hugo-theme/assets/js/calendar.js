/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./themes/pnp-hugo-theme/assets/ts/calendar.ts":
/*!*****************************************************!*\
  !*** ./themes/pnp-hugo-theme/assets/ts/calendar.ts ***!
  \*****************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("\nvar __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\n    return new (P || (P = Promise))(function (resolve, reject) {\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\n    });\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst ikalendar_js_1 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error(\"Cannot find module 'ikalendar.js'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));\nfunction fetchAndParseICS(url) {\n    return __awaiter(this, void 0, void 0, function* () {\n        const response = yield fetch(url);\n        if (!response.ok) {\n            throw new Error('Network response was not ok');\n        }\n        const data = yield response.text();\n        const calendar = ikalendar_js_1.VCalendar.parse(data);\n        const events = [];\n        calendar.components.forEach((component) => {\n            if (component instanceof ikalendar_js_1.VEvent) {\n                events.push({\n                    summary: component.summary.value,\n                    startDate: component.dtstart.value,\n                    endDate: component.dtend.value,\n                });\n            }\n        });\n        return events;\n    });\n}\nfunction displayEvents(events) {\n    const eventsContainer = document.getElementById('events-container');\n    if (!eventsContainer)\n        return;\n    eventsContainer.innerHTML = ''; // Clear existing content\n    events.forEach(event => {\n        const eventElement = document.createElement('div');\n        eventElement.className = 'event';\n        const title = document.createElement('h3');\n        title.textContent = event.summary;\n        const when = document.createElement('p');\n        when.textContent = `Start: ${event.startDate} - End: ${event.endDate}`;\n        eventElement.appendChild(title);\n        eventElement.appendChild(when);\n        eventsContainer.appendChild(eventElement);\n    });\n}\n// const icsUrl = 'url_to_your_ics_file.ics'; // Replace with your .ics file URL\nconst icsUrl = 'https://outlook.office365.com/owa/calendar/c80c26982a604d3e89b403a318e7a477@officedevpnp.onmicrosoft.com/ca3a6fcd2d944eedb7f87d13bea580af13174372598351020792/calendar.ics'; // Replace with your .ics file URL\nfetchAndParseICS(icsUrl)\n    .then(displayEvents)\n    .catch(error => console.error('Error loading calendar:', error));\n\n\n//# sourceURL=webpack://pnp.github.io/./themes/pnp-hugo-theme/assets/ts/calendar.ts?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./themes/pnp-hugo-theme/assets/ts/calendar.ts");
/******/ 	
/******/ })()
;