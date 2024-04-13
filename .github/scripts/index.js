const fetch = require('node-fetch');
const ical = require('ical.js');
const fs = require('fs');
const path = require('path');
const { RRule } = require('rrule');

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
    return events.map(event => {
        const vevent = new ical.Event(event);
        const rruleProp = vevent.component.getFirstProperty('rrule');
        const rrule = rruleProp ? rruleProp.getFirstValue() : null;
        // Try to fetch RECURRENCE-ID directly
        const recurrenceIdProp = vevent.component.getFirstProperty('recurrence-id');
        const recurrenceId = recurrenceIdProp ? recurrenceIdProp.getFirstValue().toICALString() : null;

        console.log(`Event: ${vevent.summary}`); // Debugging statement

        let nextOccurrence = getNextOccurrence(vevent, new Date());

        return {
            summary: vevent.summary,
            location: vevent.location ? vevent.location.toString() : "Microsoft Teams Meeting",
            description: vevent.description,
            startTime: vevent.startDate.toString(),
            endTime: vevent.endDate.toString(),
            rrule: rrule ? rrule.toString() : null,
            exdate: parseExdates(vevent),
            recurrenceId:recurrenceId ? recurrenceId.toString() : null,
            nextEventDate: nextOccurrence
        };
    });
}


function parseExdates(vevent) {
    const exdates = vevent.component.getAllProperties('exdate');
    return exdates.map(exdate => {
        // Convert the EXDATE value to a JavaScript Date object directly
        return new Date(exdate.getFirstValue().toJSDate());
    });
}

function getNextOccurrence(vevent, fromDate) {
    try {
        const rruleProp = vevent.component.getFirstProperty('rrule');
        if (rruleProp) {
            const rruleData = rruleProp.getFirstValue();

            if (!rruleData.freq) {
                console.error("Frequency (freq) is missing in RRULE:", rruleData);
                return null; // Cannot proceed without a valid frequency
            }

            const rruleOptions = {
                freq: RRule[rruleData.freq.toUpperCase()], // Ensure freq is properly accessed and capitalized
                dtstart: vevent.startDate.toJSDate(),
                interval: rruleData.interval || 1,
                until: rruleData.until ? new Date(rruleData.until) : undefined,
                count: rruleData.count || undefined,
                byweekday: rruleData.parts.BYDAY ? parseByDay(rruleData.parts.BYDAY) : undefined
            };

            const rule = new RRule(rruleOptions);
            const next = rule.after(fromDate);
            return next ? next.toISOString() : null;
        }
        return vevent.startDate.toJSDate().toISOString();
    } catch (error) {
        console.error("Error in getNextOccurrence:", error);
        return null;
    }
}

function parseByDay(byday) {
    if (Array.isArray(byday)) {
        return byday.map(day => RRule[day]);
    } else if (typeof byday === 'string') {
        return byday.split(',').map(day => RRule[day]);
    } else {
        console.error("Unexpected BYDAY format:", byday);
        return undefined;
    }
}



function parseByDay(byday) {
    if (Array.isArray(byday)) {
        return byday.map(day => RRule[day]);
    } else if (typeof byday === 'string') {
        return byday.split(',').map(day => RRule[day]);
    } else {
        console.error("Unexpected BYDAY format:", byday);
        return undefined;
    }
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
