const fetch = require('node-fetch');
const ical2json = require('ical2json');
const fs = require('fs');
const path = require('path');

const ICS_URL = process.env.ICS_URL; // Environment variable for the ICS URL
const DIR_PATH = './ical';
const ICS_OUTPUT_FILE = path.join(DIR_PATH, 'calendar.ics');
const JSON_OUTPUT_FILE = path.join(DIR_PATH, 'calendar.json');

function ensureDirectoryExists(filePath) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExists(dirname);  // Make sure the directory exists
    fs.mkdirSync(dirname);
}

async function fetchICS() {
    const response = await fetch(ICS_URL);
    const data = await response.text();
    return data;
}

function convertToJSON(icsData) {
    return ical2json.convert(icsData);
}

async function main() {
    try {
        ensureDirectoryExists(ICS_OUTPUT_FILE);  // Ensure directory exists before writing

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
