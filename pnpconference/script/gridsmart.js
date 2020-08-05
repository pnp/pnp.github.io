if (typeof sessionize === 'undefined') {
    var sessionize = {};
}

sessionize.loader = function() {
    var z, i, elmnt, file, xhttp;
    var counter = 0;
    z = document.querySelectorAll('[data-sessionize-load-url]');
    for (i = 0; i < z.length; i++) {
        elmnt = z[i];
        file = elmnt.getAttribute("data-sessionize-load-url");
        if (file) {
            xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState === 4 && this.status === 200) {
                    counter++;
                    elmnt.innerHTML = this.responseText;
                    elmnt.removeAttribute("data-sessionize-load-url");

                    if (counter === z.length) {
                        sessionize.onLoad();
                    }
                }
            }
            xhttp.open("GET", file, true);
            xhttp.send();
            return;
        }
    }

};

if (typeof sessionize.loaderLoaded === 'undefined') {
    sessionize.loaderLoaded = true;
    document.addEventListener("DOMContentLoaded", function(event) {
        sessionize.loader();
    });
}

"use strict";
var _slicedToArray = function() {
        function n(n, t) {
            var r = [],
                u = !0,
                f = !1,
                e = undefined,
                i, o;
            try {
                for (i = n[Symbol.iterator](); !(u = (o = i.next()).done); u = !0)
                    if (r.push(o.value), t && r.length === t) break
            } catch (s) {
                f = !0;
                e = s
            } finally {
                try {
                    !u && i["return"] && i["return"]()
                } finally {
                    if (f) throw e;
                }
            }
            return r
        }
        return function(t, i) {
            if (Array.isArray(t)) return t;
            if (Symbol.iterator in Object(t)) return n(t, i);
            throw new TypeError("Invalid attempt to destructure non-iterable instance");
        }
    }(),
    sessionize;
