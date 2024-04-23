import { NextOccurrence, ICalEvent, ICalFeed } from './ICalFeed';
declare global {
    interface Window {
        baseUrl: string;
    }
}



// Function to fetch calendar data
async function fetchCalendarData(baseUrl: string): Promise<ICalFeed> {
    const url = new URL('./ical/calendar.json', baseUrl);
    const response = await fetch(url.toString());
    return await response.json() as ICalFeed;
}

// Utility to get time one hour from now
function getTimeOneHourFromNow(): Date {
    return new Date(new Date().getTime() + 60 * 60 * 1000);
}

// Utility to calculate duration between two times
function calculateDuration(startTime: Date, endTime: Date): number {
    return endTime.getTime() - startTime.getTime();
}

// Process all events
function processEvents(events: ICalEvent[], idprefix: string = ""): void {
    events.forEach(evt => handleSingleEvent(evt, idprefix));
}

function handleSingleEvent(event: ICalEvent, idprefix: string): void {
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
function filterFutureOccurrences(occurrences: NextOccurrence[], now: Date): NextOccurrence[] {
    // Convert 'now' to the start of the day in local time for fair comparison
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return occurrences.filter(occurrence => {
        const occurrenceDate = new Date(occurrence.date); // Parse as UTC
        return occurrenceDate >= startOfToday;
    });
}

function updateEventStatus(event: ICalEvent, card: HTMLElement, futureOccurrences: NextOccurrence[], now: Date, duration: number): void {
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
            } else {
                const statusMessage = extractOccurrenceSummary(occurrence.summary, event.summary) || 'Cancelled';
                setCardStatus(card, 'cancelled', statusMessage);
            }
        } else if (now >= occurrenceStartTime && now <= occurrenceEndTime) {
            console.log('Event is currently happening.');
            setCardStatus(card, 'live', 'Live');
        } else if (getTimeOneHourFromNow() >= occurrenceStartTime && now < occurrenceStartTime && occurrence.status === "scheduled") {
            console.log('Event is starting soon.');
            setCardStatus(card, 'soon', 'Starting soon');
        } else if (occurrenceStartTime.toDateString() === now.toDateString()) {
            console.log('Event starts today.');
            setCardStatus(card, 'today', 'Today 📆');
        } else if (occurrence.status === "moved") {
            const statusMessage = extractOccurrenceSummary(occurrence.summary, event.summary) || 'Moved';
            setCardStatus(card, 'moved', statusMessage);
        }
    });
}


function setCardStatus(card: HTMLElement, statusClass: string, statusText: string): void {
    const status = card?.querySelector('.card-status-outer');
    if (status) {
        status.innerHTML = `<div class="card-status ${statusClass}">${statusText}</div>`;
    }
}

// Main function that starts the process
async function updateEvents(): Promise<void> {
    const calendarData = await fetchCalendarData(window.baseUrl);

    // Only do this for the events page
    if (document.getElementById("events-container")) {
        processEvents(calendarData.events);
    }

    if (document.getElementById("calendar-container")) {
        generateCalendar(calendarData.events);
        processEvents(calendarData.events, "calendar-");
    }
}

function generateCalendar(events: ICalEvent[]): void {
    const today: Date = new Date();
    let thisMonday: Date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const firstMonday = thisMonday;

    // Calculate the day of the week (0 for Sunday, 1 for Monday, etc.) in UTC
    let dayOfWeek: number = today.getUTCDay();
    let offset: number = dayOfWeek - 1; // Calculate the offset to get to Monday
    if (offset < 0) offset = 6; // If today is Sunday, set offset to 6

    // Subtract the offset from the current date to get this Monday
    thisMonday.setUTCDate(thisMonday.getUTCDate() - offset);

    const calendarContainer: HTMLElement | null = document.getElementById('calendar-container');
    if (calendarContainer) {
        calendarContainer.innerHTML = ''; // Clear previous entries

        for (let i: number = 0; i < 12; i++) { // Generate for 12 days (for demonstration)

            // Skip weekends
            if (thisMonday.getUTCDay() !== 0 && thisMonday.getUTCDay() !== 6) {
                const liElem: HTMLLIElement = document.createElement('li');

                const articleElem: HTMLElement = document.createElement('article');
                articleElem.className = 'card upcoming';

                const divElem: HTMLDivElement = document.createElement('div');
                divElem.className = 'upcoming-content';

                const headerElem: HTMLElement = document.createElement('header');
                headerElem.className = 'card-upcoming-title';

                const timeElem: HTMLTimeElement = document.createElement('time');
                timeElem.setAttribute('datetime', thisMonday.toISOString());

                const dayElem: HTMLDivElement = document.createElement('div');
                dayElem.className = 'day';
                dayElem.textContent = thisMonday.getUTCDate().toString(); // UTC date for display

                const weekdayElem: HTMLDivElement = document.createElement('div');
                weekdayElem.className = 'weekday';
                weekdayElem.textContent = thisMonday.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

                const menuElem: HTMLMenuElement = document.createElement('menu');
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
                let eventsForTheDay: { uid: string, summary: string, date: Date }[] = [];

                events.forEach(event => {
                    event.nextOccurrences.forEach(occurrence => {
                        let occurrenceDate: Date = new Date(occurrence.date);
                        let formattedDate: string = occurrenceDate.toISOString().split('T')[0];

                        if (formattedDate === thisMonday.toISOString().split('T')[0]) {
                            eventsForTheDay.push({
                                uid: event.uid,
                                summary: event.summary,
                                date: occurrenceDate
                            });
                        }
                    });
                });

                // Sort the events for the day by date
                eventsForTheDay.sort((a, b) => a.date.getTime() - b.date.getTime());

 
                    // Render the events for the day
                    eventsForTheDay.forEach(event => {
                        const liElem: HTMLLIElement = document.createElement('li');
                        liElem.id = `calendar-${event.uid}`;

                        const divElem: HTMLDivElement = document.createElement('div');
                        divElem.className = 'event-details';

                        const timeElem: HTMLTimeElement = document.createElement('time');
                        timeElem.className = 'event-start';
                        let formattedTime: string = event.date.toLocaleTimeString(navigator.language, { hour: 'numeric', minute: 'numeric' });
                        timeElem.textContent = formattedTime;
                        timeElem.setAttribute('datetime', event.date.toISOString());

                        const h3Elem: HTMLHeadingElement = document.createElement('h3');
                        h3Elem.className = 'event-title';
                        h3Elem.textContent = event.summary;

                        const divStatusOuterElem: HTMLDivElement = document.createElement('div');
                        divStatusOuterElem.className = 'card-status-outer';

                        // Append elements
                        divElem.appendChild(timeElem);
                        divElem.appendChild(h3Elem);
                        divElem.appendChild(divStatusOuterElem);
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


function extractOccurrenceSummary(nextOccurrenceSummary: string | undefined, eventSummary: string): string | undefined {
    // Check if the occurrence has an specific message
    let occurrenceSummary: string | undefined = undefined;
    if (nextOccurrenceSummary && nextOccurrenceSummary !== eventSummary) {

        // If the next occurrence summary is shorter than the event summary, set the occurrence summary to the next occurrence summary
        if (nextOccurrenceSummary.length < eventSummary.length) {
            occurrenceSummary = nextOccurrenceSummary;
        } else {
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
