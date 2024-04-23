var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Function to fetch calendar data
function fetchCalendarData(baseUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = new URL('./ical/calendar.json', baseUrl);
        const response = yield fetch(url.toString());
        return yield response.json();
    });
}
// Utility to get time one hour from now
function getTimeOneHourFromNow() {
    return new Date(new Date().getTime() + 60 * 60 * 1000);
}
// Utility to calculate duration between two times
function calculateDuration(startTime, endTime) {
    return endTime.getTime() - startTime.getTime();
}
// Process all events
function processEvents(events, idprefix = "") {
    events.forEach(evt => handleSingleEvent(evt, idprefix));
}
function handleSingleEvent(event, idprefix) {
    const now = new Date(); // Current time in local timezone
    // Assuming startTime is an ISO string with 'Z' (UTC)
    const startTime = new Date(event.startTime); // Parse as UTC
    const endTime = new Date(event.endTime); // Parse as UTC
    const duration = calculateDuration(startTime, endTime);
    const card = document.getElementById(`${idprefix}${event.uid}`);
    if (!card) {
        //console.error('No card found with id:', `${idprefix}${event.uid}`);
        return;
    }
    const futureOccurrences = filterFutureOccurrences(event.nextOccurrences, now);
    updateEventStatus(event, card, futureOccurrences, now, duration);
}
function filterFutureOccurrences(occurrences, now) {
    // Convert 'now' to the start of the day in local time for fair comparison
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return occurrences.filter(occurrence => {
        const occurrenceDate = new Date(occurrence.date); // Parse as UTC
        return occurrenceDate >= startOfToday;
    });
}
function updateEventStatus(event, card, futureOccurrences, now, duration) {
    // Example of updating DOM elements based on the event data
    futureOccurrences.forEach(occurrence => {
        if (!occurrence) {
            return;
        }
        //BEGIN: TESTING
        // if (window.location.pathname.toLowerCase().endsWith('/test-events/')) {
        //     // This code will be removed in production
        //     if (event.uid === "040000008200E00074C5B7101A82E008000000003DADB286B88DDA01000000000000000010000000CAE180660514504D8FEE060CF40A7A57") {
        //         // Force the PLEASE DELETE ME to be to now
        //         // set the occurrence date to 10 minutes ago
        //         occurrence.summary = event.summary;
        //         occurrence.status = "scheduled";
        //         console.log('   Setting the meeting to be 10 minutes ago');
        //         const date = new Date();
        //         date.setMinutes(date.getMinutes() - 10);
        //         occurrence.date = date;
        //         console.log(now >= occurrence.date);
        //     } else if (event.uid === "040000008200E00074C5B7101A82E00800000000CE03C195278ADA010000000000000000100000001D5D5DA85E858D45B9A47028FB60C7F2") {
        //         // Force the Viva connections to be cancelled
        //         occurrence.status = "cancelled";
        //         occurrence.summary = "Cancelled until further notice";
        //         console.log('   Setting the status to be cancelled');
        //     } else if (event.uid === "040000008200E00074C5B7101A82E00800000000F97F040EAE8EDA01000000000000000010000000214806AD1FEB9B49B9BA5E95BB8A21A0") {
        //         occurrence.status = "moved";
        //         occurrence.summary = event.summary + "Moved to 8 AM PT/4 PM GMT";
        //         console.log('   Setting the status to be moved');
        //     } else if (event.uid === "040000008200E00074C5B7101A82E00800000000A1CD2D70268ADA0100000000000000001000000051CB05FE8CA1C74BB006BB017D44378A") {
        //         occurrence.status = "cancelled";
        //         occurrence.summary = event.summary + " On Hiatus for Summer Break 🏖️ Returns in September.";
        //         console.log('   Setting the status to on hiatus');
        //     } else if (event.uid === "040000008200E00074C5B7101A82E0080000000070404DDB288ADA01000000000000000010000000F485AAF2995C3947AF4B1E87F01384A0") {
        //         // Force the PLEASE DELETE ME to be less than 1 hour away
        //         const comingSoon = new Date(new Date().getTime() + 50 * 60 * 1000);
        //         occurrence.date = comingSoon;
        //         console.log("   Setting the meeting to less than an hour from now")
        //     } else if (event.uid === "040000008200E00074C5B7101A82E00800000000C81EAE66288ADA01000000000000000010000000F6C360139C27FF4B8FF87F06B421CDB8") {
        //         // Set the Power Platform Community Call to be today
        //         console.log('   Setting the Power Platform Community Call to be today');
        //         const endOfDay = new Date();
        //         endOfDay.setHours(23, 59, 59, 999);
        //         occurrence.date = endOfDay;
        //     }
        // }
        //END: TESTING
        const occurrenceStartTime = new Date(occurrence.date);
        const occurrenceEndTime = new Date(occurrenceStartTime.getTime() + duration);
        if (occurrence.status === "cancelled") {
            if (occurrence.summary && (occurrence.summary.toLowerCase().startsWith('hiatus') || occurrence.summary.toLowerCase().startsWith('on hiatus'))) {
                const statusMessage = extractOccurrenceSummary(occurrence.summary, event.summary) || 'On Hiatus';
                setCardStatus(card, 'hiatus', statusMessage);
            }
            else {
                const statusMessage = extractOccurrenceSummary(occurrence.summary, event.summary) || 'Cancelled';
                setCardStatus(card, 'cancelled', statusMessage);
            }
        }
        else if (now >= occurrenceStartTime && now <= occurrenceEndTime) {
            console.log('Event is currently happening.');
            setCardStatus(card, 'live', 'Live');
        }
        else if (getTimeOneHourFromNow() >= occurrenceStartTime && now < occurrenceStartTime && occurrence.status === "scheduled") {
            console.log('Event is starting soon.');
            setCardStatus(card, 'soon', 'Starting soon');
        }
        else if (occurrenceStartTime.toDateString() === now.toDateString()) {
            console.log('Event starts today.');
            setCardStatus(card, 'today', 'Today 📆');
        }
        else if (occurrence.status === "moved") {
            const statusMessage = extractOccurrenceSummary(occurrence.summary, event.summary) || 'Moved';
            setCardStatus(card, 'moved', statusMessage);
        }
    });
}
function setCardStatus(card, statusClass, statusText) {
    const status = card === null || card === void 0 ? void 0 : card.querySelector('.card-status-outer');
    if (status) {
        status.innerHTML = `<div class="card-status ${statusClass}">${statusText}</div>`;
    }
}
// Main function that starts the process
function updateEvents() {
    return __awaiter(this, void 0, void 0, function* () {
        const calendarData = yield fetchCalendarData(window.baseUrl);
        // Only do this for the events page
        if (document.getElementById("events-container")) {
            processEvents(calendarData.events);
        }
        if (document.getElementById("calendar-container")) {
            generateCalendar(calendarData.events);
            processEvents(calendarData.events, "calendar-");
        }
    });
}
function generateCalendar(events) {
    const today = new Date();
    let thisMonday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const firstMonday = thisMonday;
    // Calculate the day of the week (0 for Sunday, 1 for Monday, etc.) in UTC
    let dayOfWeek = today.getUTCDay();
    let offset = dayOfWeek - 1; // Calculate the offset to get to Monday
    if (offset < 0)
        offset = 6; // If today is Sunday, set offset to 6
    // Subtract the offset from the current date to get this Monday
    thisMonday.setUTCDate(thisMonday.getUTCDate() - offset);
    const calendarContainer = document.getElementById('calendar-container');
    if (calendarContainer) {
        calendarContainer.innerHTML = ''; // Clear previous entries
        for (let i = 0; i < 12; i++) { // Generate for 12 days (for demonstration)
            // Skip weekends
            if (thisMonday.getUTCDay() !== 0 && thisMonday.getUTCDay() !== 6) {
                const liElem = document.createElement('li');
                const articleElem = document.createElement('article');
                articleElem.className = 'card upcoming';
                const divElem = document.createElement('div');
                divElem.className = 'upcoming-content';
                const headerElem = document.createElement('header');
                headerElem.className = 'card-upcoming-title';
                const timeElem = document.createElement('time');
                timeElem.setAttribute('datetime', thisMonday.toISOString());
                const dayElem = document.createElement('div');
                dayElem.className = 'day';
                dayElem.textContent = thisMonday.getUTCDate().toString(); // UTC date for display
                const weekdayElem = document.createElement('div');
                weekdayElem.className = 'weekday';
                weekdayElem.textContent = thisMonday.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
                const menuElem = document.createElement('menu');
                menuElem.className = 'upcoming-list';
                // Append elements
                timeElem.appendChild(dayElem);
                timeElem.appendChild(weekdayElem);
                headerElem.appendChild(timeElem);
                divElem.appendChild(headerElem);
                divElem.appendChild(menuElem);
                articleElem.appendChild(divElem);
                liElem.appendChild(articleElem);
                // Processing events
                let eventsForTheDay = [];
                events.forEach(event => {
                    event.nextOccurrences.forEach(occurrence => {
                        let occurrenceDate = new Date(occurrence.date);
                        let formattedDate = occurrenceDate.toISOString().split('T')[0];
                        let eventNormalStartDate = new Date(event.startTime);
                        let eventNormalEndDate = new Date(event.endTime);
                        let eventDuration = calculateDuration(eventNormalStartDate, eventNormalEndDate);
                        // Calculate the endDate for the occurrence based on the duration of the event
                        let occurrenceEndDate = new Date(occurrenceDate.getTime() + eventDuration);
                        if (formattedDate === thisMonday.toISOString().split('T')[0]) {
                            eventsForTheDay.push({
                                uid: event.uid,
                                summary: event.summary,
                                date: occurrenceDate,
                                endDate: occurrenceEndDate,
                                joinUrl: event.joinUrl,
                                status: occurrence.status
                            });
                        }
                    });
                });
                // Sort the events for the day by date
                eventsForTheDay.sort((a, b) => a.date.getTime() - b.date.getTime());
                // Render the events for the day
                eventsForTheDay.forEach(event => {
                    const liElem = document.createElement('li');
                    liElem.id = `calendar-${event.uid}`;
                    const divElem = document.createElement('div');
                    divElem.className = 'event-details';
                    const timeElem = document.createElement('time');
                    timeElem.className = 'event-start';
                    let formattedTime = event.date.toLocaleTimeString(navigator.language, { hour: 'numeric', minute: 'numeric' });
                    timeElem.textContent = formattedTime;
                    timeElem.setAttribute('datetime', event.date.toISOString());
                    const h3Elem = document.createElement('h3');
                    h3Elem.className = 'event-title';
                    h3Elem.textContent = event.summary;
                    const divStatusOuterElem = document.createElement('div');
                    divStatusOuterElem.className = 'card-status-outer';
                    // Create script element for structured data
                    const scriptElem = document.createElement('script');
                    scriptElem.type = 'application/ld+json';
                    const structuredData = {
                        "@context": "https://schema.org",
                        "@type": "Event",
                        "name": event.summary,
                        "startDate": event.date.toISOString(),
                        "endDate": event.endDate.toISOString(),
                        "eventStatus": event.status === "moved" ? "https://schema.org/EventRescheduled" : event.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
                        "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
                        "location": {
                            "@type": "VirtualLocation",
                            "url": event.joinUrl
                        },
                        "organizer": {
                            "@type": "Organization",
                            "name": "Microsoft 365 & Power Platform Community",
                            "url": "https://pnp.github.io"
                        }
                        // Add other properties as needed
                    };
                    scriptElem.textContent = JSON.stringify(structuredData);
                    // Append elements
                    divElem.appendChild(timeElem);
                    divElem.appendChild(h3Elem);
                    divElem.appendChild(divStatusOuterElem);
                    divElem.appendChild(scriptElem); // Append script element to liElem
                    liElem.appendChild(divElem);
                    menuElem.appendChild(liElem);
                });
                calendarContainer.appendChild(liElem);
            }
            // Move to the next day
            thisMonday.setUTCDate(thisMonday.getUTCDate() + 1);
        }
    }
}
function extractOccurrenceSummary(nextOccurrenceSummary, eventSummary) {
    // Check if the occurrence has an specific message
    let occurrenceSummary = undefined;
    if (nextOccurrenceSummary && nextOccurrenceSummary !== eventSummary) {
        // If the next occurrence summary is shorter than the event summary, set the occurrence summary to the next occurrence summary
        if (nextOccurrenceSummary.length < eventSummary.length) {
            occurrenceSummary = nextOccurrenceSummary;
        }
        else {
            // remove the event summary length from the start of the occurrence summary
            occurrenceSummary = nextOccurrenceSummary.slice(eventSummary.length);
            occurrenceSummary = occurrenceSummary.trim();
            // If there is a - at the start of the occurrence summary, remove it and trim the string
            if (occurrenceSummary.startsWith('-')) {
                occurrenceSummary = occurrenceSummary.slice(1);
                occurrenceSummary = occurrenceSummary.trim();
            }
        }
    }
    return occurrenceSummary;
}
// Call the function when the page loads
window.addEventListener('DOMContentLoaded', updateEvents);
export {};
