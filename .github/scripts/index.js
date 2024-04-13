const fetch = require('node-fetch');
const ical = require('ical.js');
const fs = require('fs');
const path = require('path');
const { RRule, RRuleSet } = require('rrule');

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

        let nextOccurrences = getNextOccurrences(vevent, new Date());

        return {
            summary: vevent.summary,
            location: vevent.location ? vevent.location.toString() : "Microsoft Teams Meeting",
            description: vevent.description,
            startTime: vevent.startDate.toString(),
            endTime: vevent.endDate.toString(),
            rrule: rrule ? rrule.toString() : null,
            exdate: parseExdates(vevent),
            recurrenceId:recurrenceId ? recurrenceId.toString() : null,
            nextOccurrences: nextOccurrences 
        };
    });
}

function parseExdates(vevent) {
    const exdates = vevent.component.getAllProperties('exdate');
    return exdates.map(exdate => {
        // Assuming exdate is in UTC and converting accordingly
        return new Date(exdate.getFirstValue().toJSDate());
    });
}

function getNextOccurrences(vevent, fromDate) {
    try {
        const exdates = parseExdates(vevent).map(date => date.toISOString());
        const rruleProp = vevent.component.getFirstProperty('rrule');
        let occurrences = [];

        if (rruleProp) {
            const rruleData = rruleProp.getFirstValue();
            if (!rruleData.freq) {
                console.error("Frequency (freq) is missing in RRULE:", rruleData);
                return []; // Cannot proceed without a valid frequency
            }

            const ruleSet = new RRuleSet();
            const rruleOptions = {
                freq: RRule[rruleData.freq.toUpperCase()],
                dtstart: vevent.startDate.toJSDate(),
                interval: rruleData.interval || 1,
                until: rruleData.until ? new Date(rruleData.until.toJSDate()) : undefined,
                count: rruleData.count || undefined,
                byweekday: rruleData.parts.BYDAY ? parseByDay(rruleData.parts.BYDAY) : undefined
            };

            // Create the primary rule
            ruleSet.rrule(new RRule(rruleOptions));

            // Get the next three occurrences
            for (let i = 0; i < 7; i++) {
                let next = ruleSet.after(fromDate, false);
                if (!next) break;  // If no more dates are available, exit loop

                occurrences.push({
                    date: next.toISOString(),
                    status: "scheduled"
                });

                fromDate = new Date(next.getTime() + 1000);  // Move past the last found date
            }

            // Check each exception date and update or add to occurrences
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

            // Sort all occurrences by date
            occurrences.sort((a, b) => new Date(a.date) - new Date(b.date));
        }
        return occurrences;
    } catch (error) {
        console.error("Error in getNextOccurrences:", error);
        return [];
    }
}

function parseByDay(byday) {
    if (Array.isArray(byday)) {
        return byday.map(day => RRule[day.toUpperCase()]);
    } else if (typeof byday === 'string') {
        return byday.split(',').map(day => RRule[day.toUpperCase()]);
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
