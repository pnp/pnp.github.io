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
    }
}

async function fetchICS() {
    const response = await fetch(ICS_URL);
    const data = await response.text();
    return data;
}

function parseAndConvertICALToJSON(icsData) {
    try {
        const jcal = ICAL.parse(icsData);
        const comp = new ICAL.Component(jcal);
        const events = comp.getAllSubcomponents('vevent');
        const jsonData = events.map(event => {
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
        return jsonData;
    } catch (error) {
        console.error('Error converting ICAL to JSON:', error);
        return null; // Return null to indicate failure
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
        fs.writeFileSync(ICS_OUTPUT_FILE, icsData);
        console.log('ICS file has been downloaded and saved.');

        const jsonData = parseAndConvertICALToJSON(icsData);
        if (jsonData) {
            fs.writeFileSync(JSON_OUTPUT_FILE, JSON.stringify(jsonData, null, 2));
            console.log('ICS data has been converted to JSON and saved.');
        } else {
            console.log('Failed to convert ICAL to JSON.');
        }
    } catch (error) {
        console.error('Error processing ICS file:', error);
    }
}

main();
