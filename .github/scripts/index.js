const fetch = require('node-fetch');
const ical = require('ical.js');
const fs = require('fs');
const path = require('path');

const ICS_URL = process.env.ICS_URL; // Use the environment variable
let dirPath;
if (process.argv.includes('--action')) {
    // If the script is being run as a GitHub Actions workflow
    dirPath = '../../';
} else {
    // If the script is being run locally
    dirPath = './static/';
}


const ICS_OUTPUT_FILE = path.join(dirPath, 'calendar.ics');
const ICS_ORIGINAL_FILE = path.join(dirPath, 'ical/calendar-original.ics');
const JSON_OUTPUT_FILE = path.join(dirPath, 'ical/calendar.json');

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
        while ((next = expand.next())) {

            const jsDate = next.toJSDate();
            const isoDate = jsDate.toISOString();

            const today = new Date();
            const day = today.getDay();
            const diff = today.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is Sunday
            const thisMonday = new Date(today.setDate(diff));
            thisMonday.setHours(0, 0, 0, 0); // Set the time to midnight

            if (jsDate > thisMonday) {
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
                const matchingOccurrence = matchingEvent.nextOccurrences.find(occurrence => occurrence.date.startsWith(utcDate));

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
    const regex = /(?:Click here to join the meeting|Join the meeting now)<([^>]+)>/;

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

    fs.writeFileSync(ICS_ORIGINAL_FILE, icsData);

    // Add Location if not present

    icsData = icsData.replace(/^LOCATION:$/gm, 'LOCATION:Microsoft Teams Meeting');

    // Make all meetings online by default
    icsData = icsData.replace(/X-MICROSOFT-REQUESTEDATTENDANCEMODE:DEFAULT/g, 'X-MICROSOFT-REQUESTEDATTENDANCEMODE:ONLINE');

    // Save the ICS data to a file
    fs.writeFileSync(ICS_OUTPUT_FILE, icsData);
    console.log('ICS file has been downloaded and saved.');

    let { mappedEvents, updatedIcsData } = parseAndConvertICALToJSON(icsData);

    // Update the DESCRIPTION property with custom HTML
    updatedIcsData = updateDescription(updatedIcsData);

    // Save the updated ICS data to a file
    fs.writeFileSync(ICS_OUTPUT_FILE, updatedIcsData);
    console.log('Updated ICS file has been saved.');

    // Create a JSON file with the mapped events
    const jsonData = {
        lastRetrieved: new Date().toISOString(), // Add a timestamp
        events: mappedEvents
    };

    // Save the JSON data to a file
    if (jsonData.events) {
        fs.writeFileSync(JSON_OUTPUT_FILE, JSON.stringify(jsonData, null, 2));
        console.log('ICS data has been converted to JSON and saved.');
        console.log('The file has been saved at: ', path.resolve(JSON_OUTPUT_FILE));
    } else {
        console.log('Failed to convert ICAL to JSON or JSON is empty.');
    }
}

function foldICSLine(propertyName, propertyValue, stripTags = true) {
    // Normalize the input
    propertyValue = propertyValue.trim();
    propertyValue = propertyValue.replace(/\r?\n/g, ' '); // Replace newlines with spaces
    propertyValue = propertyValue.replace(/\s+/g, ' '); // Collapse multiple spaces

    if (stripTags) {
        propertyValue = propertyValue.replace(/<\/?[^>]+(>|$)/g, ""); // Strip HTML tags
    }

    // Prepend the property name and a colon
    const fullLine = propertyName + ':' + propertyValue;
    const maxLength = 75;
    let result = [];

    // Start folding lines
    let offset = 0;
    while (offset < fullLine.length) {
        let limit = maxLength;
        if (offset !== 0) limit -= 1; // Adjust for the space at the start of continuation lines

        let segment = fullLine.substring(offset, offset + limit);
        if (offset !== 0) segment = ' ' + segment; // Add a space at the beginning of each continuation line

        result.push(segment);
        offset += limit;
    }

    return result.join('\r\n'); // Join all segments with CRLF
}

function updateDescription(text) {
    const lines = text.split(/\r\n|\n/);
    let newLines = [];
    let capturing = false;
    let description = '';

    lines.forEach(line => {
        if (line.startsWith('DESCRIPTION:')) {
            capturing = true;
            description += line.substring(12);
        } else if (capturing && line.startsWith(' ')) {
            description += line.substring(1);
        } else {
            if (capturing) {
                //console.log("Full Description: ", description); // Log the full description
                newLines.push(foldICSLine('DESCRIPTION', description, false));
                newLines.push(foldICSLine('X-ALT-DESC;FMTTYPE=text/html', createHTMLDescription(description), false));
                description = '';
                capturing = false;
            } else {
                newLines.push(line);
            }
        }
    });

    return newLines.join('\r\n');
}

// Create a custom HTML description
function createHTMLDescription(description) {

    // Replace un-tampered team meetings
    const teamsMeetingRegex = /\\nMicrosoft Teams Need help\?<([^>]+)>\\n/g;
    description = description.replace(teamsMeetingRegex, (_match, url) => {
        // You can use the captured URL here
        const customText = `<div style="margin-bottom:12px"><span class="x_me-email-text" style="font-size:24px; font-weight:700; margin-right:12px">Microsoft Teams</span><a href="https://aka.ms/JoinTeamsMeeting?omkt=en-US" target="_blank" rel="noopener noreferrer" data-auth="NotApplicable" id="x_meet_invite_block.action.help" class="x_me-email-link" style="font-size:14px; text-decoration:underline; color:#5B5FC7">Need help?</a> </div>`;
        return customText;
    });

    // Replace the Join link for regular teams meetings
    const joinRegex = /Join the meeting now<([^>]+)>\\n/;
    const joinMatch = description.match(joinRegex);

    if (joinMatch) {
        const url = joinMatch[1];
        const joinCustomText = `<div style="margin-bottom:6px"><a href="${url}" target="_blank" rel="noreferrer noopener" data-auth="NotApplicable" id="x_meet_invite_block.action.join_link" class="x_me-email-headline" style="font-size:20px; font-weight:600; text-decoration:underline; color:#5B5FC7">Join the meeting now</a> </div>`;
        description = description.replace(joinRegex, joinCustomText);
    }

    // Replace the meeting ID
    const meetingIdRegex = /Meeting ID: ([\d\s]+)/;
    const meetingIdMatch = description.match(meetingIdRegex);

    if (meetingIdMatch) {
        const meetingId = meetingIdMatch[1];
        console.log(meetingId);  // Outputs: 381 265 467 057

        const meetingIdLine = `<div style="margin-bottom:6px"><span class="x_me-email-text-secondary" style="font-size:14px;">Meeting ID:</span><span class="x_me-email-text" style="font-size:14px;">${meetingId}</span></div>`
        description = description.replace(meetingIdRegex, meetingIdLine);
    }

    // Replace the passcode
    const passcodeRegex = /Passcode: ([^\\]+)/;
    const passcodeMatch = description.match(passcodeRegex);

    if (passcodeMatch) {
        const passcode = passcodeMatch[1];
        const passcodeLine = `<div style="margin-bottom:24px"><span class="x_me-email-text-secondary" style="font-size:14px; ">Passcode:</span><span class="x_me-email-text" style="font-size:14px; ">${passcode}</span></div>`;
        description = description.replace(passcodeRegex, passcodeLine);
    }

    // Replace the Teams divider lines with a horizontal rule
    description = description.replace(/_{80,}/g, '<div style="margin-bottom:24px; overflow:hidden; white-space:nowrap">________________________________________________________________________________</div>');

    // Replace the separator line
    const separatorRegex = /\\n_{32}\\n/;
    const separatorMatch = description.match(separatorRegex);

    if (separatorMatch) {
        const separatorLine = `<div style="margin-bottom:24px; max-width:532px"><hr style="border:0; background:#D1D1D1; height:1px"></div>`;
        description = description.replace(separatorRegex, separatorLine);
    }

    // Replace the "Dial-in by phone" section
    const dialInSectionRegex = /Dial-in by phone\\n[\s\S]*Reset dial-in PIN<[^>]+>\\n/;
    const dialInSectionMatch = description.match(dialInSectionRegex);

    if (dialInSectionMatch) {
        const dialInSection = dialInSectionMatch[0];
        description = description.replace(dialInSectionRegex, '');
    }


    // Replace the PnP teams meetings descriptions
    description = description.replace(/\\nMicrosoft Teams meeting\\n/g, `<div style="margin-bottom:12px"><span class="x_me-email-text" style="font-size:24px; font-weight:700; margin-right:12px">Microsoft Teams</span><a href="https://aka.ms/JoinTeamsMeeting?omkt=en-US" target="_blank" rel="noopener noreferrer" data-auth="NotApplicable" id="x_meet_invite_block.action.help" class="x_me-email-link" style="font-size:14px; text-decoration:underline;">Need help?</a> </div>`);

    // Replace the Join link
    description = description.replace(/\\nJoin on your computer\\, mobile app or room device\\n/g, '');
    description = description.replace(/Join on your computer\\, mobile app or room device/g, '');

    const regex = /(\\n)?Click here to join the meeting<([\s\S]+?)>(<[\s\S]+>)?(\\n)?/g;
    description = description.replace(regex, (_match, _p1, url, _p3, _p4) => {
        // You can use the captured URL here
        const customText = `<div style="margin-bottom:6px"><a href="${url}" target="_blank" rel="noreferrer noopener" data-auth="NotApplicable" id="x_meet_invite_block.action.join_link" class="x_me-email-headline" style="font-size:20px; font-weight:600; text-decoration:underline; color:#5B5FC7">Join the meeting now</a> </div>`;
        return customText;
    });

    // replace two newlines with a paragraph tag
    description = description.replace(/\\n\\n/g, '</p><p>');

    // TODO: Put this back in
    //description = convertMarkdownLinksToHTML(description);

    return `<html><body style="font-family:Aptos,Aptos_EmbeddedFont,Aptos_MSFontService,Calibri,Helvetica,sans-serif; font-size:12pt;"><p>${description}</p></body></html>`;
}

function convertMarkdownLinksToHTML(text) {
    const regex = /<(https?:\/\/[\s\S]+?)>/g;

    return text.replace(regex, '<a href="$1">$1</a>');
}


main();
