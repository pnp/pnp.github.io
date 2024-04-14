const fetch = require('node-fetch');
const ical = require('ical.js');
const fs = require('fs');
const path = require('path');
const { RRule, RRuleSet } = require('rrule');
const { DateTime } = require('luxon');

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

function convertToUTC(dateString) {
    // Split the date string into the time zone and the date parts
    const [tzid, datePart] = dateString.split(':');

    // Get the time zone name
    const timeZone = tzid.split('=')[1];

    // Map the time zone name to an IANA time zone
    const timeZoneMap = {
        'Eastern Standard Time': 'America/New_York',
        // Add more mappings as needed
    };
    const ianaTimeZone = timeZoneMap[timeZone];

    // Parse the date and time parts from the date string
    const year = parseInt(datePart.slice(0, 4), 10);
    const month = parseInt(datePart.slice(4, 6), 10);
    const day = parseInt(datePart.slice(6, 8), 10);
    const hour = parseInt(datePart.slice(8, 10), 10);
    const minute = parseInt(datePart.slice(10, 12), 10);
    const second = parseInt(datePart.slice(12, 14), 10);

    // Create a new DateTime object in the specified time zone
    const dateTime = DateTime.fromObject({ year, month, day, hour, minute, second, zone: ianaTimeZone });

    // Convert the DateTime object to UTC
    const utcDateTime = dateTime.toUTC();

    return utcDateTime.toISO();
}

function parseAndConvertICALToJSON(icsData) {
    const jcal = ical.parse(icsData);
    const comp = new ical.Component(jcal);
    const events = comp.getAllSubcomponents('vevent');
    const mappedEvents = events.map(event => {
        const vevent = new ical.Event(event);
        if (!vevent.location ) {
            vevent.location = "Microsoft Teams Meeting";
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
            location: vevent.location ? vevent.location.toString() : "Microsoft Teams Meeting",
            description: vevent.description,
            startTime: vevent.startDate.toString(),
            endTime: vevent.endDate.toString(),
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
                // Add the recurrence date to the matching event's nextOccurrences array
                matchingEvent.nextOccurrences.push({
                    date: eventWithRecurrenceId.startTime.toString(),
                    status: "moved"
                });
            }
        }
    });

    console.log('jcal:', comp.toString()); // Debugging statement

    return mappedEvents;
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

function getNextOccurrences(vevent, dateAfter) {
    try {
        const exdates = parseExdates(vevent).map(date => date.toISOString());
        const rruleProp = vevent.component.getFirstProperty('rrule');
        let occurrences = [];
        const ruleString = rruleProp ? rruleProp.getFirstValue().toString() : null;
        if (rruleProp) {
            const fixedRruleString = fixRecurrenceRule(ruleString);
            //const rule = RRule.fromString(`DTSTART:${vevent.startDate.toJSDate()};\nRRULE:${fixedRruleString}`);
            const ruleSetString = `RRULE:${fixedRruleString}`;

            const rule = RRule.fromString(ruleSetString);

            var ruleSet = new RRuleSet();
            ruleSet.rrule(rule);
            ruleSet.startDate = vevent.startDate;

            const dateBefore = new Date(dateAfter); // Current date
            dateBefore.setFullYear(dateAfter.getFullYear() + 1); // 1 year from now


            const nextDates = rule.between(dateAfter, dateBefore, true, (date, i) => {
                return i < 7
            });

            nextDates.forEach(next => {
                // fix the date to match the start date
                next.setHours(vevent.startDate.hour, vevent.startDate.minute, vevent.startDate.second);

                occurrences.push({
                    date: next.toISOString(),
                    status: "scheduled"
                });
            });

            exdates.forEach(exdate => {
                let index = occurrences.findIndex(occ => occ.date === exdate);
                if (index !== -1) {
                    occurrences[index].status = "cancelled"; // Change status to cancelled
                } else {
                    occurrences.push({
                        date: exdate,
                        status: "cancelled"
                    });
                }
            });

            occurrences.sort((a, b) => new Date(a.date) - new Date(b.date));
        }
        return occurrences;
    } catch (error) {
        console.error("Error in getNextOccurrences:", error);
        return [];
    }
}


function fixRecurrenceRule(rruleString) {
    return rruleString.replace(/BYDAY=(\d)([A-Z]+)/g, 'BYDAY=+$1$2');
}

async function main() {
    ensureDirectoryExists(ICS_OUTPUT_FILE);

    const icsData = await fetchICS();
    if (!icsData) {
        console.log('Failed to download ICS data. Exiting.');
        return;
    }

    fs.writeFileSync(ICS_OUTPUT_FILE, icsData);
    console.log('ICS file has been downloaded and saved.');

    const jsonData = {
        lastRetrieved: new Date().toISOString(),
        events: parseAndConvertICALToJSON(icsData)
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
