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

let statusData = {
  lastMqttMessage: null,
  numMessages: 0
}

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
      getUserCoins(req.query.user).then(coins => {
        res.json({ coins: coins })
      })

    })
    app.get("/status", (req, res) => {
      res.json(statusData)
    })
    app.ws('/game', function (ws, req) {
      const user = req.query.user
      console.log(user)
      startGame(req.query.user).then((startData => {
        ws.send(JSON.stringify(startData))
        ws.on('message', function (msg) {
          const data = JSON.parse(msg)
          if (data.type != "end") return
          finishGame(data.bet, data.stopped, data.amount, user, startData.odds)
        });
      }))
    });
  })
  return app
}
async function finishGame(bet, stopped, betAmount, userId, odds) {
  const multiplier = odds[stopped ? "s" : "n"]

  console.log(bet, stopped, betAmount, userId, odds, multiplier)
  if (bet == stopped) {
    db.run(
      `UPDATE users
     SET coins = floor(max(coins, ?) * ?)
     WHERE id = ?`,
      [betAmount, multiplier, userId], (a, err) => {
        if (err) console.error(err)
        if (a) console.error(a)
      }
    );
  } else {
    db.run(
      `UPDATE users
     SET coins = coins - max(coins, ?)
     WHERE id = ?`,
      [betAmount, userId], (a, err) => {
        if (err) console.error(err)
        if (a) console.error(a)
      }
    );
  }
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

  if (response.data.fuzzyTrip) {

    const tripData = await getTripData(response.data.fuzzyTrip.gtfsId)

    if (!tripData.route) {
      return { error: "Could not get trip data", autoReload: true }
    }
    const date = new Date(Date.now())
    const now = date.getHours() * 3600 + date.getMinutes() * 60
    const next_stop = tripData.stoptimesForDate.find(t => (t.realtimeArrival || t.scheduledArrival) > now + 60)

    if (!next_stop) {
      return { error: "Could not get next stop", autoReload: true }
    }

    const weights = await getStopWeight(next_stop.stop.gtfsId.substring(4, 11), data.de)

    if (!weights) {
      return { error: "Could not get stopping odds", autoReload: true }
    }

    const totalEvents = Object.values(weights).reduce((prev, curr) => prev + curr, 0)
    const stoppingOdds = { s: weights.s / totalEvents, n: weights.n / totalEvents }

    if (stoppingOdds.s % 1 == 0) {
      return { error: "Invalid stopping odds", autoReload: true }
    }
    const stoppingMultipliers = { s: Math.round(totalEvents / weights.s * 10) / 10, n: Math.floor(totalEvents / weights.n * 10) / 10 }

    console.log(stoppingMultipliers, weights)
    return { nextStop: next_stop, odds: stoppingMultipliers, route: tripData.route, tripId: response.data.fuzzyTrip.gtfsId, mqttData: data }
  }
  return { error: "Could not match trip" }
}

async function getUserCoins(user_id) {
  const data = await new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM users WHERE id=?
     `,
      [user_id], (err, data) => {
        if (err) {
          console.error(err)
          reject()
        }
        else resolve(data)
      }
    );
  })
  return data ? data.coins : null
}

async function getTripData(tripId) {
  const data = await getGraphQl(`
{
  trip(id: "${tripId}") {
    route {
      longName
      shortName
      type
      patterns {
        directionId
        patternGeometry {
          length
          points
        }
      }
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
  return await data.data.trip
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
    statusData.lastMqttMessage = new Date(Date.now()).toISOString()
    statusData.numMessages++
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
    [stopped ? 1 : 0, stopped ? 0 : 1, stopID, routeID, isWeekday, hour], (a, err) => {
      if (err) console.error(err)
      if (a) console.error(a)
    }
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
  }).catch(err => {
    console.error(err)
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
