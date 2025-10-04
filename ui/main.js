

mapboxgl.accessToken = 'pk.eyJ1IjoiaGVraW5hdiIsImEiOiJjbTM3Y3EwODUwN2NjMmxyMXNlNXAybDFoIn0.VP3wmKBE40PRLC1l1rBJBQ';

const DIGITRANSIT_KEY = "bbc7a56df1674c59822889b1bc84e7ad"

const sidebar = document.getElementById("sidebar")

let busMarker
let busTextMarker

let data = {
    user: {
        user_id: "N/A",
        user_name: "N/A"
    },
    trip: {
        long_name: "N/A",
        short_name: "N/A",
        next_stop_name: "N/A",
        next_stop_code: "N/A"
    }
}

const COLOR_TABLE = {
    bus: '#007ac9',
    busExpress: '#CA4000',
    busLocal: '#007ac9',
    rail: '#8c4799',
    tram: '#008151',
    ferry: '#007A97',
    metro: '#CA4000',
    subway: '#CA4000',
    speedtram: '#007E79',
    replacementBus: '#DC0451',
}
const API_URL = "http://127.0.0.1:3001/hsl-gambling"

const map = new mapboxgl.Map({
    style: "./data/custom_style.json",
    container: 'map', // container ID
    center: [24.9, 60.2], // starting position [lng, lat]. Note that lat must be set between -90 and 90
    zoom: 10 // starting zoom
});


function replace(template, data) {
    const pattern = /{{\s*(\w+?)\s*}}/g; // {property}
    return template.replace(pattern, (_, token) => data[token] || '');
}
function replaceContent(element) {
    element.innerHTML = replace(element.innerHTML, data[element.getAttribute("data-replace")])
}
function sideBarMode(mode) {
    sidebar.querySelectorAll("div.view").forEach(view => {
        view.hidden = view.id != mode
        if (view.id == mode)
            view.querySelectorAll(".replace").forEach(replaceContent)
    })
}
async function newUser() {
    sideBarMode("creating_user")
    const response = await fetch(API_URL + "/new_user")
    const userData = await response.json()
    data.user.user_id = userData.id
    data.user.user_name = userData.name
    localStorage.setItem("user", JSON.stringify(data.user))
    sideBarMode("main")
}
function game() {
    sideBarMode("game_loading")
    const gameSocket = new WebSocket(API_URL + "/game")
    gameSocket.addEventListener("message", (e) => {
        const serverData = JSON.parse(e.data)
        if (serverData.error) {
            sideBarMode("loading_error")
            console.error(serverData.error)
        } else {
            sideBarMode("loading_trip")
            getTripData(serverData.tripId).then(tripData => {
                const date = new Date(Date.now())
                const now = date.getHours() * 3600 + date.getMinutes() * 60
                const next_stop = tripData.stoptimesForDate.find(t => (t.realtimeArrival || t.scheduledArrival) > now + 60)
                data.trip = {
                    long_name: next_stop.headsign,
                    short_name: tripData.route.shortName,
                    color: getRouteColor(tripData.route.type),
                    next_stop_name: next_stop.stop.name,
                    next_stop_code: next_stop.stop.code
                }

                new mapboxgl.Marker()
                    .setLngLat([next_stop.stop.lon, next_stop.stop.lat])
                    .addTo(map);

                map.flyTo({ center: [next_stop.stop.lon, next_stop.stop.lat], zoom: 14 })

                followTrip(serverData.mqttData, [next_stop.stop.lon, next_stop.stop.lat], next_stop.stop.gtfsId, tripData.route.shortName)

                sideBarMode("game")

            })
        }

    })
}

function followTrip(tripData, nextStopLatLng, nextStopId, routeNumber) {
    const marker1 = document.createElement("div")
    marker1.innerHTML = `
<svg width="32" height="32" version="1.1" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
 <g fill="${data.trip.color}">
  <circle cx="8.4666" cy="8.4666" r="6.2203"/>
  <path transform="matrix(1.0131 0 0 .64988 -.11062 2.3631)" d="m13.168 4.5063-9.402-1e-7 4.701-8.1424z"/>
 </g>
</svg>

`
    marker1.id = "busMarker"

    const marker2 = document.createElement("div")
    marker2.innerHTML = `<div class="text-center-custom">
<span style="font-size: ${40 / (routeNumber.length + 1)}px; color: #fff; font-family: 'Gotham Rounded';">${routeNumber}</span>
</div>
`
    marker2.id = "busTextMarker"

    busMarker = new mapboxgl.Marker({
        element: marker1,
        scale: 0.5
    })
        .setLngLat([0, 0])
        .addTo(map);

    busTextMarker = new mapboxgl.Marker({
        element: marker2,
        scale: 0.5
    })
        .setLngLat([0, 0])
        .addTo(map);


    const client = mqtt.connect("wss://mqtt.hsl.fi:443");

    client.on("connect", () => {
        client.subscribe(`/hfp/v2/journey/ongoing/+/+/+/+/${tripData.rn}/${tripData.di}/+/${tripData.st}/#`, (err) => {
            if (err) console.error(err)
        });
    });

    let first = true
    client.on("message", (topic, message) => {
        const data = JSON.parse(message.toString())
        Object.entries(data).forEach(([updateType, update]) => {
            const latLng = [update.long, update.lat]
            busMarker.setLngLat(latLng)
            busTextMarker.setLngLat(latLng)

            if (update.hdg) {
                busMarker.setRotation(update.hdg)
                marker1.style.setProperty("--rotation", 360 % (360 - update.hdg))
            }

            if (updateType == "ARS" || updateType == "PAS") {
                if ("HSL:"+update.stop == nextStopId) {
                    console.log(updateType == "ARS" ? "STOPPED" : "DIDN'T STOP")
                }
            }
            if (updateType != "VP" || first) {
                map.fitBounds([
                    nextStopLatLng,
                    latLng
                ], {
                    easing: easeInOutQuad,
                    padding: 50,
                    maxZoom: 15
                });
            }
            first = false
        })
    })


}
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : - 1 + (4 - 2 * t) * t;
}

async function getTripData(tripId) {
    const data = await getGraphQl(`
{
  trip(id: "${tripId}") {
    route {
      longName
      shortName
      type
    }
    stoptimesForDate {
      headsign
      realtimeState
      realtimeArrival
      realtimeDeparture
      scheduledDeparture
      scheduledArrival
      stop {
        name
        gtfsId
        code
        lat
        lon
      }
    }
  }
}        
`)
    return data.data.trip
}
if (localStorage.getItem("user")) {
    data.user = JSON.parse(localStorage.getItem("user"))
    sideBarMode("main")
} else {
    sideBarMode("no_user")
}
function getRouteColor(type) {
    switch (type) {
        case 701:
            return COLOR_TABLE.bus
        case 702:
            return COLOR_TABLE.busExpress
        case 109:
            return COLOR_TABLE.rail
        case 0:
            return COLOR_TABLE.tram
        default:
            console.log(type)
            return COLOR_TABLE.replacementBus
    }
}
async function getGraphQl(query) {
    const response = await fetch("https://api.digitransit.fi/routing/v2/hsl/gtfs/v1?digitransit-subscription-key=bbc7a56df1674c59822889b1bc84e7ad", {
        method: "POST",
        headers: {
            "Content-Type": "application/graphql"
        },
        body: query
    })
    return await response.json()
}

