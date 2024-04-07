if (typeof spSessionize === 'undefined') {
    var spSessionize = {};
}

spSessionize.loader = function() {
    var xhttp;
    var file = "https://sessionize.com/api/v2/q5k10ol1/view/Speakers";
    if (file) {
        xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            var t = JSON.parse(this.responseText);
            spSessionize.showSpeakers(t);
        }
    }
    xhttp.open("GET", file, true);
    xhttp.send();
    return;
    }

};

if (typeof spSessionize.loaderLoaded === 'undefined') {
    spSessionize.loaderLoaded = true;
    document.addEventListener("DOMContentLoaded", function (event) { spSessionize.loader(); });
}

"use strict";
typeof spSessionize == "undefined" && (spSessionize = {});
spSessionize.showModal = function(n, t, i) {
    var r = document.getElementById("sz-modal-container"),
        u = new XMLHttpRequest;
    return r.innerHTML = '<div class="sz-modal-overlay"><div class="sz-spinner"><\/div><\/div>', r.classList.remove("is-hidden"), u.onreadystatechange = function() {
        var t, n;
        if (this.readyState === 4 && this.status === 200) {
            for (r.innerHTML = this.responseText, r.classList.remove("is-hidden"), t = document.getElementsByClassName("sz-modal__close-on-click"), n = 0; n < t.length; n++) t[n].onclick = function() {
                document.getElementById("sz-modal-container").classList.add("is-hidden")
            };
            spSessionize.getLocalTimes()
        } else(this.status === 404 || this.status === 500) && r.classList.add("is-hidden")
    }, u.open("POST", "https://sessionize.com/api/v2/" + n + "/" + t + "?id=" + i, !0), u.send(), !1
};
spSessionize.timeMode = "local";
spSessionize.getLocalTimes = function() {
    var u, f, n, t, i, r;
    try {
        u = Intl.DateTimeFormat().resolvedOptions().timeZone;
        spSessionize.localCityName = u.split("/")[1].replace(new RegExp("_", "g"), " ")
    } catch (e) {
        console.error(e);
        spSessionize.showLocalTimezone = !1
    }(f = document.getElementsByClassName("sz-timezone"), f.length > 1 && (console.error("Invalid number of .sz-timezone elements"), spSessionize.showLocalTimezone = !1), spSessionize.showLocalTimezone) && (n = document.querySelectorAll("[data-sztz]"), t = [], n.forEach(function(n) {
        t.includes(n.dataset.sztz) || t.push(n.dataset.sztz);
        n.style.opacity = 0
    }), i = new XMLHttpRequest, r = new FormData, r.append("timezone", u), r.append("values", t), i.onreadystatechange = function() {
        if (this.readyState === 4 && this.status === 200) {
            var t = JSON.parse(this.responseText);
            spSessionize.localTimezone = t.localTimezone;
            spSessionize.hasDifferentTimes = !1;
            n.forEach(function(n) {
                n.dataset.sztzE = n.innerText;
                n.dataset.sztzL = t.values[n.dataset.sztz];
                n.style.opacity = 1;
                n.removeAttribute("data-sztz");
                n.dataset.sztzE !== n.dataset.sztzL && (spSessionize.hasDifferentTimes = !0)
            });
            spSessionize.hasDifferentTimes && (spSessionize.showTimes(spSessionize.timeMode), spSessionize.eventCityName && spSessionize.localCityName && document.querySelector(".sz-timezone") && (document.querySelector(".sz-timezone .sz-timezone__radio--local .sz-timezone__name").innerText = spSessionize.localCityName, document.querySelector(".sz-timezone .sz-timezone__radio--local .sz-timezone__tooltip").innerText = spSessionize.localTimezone, document.querySelector('.sz-timezone .sz-timezone__radio--local input[type="radio"]').onchange = function() {
                spSessionize.showTimes("local")
            }, document.querySelector(".sz-timezone .sz-timezone__radio--event .sz-timezone__name").innerText = spSessionize.eventCityName, document.querySelector(".sz-timezone .sz-timezone__radio--event .sz-timezone__tooltip").innerText = spSessionize.eventTimezone, document.querySelector('.sz-timezone .sz-timezone__radio--event input[type="radio"]').onchange = function() {
                spSessionize.showTimes("event")
            }, document.querySelector(".sz-timezone").style.display = ""))
        } else(this.status === 404 || this.status === 500) && n.forEach(function(n) {
            n.style.opacity = 1
        })
    }, i.open("POST", "https://sessionize.com/api/v2/sztz", !0), i.send(r))
};
spSessionize.showSpeakers = function(speakers) {
    // console.log("Speakers", speakers);

    var c = document.getElementById("speakerinner");

    speakers.forEach(function(speaker) {
    //    console.log("Speaker", speaker);
    //    console.log("SpeakerID", speaker.id);
    //    console.log("Full Name", speaker.fullName);
    //    console.log("Bio", speaker.bio);
    //    console.log("Profile Picture", speaker.profilePicture);
    //    console.log("Tag Line", speaker.tagLine);
    //    speaker.sessions.forEach(function(session) {
    //     console.log("Session", session.id, session.name);
    //    });

    //    var e = document.createElement(`<div class="people-card w-inline-block">
    //    <div class="card no-border">
    //      <div class="card-head no-border">
    //        <div class="row row-align-center"><img src="./images/team/alexterentiev.jpg" alt="Alex Terentiev"
    //            class="avatar avatar-small"></div>
    //        <div class="row row-align-center">
    //          <div class="card-text">
    //            <div class="h6-small">Alex Terentiev</div>
    //            <div class="text-small">SharePointalist</div>
    //          </div>
    //        </div>
    //        <div class="row row-align-center">
    //          <div class="social-links-container">
    //            <a href="https://github.com/AJIXuMuK" class="social-link w-inline-block" title="GitHub">
    //              <div class="fdml social"></div>
    //            </a>
    //            <a href="https://twitter.com/alexaterentiev" class="social-link first w-inline-block"
    //              title="Twitter">
    //              <div class="fdml social"></div>
    //            </a>
    //          </div>
    //        </div>
    //      </div>
    //    </div>
    //  </div>`);
    
    var twitterLink = "";
    speaker.links.forEach(function(link){
        if (link.linkType === "Twitter") {
         twitterLink = link.url;   
        }
    });
    // console.log("Twitter link", twitterLink);

    var x = document.createElement("div");
    x.className = "layout-content-card-light w-inline-block";
    //x.href = "#";
    x.innerHTML = `<div class="text_wrap speaker">
        <div class="top-icon">
        <img src="`+ speaker.profilePicture +`" alt="`+ speaker.fullName +`" class="avatar avatar-small">
        </div>
        <h3 class="h3-heading black">`+ speaker.fullName +`</h3>
        <h4 class="speakertagline">`+ speaker.tagLine +`</h4>
        <a href="`+ twitterLink +`" class="social-link w-inline-block" title="Twitter">
        <div class="fdml social"></div>
    </a>    
        <p class="text-transparent black">`+ speaker.bio +`</p>
    </div>`;
    
    speaker.sessions.forEach(function(session){
        var d = document.createElement("a");
        d.href = "#";
        d.onclick = function(){
            return sessionize.showModal('e3qsj4zg', 'session', this.id);
        };
        d.id = session.id;
        d.className = "button-wrapper";
        d.innerHTML = `<div class="fdml button-arrow-2"></div>
        <div class="button-text">`+ session.name +`</div>`;
        x.appendChild(d);
    });
    

        c.appendChild(x);
    });    
}
spSessionize.showTimes = function(n) {
    var t;
    spSessionize.timeMode = n;
    n === "event" ? (t = document.querySelectorAll("[data-sztz-e]"), t.forEach(function(n) {
        return n.innerText = n.dataset.sztzE
    })) : n === "local" && (t = document.querySelectorAll("[data-sztz-l]"), t.forEach(function(n) {
        return n.innerText = n.dataset.sztzL
    }))
};
spSessionize.onLoad = function() {
    var n;
    spSessionize.getLocalTimes();
};
typeof Event == "function" && (spSessionize.event = new Event("spSessionize.onload"));
typeof spSessionize.loader == "undefined" && (window.onload = spSessionize.onLoad);

spSessionize.eventTimezone = 'UTC +1';
spSessionize.eventCityName = '';
spSessionize.showLocalTimezone = true;