import fs from "node:fs/promises"
import express from "express"
import mqtt from "mqtt"
import generateDocs from "./modules/docsCreator.js"
import apiDocsJson from "./hslGamblingApi.json" with {type: "json"}
import sqlite3 from "sqlite3"
import { randomFill, randomInt, randomUUID } from "node:crypto"
import expressWs from "express-ws"

const app = express()

expressWs(app)


let depFunc

const db = new sqlite3.Database("./db/stats.db");

export default function () {
  console.log("Starting HSL Gambling API: Starting DB")

  db.serialize(() => {
    db.run(`
  CREATE TABLE IF NOT EXISTS stats (
    stop_id TEXT NOT NULL,
    route_id TEXT NOT NULL,
    is_weekday BOOLEAN,
    hour INTEGER CHECK(hour BETWEEN 0 AND 23) NOT NULL,
    s INTEGER DEFAULT 0,
    n INTEGER DEFAULT 0,
    PRIMARY KEY (stop_id, route_id, is_weekday, hour)
);`)
    db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT NOT NULL,
    name TEXT,
    date INTEGER,
    coins INTEGER,
    won INTEGER,
    lost INTEGER,
    PRIMARY KEY (id)
);`)

    console.log("Starting HSL Gambling API: Connecting to HSL MQTT")

    const client = mqtt.connect("wss://mqtt.hsl.fi:443/");

    client.on("connect", () => {
      console.log("HSL Gambling API: Connecting: Subscribing")
      client.subscribe("/hfp/v2/journey/ongoing/+/#", (err) => {
        if (err) console.error("MQTT connection failed: ", err)
      });
    });

    client.on("message", handleMessage)

    client.on("disconnect", () => {
      console.log("HSL Gambling API: MQTT Disconnected: Reconnecting")
      client.reconnect()
    })

    console.log("Starting HSL Gambling API: Creating endpoints")

    app.get("/", (req, res) => {
      res.send(generateDocs(apiDocsJson))
    })
    app.get("/echo", (req, res) => {
      res.send(req.query.msg || "Hello World!")
    })
    app.get("/new_user", (req, res) => {
      const [uuid, name] = generateUser()
      res.json({ id: uuid, name: name })
    })
    app.get("/coins", (req, res) => {
      const coins = getUserCoins(req.query.user)
      res.json({ coins: coins })
    })
    app.ws('/game', function (ws, req) {
      startGame(req.query.user).then((startData => {
        ws.send(JSON.stringify(startData))
        ws.on('message', function (msg) {
          ws.send(msg);
        });
      }))
    });
  })
  return app
}

function generateUser() {
  const uuid = randomUUID()
  const name = randomInt(2 ** 16)
  db.run(`
    INSERT INTO users (id, name, date, coins, won, lost)
    VALUES (?, ?, ?, ?,?,?)
  `, [uuid, name, Date.now(), 500, 0, 0])
  return [uuid, name]
}
async function startGame() {
  const promise = new Promise((resolve, reject) => {
    depFunc = resolve;
  })
  const data = await promise

  const weights = await getStopWeight(data.sp, data.de)

  if (!weights) {
    return await startGame()
  }

  const time = Number(data.st.substring(0, 2)) * 3600 + Number(data.st.substring(3, 5)) * 60
  const query = `
{
  fuzzyTrip(route: "HSL:${data.rn}", direction: ${Number(data.di) - 1}, date: "${data.dt}", time: ${time}) {
    route {
      shortName
      longName
    }
    gtfsId
  }
}
  `
  const response = await getGraphQl(query)

  const totalEvents = Object.values(weights).reduce((prev, curr) => prev + curr, 0)
  const stoppingOdds = { s: weights.s / totalEvents, n: weights.n / totalEvents }

  if (response.data.fuzzyTrip && stoppingOdds.s % 1 != 0) {
    console.log(stoppingOdds, weights, stoppingOdds.s % 1)
    return { tripId: response.data.fuzzyTrip.gtfsId, mqttData: data }
  }
  return { error: "Could not mach trip" }
}
function handleMessage(topic, message) {
  const messageData = Object.entries(JSON.parse(message.toString()))[0]
  const [event, props] = messageData
  const {
    desi, dir, oper, veh, tst,
    tsi, spd, hdg, lat, long,
    acc, dl, odo, drst, oday,
    jrn, line, start, loc, stop,
    route, occu, seq, label, ttarr,
    ttdep
  } = props
  const [
    _,
    prefix, version, journey_type, journey, temporal_type,
    event_type, transport_mode, operator_id, vehicle_number, route_id,
    direction_id, headsign, start_time, next_stop, geohash_level,
    geohash, sid] = topic.split("/")
  if (stop && (event == "ARS" || event == "PAS")) {
    addStopWeight(stop, event == "ARS", desi)
  }
  if (event == "DEP" && depFunc) {
    depFunc({ di: dir, rn: route, ts: tst, dt: oday, st: start, sp: stop, de: desi })
  }
}


async function addStopWeight(stopID, stopped = false, routeID) {
  const date = new Date(Date.now())
  const isWeekday = date.getDay() >= 1 && date.getDay() <= 5
  const hour = date.getHours()
  db.run(
    `INSERT OR IGNORE INTO stats (stop_id, route_id, is_weekday, hour, s, n)
     VALUES (?, ?, ?, ?, 0, 0)`,
    [stopID, routeID, isWeekday, hour]
  );
  db.run(
    `UPDATE stats
     SET s = s + ?, n = n + ?
     WHERE stop_id = ? AND route_id = ? AND is_weekday = ? AND hour = ?`,
    [stopped ? 1 : 0, stopped ? 0 : 1, stopID, routeID, isWeekday, hour]
  );
  //console.log(stopID, routeID, isWeekday ? "weekday" : "weekend", hour, stopped ? "s" : "n")
}
async function getStopWeight(stopID, routeID) {
  const date = new Date(Date.now())
  const isWeekday = date.getDay() >= 1 && date.getDay() <= 5
  const hour = date.getHours()

  const data = await new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM stats WHERE stop_id=? AND route_id=? AND is_weekday=?
     `,
      [stopID, routeID, isWeekday], (err, data) => {
        if (err) {
          console.error(err)
          reject()
        }
        else resolve(data.reduce((curr, prev) => {
          return {
            s: prev.s + curr.s,
            n: prev.n + curr.n
          }
        }, {
          s: 0,
          n: 0
        }))
      }
    );
  })
  return data
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
async function getJSON(name) {
  const json = (await fs.readFile(`./data/${name}.json`)).toString()
  return JSON.parse(json)
}
