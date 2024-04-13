const fetch = require('node-fetch');
const ical2json = require('ical2json');
const fs = require('fs');
const path = require('path');

const ICS_URL = process.env.ICS_URL; // Use the environment variable
const DIR_PATH = './ical';
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

function convertToJSON(icsData) {
    try {
        return ical2json.convert(icsData); // Ensure this function returns data immediately
    } catch (error) {
        console.error('Error converting ICS to JSON:', error);
        return null; // Return null to indicate failure
    }
}

async function main() {
    try {
        ensureDirectoryExists(ICS_OUTPUT_FILE);

        const icsData = await fetchICS();
        fs.writeFileSync(ICS_OUTPUT_FILE, icsData);
        console.log('ICS file has been downloaded and saved.');

        const jsonData = convertToJSON(icsData);
        console.log('Converted JSON Data:', JSON.stringify(jsonData, null, 2));  // Log the JSON data
        if (jsonData) {
            fs.writeFileSync(JSON_OUTPUT_FILE, JSON.stringify(jsonData, null, 2));
            console.log('ICS data has been converted to JSON and saved.');
        } else {
            console.log('Failed to convert ICS to JSON.');
        }
        
    } catch (error) {
        console.error('Error processing ICS file:', error);
    }
}

main();
