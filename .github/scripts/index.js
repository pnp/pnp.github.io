const fetch = require('node-fetch');
const ical = require('ical.js');
const fs = require('fs');
const path = require('path');

const ICS_URL = process.env.ICS_URL || "https://outlook.office365.com/owa/calendar/c80c26982a604d3e89b403a318e7a477@officedevpnp.onmicrosoft.com/299d3353259f4abf919f4abbeffea3863901301114936881794/calendar.ics"; // Use the environment variable
const DIR_PATH = path.join(__dirname, '../../ical');
const ICS_OUTPUT_FILE = path.join(DIR_PATH, 'calendar.ics');
const JSON_OUTPUT_FILE = path.join(DIR_PATH, 'calendar.json');

function ensureDirectoryExists(filePath) {
    const dirname = path.dirname(filePath);
    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
        console.log(`Directory ${dirname} created.`);
    }
}

async function fetchICS() {
    try {
        const response = await fetch(ICS_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch ICS file: ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error('Fetch ICS Error:', error);
        return null;
    }
}

function parseAndConvertICALToJSON(icsData) {
    const jcal = ical.parse(icsData);
    const comp = new ical.Component(jcal);
    const events = comp.getAllSubcomponents('vevent');
    const mappedEvents = events.map(event => {
        const vevent = new ical.Event(event);
        const meetingUrl = extractMeetingUrlFromDescription(vevent.description);
        
        // Add the meeting URL as a custom property
        if (meetingUrl) {
            event.addPropertyWithValue('x-microsoft-skypeteamsmeetingurl', meetingUrl);
        }

        const rruleProp = vevent.component.getFirstProperty('rrule');
        const rrule = rruleProp ? rruleProp.getFirstValue() : null;
        // Try to fetch RECURRENCE-ID directly
        const recurrenceIdProp = vevent.component.getFirstProperty('recurrence-id');
        const recurrenceId = recurrenceIdProp ? recurrenceIdProp.getFirstValue().toICALString() : null;

        console.log(`Event: ${vevent.summary}`); // Debugging statement

        const todayAtMidnight = new Date();
        todayAtMidnight.setHours(0, 0, 0, 0);
        let nextOccurrences = []; //getNextOccurrences(vevent, todayAtMidnight);


        let expand = new ical.RecurExpansion({
            component: event,
            dtstart: event.getFirstPropertyValue('dtstart')
        });

        // next is always an ICAL.Time or null
        let next;

        let i = 0;
        while (i < 7 && (next = expand.next())) {

            const jsDate = next.toJSDate();
            const isoDate = jsDate.toISOString();

            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set the time to midnight

            if (jsDate > today) {
                nextOccurrences.push({
                    date: isoDate,
                    status: "scheduled"
                });
                i++;
            } 
        
        }

        // Go through the exception dates and mark them as cancelled
        const exdates = parseExdates(vevent);
        exdates.forEach(exdate => {
            let index = nextOccurrences.findIndex(occ => occ.date === exdate);
            if (index !== -1) {
                nextOccurrences[index].status = "cancelled"; // Change status to cancelled
            } else {
                nextOccurrences.push({
                    date: exdate,
                    status: "cancelled"
                });
            }
        });

        // sort the next occurrences by date
        nextOccurrences.sort((a, b) => new Date(a.date) - new Date(b.date));

        return {
            uid: vevent.uid,
            summary: vevent.summary,
            joinUrl: meetingUrl,
            location: vevent.location ? vevent.location.toString() : "Microsoft Teams Meeting",
            joinUrl: meetingUrl,
            startTime: vevent.startDate.toJSDate().toISOString(),
            endTime: vevent.endDate.toJSDate().toISOString(),
            rrule: rrule ? rrule.toString() : null,
            exdate: exdates,
            recurrenceId: recurrenceId ? recurrenceId.toString() : null,
            nextOccurrences: nextOccurrences
        };
    });

    // After the events array has been created...
    mappedEvents.forEach(eventWithRecurrenceId => {
        if (eventWithRecurrenceId.recurrenceId) {
            // Find the event with a matching UID
            const matchingEvent = mappedEvents.find(event => event.uid === eventWithRecurrenceId.uid);

            if (matchingEvent) {
                // Convert the event with recurrenceId start time to UTC
                const yearPart = eventWithRecurrenceId.recurrenceId.slice(0, 4);
                const monthPart = eventWithRecurrenceId.recurrenceId.slice(4, 6);
                const dayPart = eventWithRecurrenceId.recurrenceId.slice(6, 8);
                const utcDate = `${yearPart}-${monthPart}-${dayPart}`;


                // Find the matching event's nextOccurrences array by matching the date portion only
                const matchingOccurrence = matchingEvent.nextOccurrences.find(occurrence => occurrence.date.startsWith(utcDate  ));   

                if (matchingOccurrence) {
                    // Change the status of the matching occurrence to moved
                    matchingOccurrence.status = "moved";
                    matchingOccurrence.date = eventWithRecurrenceId.startTime.toString();
                    matchingOccurrence.summary = eventWithRecurrenceId.summary;
                    matchingOccurrence.description = eventWithRecurrenceId.description;
                }
  
            }
        }
    });

    // After all events have been processed, convert the Component back to an ICS string
    const updatedIcsData = comp.toString();

    return { mappedEvents, updatedIcsData };
}

function parseExdates(vevent) {
    const exdates = vevent.component.getAllProperties('exdate');
    return exdates.map(exdate => {
        // Assuming exdate is in UTC and converting accordingly
        const jsDate = exdate.getFirstValue().toJSDate();
        const isoDate = jsDate.toISOString();

        return isoDate;
    });
}

function extractMeetingUrlFromDescription(description) {
    const regex = /\n\nClick here to join the meeting<([^>]+)>\n\n_/;
    const match = description.match(regex);
    return match ? match[1] : null;
}


async function main() {
    ensureDirectoryExists(ICS_OUTPUT_FILE);

    let icsData = await fetchICS();
    if (!icsData) {
        console.log('Failed to download ICS data. Exiting.');
        return;
    }

    // Add Location if not present

    // Search and replace every occurrence of a line with only LOCATION: with LOCATION:Microsoft Teams Meeting

    icsData = icsData.replace(/^LOCATION:$/gm, 'LOCATION:Microsoft Teams Meeting');

    // Find this:
    // X-MICROSOFT-REQUESTEDATTENDANCEMODE:DEFAULT
    // And replace with this:
    // X-MICROSOFT-REQUESTEDATTENDANCEMODE:ONLINE
    icsData = icsData.replace(/X-MICROSOFT-REQUESTEDATTENDANCEMODE:DEFAULT/g, 'X-MICROSOFT-REQUESTEDATTENDANCEMODE:ONLINE');


    fs.writeFileSync(ICS_OUTPUT_FILE, icsData);
    console.log('ICS file has been downloaded and saved.');

    const { mappedEvents, updatedIcsData } = parseAndConvertICALToJSON(icsData);

    // Save the updated ICS data to a file
    fs.writeFileSync(ICS_OUTPUT_FILE, updatedIcsData);
    console.log('Updated ICS file has been saved.');

    const jsonData = {
        lastRetrieved: new Date().toISOString(),
        events: mappedEvents
    };

    if (jsonData.events) {
        fs.writeFileSync(JSON_OUTPUT_FILE, JSON.stringify(jsonData, null, 2));
        console.log('ICS data has been converted to JSON and saved.');
        console.log('The file has been saved at: ', path.resolve(JSON_OUTPUT_FILE));
    } else {
        console.log('Failed to convert ICAL to JSON or JSON is empty.');
    }
}

main();
