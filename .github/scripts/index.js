const fetch = require('node-fetch');
const ical2json = require('ical2json');
const fs = require('fs');

const ICS_URL = process.env.ICS_URL; // Environment variable for the ICS URL
const ICS_OUTPUT_FILE = './ical/calendar.ics';
const JSON_OUTPUT_FILE = './ical/calendar.json';

async function fetchICS() {
    const response = await fetch(ICS_URL);
    const data = await response.text();
    return data;
}

async function convertToJSON(icsData) {
    return ical2json.convert(icsData);
}

async function main() {
    try {
        // Fetch the ICS file
        const icsData = await fetchICS();
        // Save the ICS file
        fs.writeFileSync(ICS_OUTPUT_FILE, icsData);
        console.log('ICS file has been downloaded and saved.');

        // Convert ICS to JSON
        const jsonData = convertToJSON(icsData);
        // Save the JSON file
        fs.writeFileSync(JSON_OUTPUT_FILE, JSON.stringify(jsonData, null, 2));
        console.log('ICS data has been converted to JSON and saved.');
    } catch (error) {
        console.error('Error processing ICS file:', error);
    }
}

main();
