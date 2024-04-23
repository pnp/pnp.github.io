if (typeof onAirLinks === 'undefined') {
    var onAirLinks = {};
}

onAirLinks.links = {
    "sessions": [
        {
            "sessionId": "62eb71c3-f49f-44a2-87a4-0a90fc8d9607",
            "onAirLink": "https://aka.ms/PnPVCKeynote"
        },
        {
            "sessionId": "208231",
            "onAirLink": "https://aka.ms/PnPVC01"
        },
        {
            "sessionId": "210845",
            "onAirLink": "https://aka.ms/PnPVC02"
        },
        {
            "sessionId": "207302",
            "onAirLink": "https://aka.ms/PnPVC03"
        },
        {
            "sessionId": "208052",
            "onAirLink": "https://aka.ms/PnPVC04"
        },
        {
            "sessionId": "209037",
            "onAirLink": "https://aka.ms/PnPVC05"
        },
        {
            "sessionId": "208519",
            "onAirLink": "https://aka.ms/PnPVC06"
        },
        {
            "sessionId": "207702",
            "onAirLink": "https://aka.ms/PnPVC07"
        },
        {
            "sessionId": "207381",
            "onAirLink": "https://aka.ms/PnPVC08"
        },
        {
            "sessionId": "212004",
            "onAirLink": "https://aka.ms/PnPVC09"
        },
        {
            "sessionId": "208070",
            "onAirLink": "https://aka.ms/PnPVC10"
        },
        {
            "sessionId": "207191",
            "onAirLink": "https://aka.ms/PnPVC11"
        },
        {
            "sessionId": "211725",
            "onAirLink": "https://aka.ms/PnPVC12"
        },
        {
            "sessionId": "207329",
            "onAirLink": "https://aka.ms/PnPVC13"
        },
        {
            "sessionId": "207944",
            "onAirLink": "https://aka.ms/PnPVC14"
        },
        {
            "sessionId": "208321",
            "onAirLink": "https://aka.ms/PnPVC15"
        },
        {
            "sessionId": "209118",
            "onAirLink": "https://aka.ms/PnPVC16"
        },
        {
            "sessionId": "186d4ab4-8902-4095-971d-0b9e6952ed51",
            "onAirLink": "https://aka.ms/PnPVCAMA"
        }
    ]
};

"use strict";
typeof onAirLinks == "undefined" && (onAirLinks = {});

onAirLinks.showOnAirLinks = function() {

    var sessions = document.getElementsByClassName('sz-session');

    for (var session of sessions) {
        var title = session.getElementsByClassName('sz-session__title');

        var sessionId = session.getAttribute('data-sessionid');
        var sessionLink = '#';

        for (var link of onAirLinks.links.sessions) {
            if (link.sessionId === sessionId) {
                sessionLink = link.onAirLink;
                break;
            }
        }

        var airLink = document.createElement("a");
        airLink.href = sessionLink;
        airLink.className = 'sessionOnAirLink';
        // airLink.id = `airLink`+ sessionId;
        airLink.target = "_blank";
        airLink.style.paddingRight = "5px";
        airLink.style.textDecoration = "none";
        airLink.innerHTML = `<img src="./assets/play-button-small.png" style="width: 30px; height: 30px;" />`;
        
        title[0].insertBefore(airLink, title[0].childNodes[1]);
    }
}
