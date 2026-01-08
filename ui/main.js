

mapboxgl.accessToken = 'pk.eyJ1IjoiaGVraW5hdiIsImEiOiJjbTM3Y3EwODUwN2NjMmxyMXNlNXAybDFoIn0.VP3wmKBE40PRLC1l1rBJBQ';

const DIGITRANSIT_KEY = "bbc7a56df1674c59822889b1bc84e7ad"

const sidebar = document.getElementById("sidebar")

let busMarker
let busTextMarker
let stopMarker

let data = {
    user: {
        user_id: "N/A",
        user_name: "N/A",
        coins: 500
    },
    trip: {
        long_name: "N/A",
        short_name: "N/A",
        next_stop_name: "N/A",
        next_stop_code: "N/A"
    },
    odds: {
        s: 2,
        n: 2,
        m: 2
    },

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
const ICONS = {
    ferry: `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="128 0 64 86.528">
    <g transform="translate(321.52 1.5238) scale(.38095)">
        <circle cx="80" cy="80" r="80" fill="#007e79" stroke="#fff" stroke-width="8"/>
        <path fill="#333" d="M71.692 155.94h16.8v58.8a8.4 8.4 0 1 1-16.8 0z"/>
        <path fill="#fff" d="m109.43 97.194-6.235-43.536c-.415-3.095-2.286-5.779-4.978-7.049-5.728-2.71-11.65-3.73-15.079-4.144v-5.28H94.17a2.96 2.96 0 0 0 0-5.918H66.01a2.96 2.96 0 0 0 0 5.919h11.049v5.279c-3.446.415-9.368 1.435-15.096 4.144-2.692 1.274-4.55 3.958-4.966 7.049L50.763 97.19a21.3 21.3 0 0 0 .893 9.737c.618 1.85 1.774 5.584 2.477 7.408.99 2.574 3.234 4.386 5.782 5.046 4.636 1.203 11.553 2.244 20.176 2.244s15.54-1.041 20.175-2.244c2.553-.66 4.792-2.472 5.783-5.046.703-1.82 1.858-5.554 2.477-7.408a21.3 21.3 0 0 0 .905-9.737zm-5.604 6.101-1.575 4.843c-.402 1.227-1.042 1.532-2.007 1.824-2.188.661-11.442 2.235-20.154 2.299-8.716-.064-17.949-1.638-20.138-2.299-.96-.292-1.6-.597-2.002-1.824l-1.575-4.843c-.36-1.093.546-1.867 1.765-1.537 3.776 1.024 7.972 1.879 11.464 2.565 1.058.208 2.04.864 2.502 1.808.542 1.109 1.625 1.871 2.785 1.943a84 84 0 0 0 10.393 0c1.16-.072 2.244-.838 2.785-1.943.466-.944 1.448-1.6 2.502-1.808 3.489-.686 7.705-1.541 11.477-2.565 1.223-.33 2.129.444 1.769 1.537zm-2.405-8.459c-5.025 1.609-13.013 3.357-21.327 3.357s-16.298-1.744-21.319-3.357a2.396 2.396 0 0 1-1.638-2.625l4.407-30.785a2.395 2.395 0 0 1 1.888-2.007c4.331-.897 10.232-1.73 16.662-1.73s12.344.833 16.675 1.73a2.4 2.4 0 0 1 1.888 2.007l4.407 30.785a2.4 2.4 0 0 1-1.639 2.625zm-4.284 29.714c-2.091.428-4.436.767-6.824 1.025 0 0 4.538 5.402 5.728 6.824 1.536 1.833 2.785 2.422 4.546 2.422 1.994 0 3.768-1.474 1.668-4.094-1.029-1.287-5.118-6.177-5.118-6.177m-34.078 0c2.092.428 4.437.767 6.824 1.025 0 0-4.538 5.402-5.727 6.824-1.537 1.833-2.786 2.422-4.547 2.422-1.994 0-3.767-1.474-1.668-4.094 1.03-1.287 5.118-6.177 5.118-6.177"/>
    </g>
</svg>`,
    bus: `
<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="64 0 64 86.528">
    <g transform="matrix(4 0 0 4 67.2 3.2)">
        <circle cx="7.2" cy="7.2" r="7.6" fill="#007ac9" stroke="#fff" stroke-width=".8"/>
        <path fill="#fff" d="M10.88 12.088H3.6a1.247 1.247 0 0 1-1.247-1.248V3.56c0-.69.558-1.248 1.248-1.248h7.28c.689 0 1.248.559 1.248 1.248v7.28c0 .69-.56 1.248-1.248 1.248"/>
        <path fill="#007ac9" d="M2 3.288A1.3 1.3 0 0 1 3.287 2h7.8c.728 0 1.313.585 1.313 1.287v7.799a1.31 1.31 0 0 1-1.313 1.313h-7.8C2.585 12.4 2 11.815 2 11.087zm5.213-.17c-1.079 0-2.015.053-3.042.196-.312.039-.494.22-.494.494V9.89c0 .195.143.325.273.364l.39.065v.819c0 .091.078.156.182.156h.624a.16.16 0 0 0 .156-.156v-.728c.507.065 1.196.091 1.885.091.702 0 1.417-.026 1.911-.091v.728c0 .091.091.156.17.156h.623c.104 0 .182-.065.182-.156v-.819l.39-.065a.36.36 0 0 0 .273-.364V3.808c0-.273-.182-.455-.494-.494a24 24 0 0 0-3.028-.195zm2.69 5.187c-.74.13-1.715.26-2.664.26-1.001 0-1.95-.117-2.704-.286-.208-.039-.286-.117-.286-.286V4.198c0-.17.078-.286.286-.286l5.369.026c.208 0 .273.117.273.286v3.795c0 .17-.065.26-.273.286m-5.446 1.04c.013-.169.169-.325.351-.325s.338.156.338.325a.347.347 0 0 1-.338.351c-.195-.013-.351-.169-.351-.35m4.758 0c.013-.169.169-.325.338-.325.182 0 .338.156.338.325a.347.347 0 0 1-.338.351.365.365 0 0 1-.338-.35"/>
    </g>
    <path fill="#333" d="M92.8 60.8h6.4v22.4a3.2 3.2 0 1 1-6.4 0z"/>

</svg>`,
    busExpress: `
<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="0 0 64 86.528">
    <g transform="matrix(4 0 0 4 3.2 3.2)">
        <circle cx="7.2" cy="7.2" r="7.6" fill="#ca4000" stroke="#fff" stroke-width=".8"/>
        <path fill="#fff" d="M10.88 12.088H3.6a1.247 1.247 0 0 1-1.247-1.248V3.56c0-.69.558-1.248 1.248-1.248h7.28c.689 0 1.248.559 1.248 1.248v7.28c0 .69-.56 1.248-1.248 1.248"/>
        <path fill="#ca4000" d="M2 3.288A1.3 1.3 0 0 1 3.287 2h7.8c.728 0 1.313.585 1.313 1.287v7.799a1.31 1.31 0 0 1-1.313 1.313h-7.8C2.585 12.4 2 11.815 2 11.087zm5.213-.17c-1.079 0-2.015.053-3.042.196-.312.039-.494.22-.494.494V9.89c0 .195.143.325.273.364l.39.065v.819c0 .091.078.156.182.156h.624a.16.16 0 0 0 .156-.156v-.728c.507.065 1.196.091 1.885.091.702 0 1.417-.026 1.911-.091v.728c0 .091.091.156.17.156h.623c.104 0 .182-.065.182-.156v-.819l.39-.065a.36.36 0 0 0 .273-.364V3.808c0-.273-.182-.455-.494-.494a24 24 0 0 0-3.028-.195zm2.69 5.187c-.74.13-1.715.26-2.664.26-1.001 0-1.95-.117-2.704-.286-.208-.039-.286-.117-.286-.286V4.198c0-.17.078-.286.286-.286l5.369.026c.208 0 .273.117.273.286v3.795c0 .17-.065.26-.273.286m-5.446 1.04c.013-.169.169-.325.351-.325s.338.156.338.325a.347.347 0 0 1-.338.351c-.195-.013-.351-.169-.351-.35m4.758 0c.013-.169.169-.325.338-.325.182 0 .338.156.338.325a.347.347 0 0 1-.338.351.365.365 0 0 1-.338-.35"/>
    </g>
    <path fill="#333" d="M28.8 60.8h6.4v22.4a3.2 3.2 0 1 1-6.4 0z"/>
</svg>`,
    tram: `
<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="256 0 64 86.528">
    <g transform="matrix(4 0 0 4 259.2 3.2000004)">
        <circle cx="7.2" cy="7.2" r="7.6" fill="#008151" stroke="#fff" stroke-width=".8"/>
        <path fill="#fff" d="M10.84 12.088H3.56c-.69 0-1.248-.559-1.248-1.248V3.56c0-.69.559-1.248 1.248-1.248h7.28c.69 0 1.248.559 1.248 1.248v7.28c0 .69-.559 1.248-1.248 1.248"/>
        <path fill="#008151" d="M2 3.288A1.3 1.3 0 0 1 3.287 2h7.8c.728 0 1.313.585 1.313 1.287v7.799a1.31 1.31 0 0 1-1.313 1.313h-7.8C2.585 12.4 2 11.815 2 11.087zm7.267.936a.42.42 0 0 0-.312-.273 6 6 0 0 0-1.482-.208v-.455h.962c.13 0 .234-.117.234-.247 0-.156-.104-.273-.234-.273H5.99a.267.267 0 0 0-.273.273c0 .13.117.247.273.247h.949v.455a5.7 5.7 0 0 0-1.482.208c-.182.052-.273.117-.351.273l-.221.533c-.065.156-.065.377-.065.546v4.68c0 .233.156.376.39.415a9.6 9.6 0 0 0 1.989.195c.65 0 1.274-.052 2.001-.195.221-.039.39-.182.39-.416v-4.68c0-.168-.039-.39-.104-.545zm-.65 7.006v-.39l-.481.065v.325h-1.86v-.325l-.48-.065v.39h-.39a.233.233 0 0 0-.234.234c0 .169.09.273.234.273h3.6c.117 0 .247-.104.247-.273 0-.117-.13-.234-.247-.234zM5.289 9.228c0-.182.13-.325.299-.325.182 0 .312.143.312.325 0 .17-.13.286-.312.286-.169 0-.299-.117-.299-.286m.013-4.03h3.783v3.16C8.59 8.5 7.889 8.59 7.2 8.59a8.2 8.2 0 0 1-1.898-.234zm3.263 4.03c0-.182.117-.325.286-.325.182 0 .325.143.325.325 0 .17-.143.286-.325.286a.273.273 0 0 1-.286-.286"/>
    </g>
    <path fill="#333" d="M284.8 60.8000004h6.4v22.4a3.2 3.2 0 1 1-6.4 0z"/>
</svg>`,
    rail: `
<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="192 0 64 86.528">
    <g transform="matrix(4 0 0 4 195.2 3.2000004)">
        <circle cx="7.2" cy="7.2" r="7.6" fill="#8c4799" stroke="#fff" stroke-width=".8"/>
        <path fill="#fff" d="M10.944 12.192h-7.28c-.69 0-1.248-.559-1.248-1.248v-7.28c0-.69.559-1.248 1.248-1.248h7.28c.69 0 1.248.559 1.248 1.248v7.28c0 .69-.559 1.248-1.248 1.248"/>
        <path fill="#8c4799" d="M2 3.287C2 2.585 2.585 2 3.287 2h7.8c.728 0 1.313.585 1.313 1.287v7.8a1.31 1.31 0 0 1-1.313 1.313h-7.8C2.585 12.4 2 11.815 2 11.087zm7.982.04c-.286-.26-1.521-.56-2.782-.56-1.222 0-2.483.3-2.756.56-.195.168-.39.558-.624 1.052-.195.43-.35.832-.35 1.066v3.757c0 .3.103.43.506.741.3.234.43.338.884.338h.858v.56h3.003v-.56h.845c.455 0 .585-.104.871-.338.403-.325.494-.442.494-.74V5.444c0-.234-.156-.637-.338-1.066-.234-.494-.416-.884-.61-1.053zM9.63 11.23v-.546h-.48v.546H5.276v-.546h-.494v.546h-.598c-.143 0-.26.117-.26.247 0 .143.117.26.26.26h6.057c.143 0 .247-.117.247-.26a.247.247 0 0 0-.247-.247zm-.273-3.315a.5.5 0 0 1-.481.39H5.549a.5.5 0 0 1-.481-.39l-.611-2.587c-.04-.22.104-.39.325-.39H9.63c.22 0 .377.17.325.39zm-.182-4.134v.221c0 .17-.13.312-.3.312H5.55a.316.316 0 0 1-.312-.312v-.22zm-3.94 5.486c0-.182.13-.325.313-.325.182 0 .338.143.338.325s-.156.312-.338.312a.3.3 0 0 1-.312-.312m3.316-.039c0-.182.143-.325.325-.325s.325.143.325.325-.143.312-.325.312-.325-.13-.325-.312"/>
    </g>
    <path fill="#333" d="M220.8 60.8000004h6.4v22.4a3.2 3.2 0 1 1-6.4 0z"/>
</svg>`,
    speedtram: `
<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="320 0 64 86.528">
    <g transform="matrix(4 0 0 4 131.2 3.19999971)">
        <circle cx="7.2" cy="7.2" r="7.6" fill="#007a97" stroke="#fff" stroke-width=".8"/>
        <path fill="#007a97" d="M2 11.1c0 .715.585 1.3 1.3 1.3h7.8c.715 0 1.3-.585 1.3-1.3V3.3c0-.715-.585-1.3-1.3-1.3H3.3C2.585 2 2 2.585 2 3.3z"/>
        <path fill="#fff" d="M9.446 7.254H8.03a.13.13 0 0 1-.12-.104l-.14-.871a.087.087 0 0 1 .088-.105H9.02a.17.17 0 0 1 .143.098l.348.884c.022.054-.008.098-.065.098m-1.795 0H6.553a.105.105 0 0 1-.104-.106V6.28c0-.058.047-.106.104-.106h.925c.058 0 .112.047.121.105l.14.87a.087.087 0 0 1-.088.105m-1.369-.106a.105.105 0 0 1-.104.106H4.904a.105.105 0 0 1-.104-.106V6.28c0-.058.047-.106.104-.106h1.274c.057 0 .104.048.104.106zm-1.65 0a.105.105 0 0 1-.103.106H3.81a.105.105 0 0 1-.104-.106V6.28c0-.058.047-.106.104-.106h.718c.057 0 .104.048.104.106zm7.119.578h-1.606a.06.06 0 0 1-.058-.034c-.02-.037-.678-1.518-.678-1.518h.114c.043 0 .102-.06.102-.133a.133.133 0 0 0-.131-.133h-1.66l-.394-.763a.05.05 0 0 0-.04-.025h-.08c-.014 0-.023.012-.02.026l.061.212h-.167c-.022 0-.04.018-.04.041s.018.042.04.042h.191l.133.467H3.4a.133.133 0 0 0-.132.133c0 .074.06.133.162.133h.013l-.159 1.552h-.452L3 9.28c.397 0 .756-.17 1.008-.44a1.375 1.375 0 0 0 2.017 0 1.374 1.374 0 0 0 2.017 0 1.374 1.374 0 0 0 2.016 0c.152.163.343.289.557.363l1.15-1.431c.019-.025.014-.046-.014-.046"/>
    </g>
    <path fill="#333" d="M156.8 60.79999971h6.4v22.4a3.2 3.2 0 1 1-6.4 0z"/>
</svg>`
}
const API_URL = /* "http://127.0.0.1:39149/hsl-gambling" *//* "https://hekinav.hackclub.app/hsl-gambling" */"https://hsl-gambling.hekinav.dev/hsl-gambling"

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
function initContent() {
    sidebar.querySelectorAll("div.view").forEach(view => {
        view.querySelectorAll(".replace").forEach(e => {
            console.log(e)
            e.setAttribute("data-content", e.innerHTML)
        })
    })
}
function replaceContent(element) {
    element.innerHTML = replace(element.getAttribute("data-content"), data[element.getAttribute("data-replace")])
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
function play_again() {
    map.removeLayer("route")
    map.removeSource("route")
    stopMarker.remove()
    busMarker.remove()
    busTextMarker.remove()
    game()
}
function game() {
    sideBarMode("game_loading")
    const gameSocket = new WebSocket(API_URL + `/game?user=${data.user.user_id}`)
    gameSocket.addEventListener("message", (e) => {
        const serverData = JSON.parse(e.data)
        if (serverData.error) {
            sideBarMode("loading_error")
            console.error(serverData.error)
            if (serverData.autoReload) {
                gameSocket.close()
                game()
            }
        } else {

            const { nextStop, route, odds } = serverData

            const pattern = route.patterns.find(p => p.directionId == serverData.mqttData.di - 1)
            const geojson = polyline.toGeoJSON(pattern.patternGeometry.points)

            const color = getRouteColor(route.type)

            map.addSource('route', {
                type: 'geojson',
                data: geojson
            });
            map.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: {
                    "line-join": 'round',
                    "line-cap": 'round'
                },
                paint: {
                    "line-color": color,
                    "line-width": 5
                }
            });

            data.trip = {
                long_name: nextStop.headsign,
                short_name: route.shortName,
                color: color,
                next_stop_name: nextStop.stop.name,
                next_stop_code: nextStop.stop.code
            }

            data.odds = odds

            const marker = document.createElement("div")
            marker.innerHTML = getStopIcon(route.type)
            marker.id = "stopMarker"
            marker.style.width = "27px"

            stopMarker = new mapboxgl.Marker({
                element: marker,
                anchor: "bottom",
                scale: 10
            })
                .setLngLat([nextStop.stop.lon, nextStop.stop.lat])
                .addTo(map);

            map.flyTo({ center: [nextStop.stop.lon, nextStop.stop.lat], zoom: 14 })

            followTrip(gameSocket, serverData.mqttData, [nextStop.stop.lon, nextStop.stop.lat], nextStop.stop.gtfsId, route.shortName)

            sideBarMode("game")

        }

    })
}

