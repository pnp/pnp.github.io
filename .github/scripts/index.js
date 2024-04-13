const fetch = require('node-fetch');
const { ICAL } = require('ical.js');
const fs = require('fs');
const path = require('path');

const ICS_URL = process.env.ICS_URL; // Use the environment variable
const DIR_PATH = '../../ical'; // Adjusted to point to the 'ical' directory at the root
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
        const data = await response.text();
        return data;
    } catch (error) {
        console.error('Fetch ICS Error:', error);
        return null;
    }
}

function parseAndConvertICALToJSON(icsData) {
    try {
        const jcal = ICAL.parse(icsData);
        const comp = new ICAL.Component(jcal);
        const events = comp.getAllSubcomponents('vevent');
        return events.map(event => {
            const vevent = new ICAL.Event(event);
            return {
                summary: vevent.summary,
                location: vevent.location,
                description: vevent.description,
                startTime: vevent.startDate.toString(),
                endTime: vevent.endDate.toString(),
                rrule: vevent.component.getFirstPropertyValue('rrule') ? vevent.component.getFirstPropertyValue('rrule').toString() : null,
                exdate: parseExdates(vevent),
                recurrenceId: vevent.component.getFirstPropertyValue('recurrence-id') ? vevent.component.getFirstPropertyValue('recurrence-id').toString() : null
            };
        });
    } catch (error) {
        console.error('Error converting ICAL to JSON:', error);
        return null;
    }
}

function parseExdates(vevent) {
    const exdates = vevent.component.getAllProperties('exdate');
    return exdates.map(exdate => exdate.getFirstValue().toString());
}

async function main() {
    try {
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
        } else {
            console.log('Failed to convert ICAL to JSON or JSON is empty.');
        }
    } catch (error) {
        console.error('Error processing ICS file:', error);
    }
}

main();