typeof sessionize == "undefined" && (sessionize = {});
sessionize.showModal = function(n, t, i) {
    var r = document.getElementById("sz-modal-container"),
        u = new XMLHttpRequest;
    return r.innerHTML = '<div class="sz-modal-overlay"><div class="sz-spinner"><\/div><\/div>', r.classList.remove("is-hidden"), u.onreadystatechange = function() {
        var t, n;
        if (this.readyState === 4 && this.status === 200) {
            for (r.innerHTML = this.responseText, r.classList.remove("is-hidden"), t = document.getElementsByClassName("sz-modal__close-on-click"), n = 0; n < t.length; n++) t[n].onclick = function() {
                document.getElementById("sz-modal-container").classList.add("is-hidden")
            };
            sessionize.getLocalTimes()
        } else(this.status === 404 || this.status === 500) && r.classList.add("is-hidden")
    }, u.open("POST", "https://sessionize.com/api/v2/" + n + "/" + t + "?id=" + i, !0), u.send(), !1
};
sessionize.initTabs = function() {
    var i = document.getElementsByClassName("sz-tab-container"),
        t, n;
    if (i.length > 1) {
        for (n = 0; n < i.length; n++) i[n].classList.remove("sz-tab-container--active");
        for (t = document.getElementsByClassName("sz-tabs__item"), t.length > 0 && t[0].classList.add("sz-tabs__item--active"), sessionize.tabChanged(), n = 0; n < t.length; n++) t[n].children[0].onclick = sessionize.tabChange
    }
};
sessionize.tabChange = function(n) {
    for (var t, r, u = document.getElementsByClassName("sz-tabs__item"), i = 0; i < u.length; i++) u[i].classList.remove("sz-tabs__item--active");
    if (t = undefined, n instanceof Event) t = n.target.parentElement;
    else if (n && n.indexOf("#") === 0) {
        if (r = document.querySelector('.sz-tabs__link[href="' + n + '"]'), !r) return console.error("Hash " + n + ' is invalid. Run "sessionize.help()" in the console to get the list of valid hashes.'), !1;
        t = r.parentElement
    }
    return t.classList.add("sz-tabs__item--active"), sessionize.tabChanged(), !1
};
sessionize.tabChanged = function() {
    var i = document.getElementsByClassName("sz-tabs__item--active"),
        t, n, r;
    if (i.length > 0) {
        for (t = document.getElementsByClassName("sz-tab-container"), n = 0; n < t.length; n++) t[n].classList.remove("sz-tab-container--active");
        r = i[0].children[0].href.split("#")[1];
        document.getElementById(r).classList.add("sz-tab-container--active")
    }
};
sessionize.help = function() {
    var n = [],
        h, c, u, i, v, r, k;
    n.push("---------------------");
    n.push("SESSIONIZE EMBED HELP");
    n.push("---------------------");
    n.push("");
    h = Array.prototype.slice.call(document.querySelectorAll(".sz-tabs__link[href]"));
    c = h.map(function(n) {
        return "  " + n.hash + " = " + n.innerText
    }).join("\n");
    n.push("DEFAULT GROUP SELECTION ON LOAD");
    n.push("Add hash to URL and preselect a tab:");
    n.push(c);
    n.push("");
    n.push("OPEN SESSION/SPEAKER MODAL ON LOAD");
    n.push("Add hash to URL:");
    n.push("  #sz-session-<session_id> (e.g. #sz-session-00000000-1111-2222-3333-444444444444)");
    n.push("  #sz-speaker-<speaker_guid> (e.g. #sz-session-12345)");
    n.push("");
    var g = Array.prototype.slice.call(document.querySelectorAll(".sz-tag")),
        nt = g.map(function(n) {
            var t = "";
            return n.classList.forEach(function(n) {
                n !== "sz-tag" && n.lastIndexOf("sz-tag_", 0) === 0 && (t = n)
            }), {
                tag: n.innerText,
                "class": t
            }
        }),
        t = {};
    nt.sort(function(n, t) {
        return n["class"] > t["class"] ? 1 : -1
    }).forEach(function(n) {
        t[n["class"]] = n.tag
    });
    u = Object.keys(t).length === 0;
    n.push("SESSION STYLING");
    n.push("Style CSS classes to highlight sessions:");
    var f = !0,
        l = !1,
        a = undefined;
    try {
        for (i = Object.entries(t)[Symbol.iterator](); !(f = (v = i.next()).done); f = !0) {
            var y = _slicedToArray(v.value, 2),
                e = y[0],
                o = y[1];
            n.push("  #sessionize .sz-session." + e + " { /* style for " + o + " */ }");
            n.push("  #sessionize .sz-session." + e + " .sz-session__card { /* style for " + o + " for SMART GRID VIEW */ }")
        }
    } catch (p) {
        l = !0;
        a = p
    } finally {
        try {
            !f && i["return"] && i["return"]()
        } finally {
            if (l) throw a;
        }
    }
    u && n.push("  (none available)");
    n.push("");
    n.push("CATEGORY STYLING");
    n.push("Style CSS classes to highlight categories:");
    var s = !0,
        w = !1,
        b = undefined;
    try {
        for (r = Object.entries(t)[Symbol.iterator](); !(s = (k = r.next()).done); s = !0) {
            var d = _slicedToArray(k.value, 2),
                e = d[0],
                o = d[1];
            n.push("  #sessionize .sz-tag." + e + " { /* style for " + o + " */ }")
        }
    } catch (p) {
        w = !0;
        b = p
    } finally {
        try {
            !s && r["return"] && r["return"]()
        } finally {
            if (w) throw b;
        }
    }
    u && n.push("  (none available)");
    n.push("");
    console.log(n.join("\n"))
};
sessionize.timeMode = "local";
sessionize.getLocalTimes = function() {
    var u, f, n, t, i, r;
    try {
        u = Intl.DateTimeFormat().resolvedOptions().timeZone;
        sessionize.localCityName = u.split("/")[1].replace(new RegExp("_", "g"), " ")
    } catch (e) {
        console.error(e);
        sessionize.showLocalTimezone = !1
    }(f = document.getElementsByClassName("sz-timezone"), f.length > 1 && (console.error("Invalid number of .sz-timezone elements"), sessionize.showLocalTimezone = !1), sessionize.showLocalTimezone) && (n = document.querySelectorAll("[data-sztz]"), t = [], n.forEach(function(n) {
        t.includes(n.dataset.sztz) || t.push(n.dataset.sztz);
        n.style.opacity = 0
    }), i = new XMLHttpRequest, r = new FormData, r.append("timezone", u), r.append("values", t), i.onreadystatechange = function() {
        if (this.readyState === 4 && this.status === 200) {
            var t = JSON.parse(this.responseText);
            sessionize.localTimezone = t.localTimezone;
            sessionize.hasDifferentTimes = !1;
            n.forEach(function(n) {
                n.dataset.sztzE = n.innerText;
                n.dataset.sztzL = t.values[n.dataset.sztz];
                n.style.opacity = 1;
                n.removeAttribute("data-sztz");
                n.dataset.sztzE !== n.dataset.sztzL && (sessionize.hasDifferentTimes = !0)
            });
            sessionize.hasDifferentTimes && (sessionize.showTimes(sessionize.timeMode), sessionize.eventCityName && sessionize.localCityName && document.querySelector(".sz-timezone") && (document.querySelector(".sz-timezone .sz-timezone__radio--local .sz-timezone__name").innerText = sessionize.localCityName, document.querySelector(".sz-timezone .sz-timezone__radio--local .sz-timezone__tooltip").innerText = sessionize.localTimezone, document.querySelector('.sz-timezone .sz-timezone__radio--local input[type="radio"]').onchange = function() {
                sessionize.showTimes("local")
            }, document.querySelector(".sz-timezone .sz-timezone__radio--event .sz-timezone__name").innerText = sessionize.eventCityName, document.querySelector(".sz-timezone .sz-timezone__radio--event .sz-timezone__tooltip").innerText = sessionize.eventTimezone, document.querySelector('.sz-timezone .sz-timezone__radio--event input[type="radio"]').onchange = function() {
                sessionize.showTimes("event")
            }, document.querySelector(".sz-timezone").style.display = ""))
        } else(this.status === 404 || this.status === 500) && n.forEach(function(n) {
            n.style.opacity = 1
        })
    }, i.open("POST", "https://sessionize.com/api/v2/sztz", !0), i.send(r))
};
sessionize.showTimes = function(n) {
    var t;
    sessionize.timeMode = n;
    n === "event" ? (t = document.querySelectorAll("[data-sztz-e]"), t.forEach(function(n) {
        return n.innerText = n.dataset.sztzE
    })) : n === "local" && (t = document.querySelectorAll("[data-sztz-l]"), t.forEach(function(n) {
        return n.innerText = n.dataset.sztzL
    }))
};
sessionize.onLoad = function() {
    var n;
    sessionize.initTabs();
    sessionize.getLocalTimes();
    window.location.hash && window.location.hash.lastIndexOf("#sz-tab-", 0) === 0 ? sessionize.tabChange(window.location.hash) : window.location.hash && window.location.hash.lastIndexOf("#sz-speaker-", 0) === 0 ? (n = window.location.hash.substr(12), sessionize.showModal("e3qsj4zg", "speaker", n)) : window.location.hash && window.location.hash.lastIndexOf("#sz-session-", 0) === 0 && (n = window.location.hash.substr(12), sessionize.showModal("e3qsj4zg", "session", n));
    sessionize.event && window.dispatchEvent(sessionize.event)
};
typeof Event == "function" && (sessionize.event = new Event("sessionize.onload"));
typeof sessionize.loader == "undefined" && (window.onload = sessionize.onLoad);

sessionize.eventTimezone = 'UTC +1';
sessionize.eventCityName = '';
sessionize.showLocalTimezone = true;