function followTrip(gameSocket, tripData, nextStopLatLng, nextStopId, routeNumber) {
    const marker1 = document.createElement("div")
    marker1.innerHTML = `
<svg width="32" height="32" version="1.1" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
 <g fill="${data.trip.color}" stroke="white">
   <path transform="scale(.5)" d="m16.002 0-4.6758 4.9492a12 12 0 0 0-7.3262 11.051 12 12 0 0 0 12 12 12 12 0 0 0 12-12 12 12 0 0 0-7.3203-11.049l-4.6777-4.9512z" stroke-width="1.6628"/>
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
        rotationAlignment: "map",
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
            if ("HSL:" + update.stop == nextStopId) {
                // Stop is the one
                switch (updateType) {
                    case "ARS":
                        endGame(true, gameSocket, client)
                        break
                    case "PAS":
                        endGame(false, gameSocket, client)
                        break
                    case "DUE":
                        console.log("inputs disabled")
                        document.querySelectorAll(".betUi").forEach(e => e.disabled = true)
                        break
                    default:
                        break
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
function endGame(stopped, gameSocket, mqttClient) {
    const bet = document.getElementById("betYes").checked
    const amount = document.getElementById("betAmount").value
    console.log(bet == stopped, Number(amount) ? amount : 100)
    gameSocket.send(JSON.stringify({ type: "end", bet: bet, stopped: stopped, amount: amount.length ? amount : 100 }))
    gameSocket.close()

    mqttClient.end()

    data.odds.m = data.odds[stopped ? "s" : "n"]
    getCoins().then(coins => {
        data.user.coins = coins.coins
        sideBarMode(bet == stopped ? "game_won" : "game_lost")
    })
}
function getInputs() {
    const dropdownElementList = document.querySelectorAll('.dropdown-toggle')
    const dropdownList = [...dropdownElementList].map(dropdownToggleEl => new bootstrap.Dropdown(dropdownToggleEl))
    console.log(dropdownList)
}
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : - 1 + (4 - 2 * t) * t;
}


if (localStorage.getItem("user")) {
    data.user = JSON.parse(localStorage.getItem("user"))
    getCoins().then((coins) => {
        data.user.coins = coins.coins
        sideBarMode("main")
    })
} else {
    sideBarMode("no_user")
}
initContent()

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
        case 900:
            return COLOR_TABLE.speedtram
        default:
            console.log(type)
            return COLOR_TABLE.replacementBus
    }
}
function getStopIcon(type) {
    switch (type) {
        case 701:
            return ICONS.bus
        case 702:
            return ICONS.busExpress
        case 109:
            return ICONS.rail
        case 0:
            return ICONS.tram
        case 900:
            return ICONS.speedtram
        default:
            console.log(type)
            return ICONS.replacementBus
    }
}
async function getCoins() {
    const response = await fetch(API_URL + `/coins?user=${data.user.user_id}`)
    return await response.json()
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

