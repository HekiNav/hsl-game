import WebSocket from 'ws';

const ws = new WebSocket("ws://127.0.0.1:3001/hsl-gambling/game")

ws.on("error", (err) => {
    console.error(err)
})

ws.on("message", (data) => {
    console.log(data.toString())
    ws.close()
})

