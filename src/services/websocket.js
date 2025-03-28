export default class Websocket {
  constructor(url, callback) {
    this.url = url
    this.callback = callback
    this.ws = null
    this.status = 0 // 0-closed 1-connected 2-manually closed
    this.ping = 10000
    this.pingInterval = null
    this.reconnect = 5000
  }
  connect() {
    this.ws = new WebSocket(this.url)
    this.ws.onopen = () => {
      this.status = 1
      this.heartHandler()
    }
    this.ws.onmessage = (e) => {
      this.callback(JSON.parse(e.data))
    }
    this.ws.onerror = (e) => {
      console.log(e)
    }
    this.ws.onclose = (e) => {
      this.onClose(e)
    }
  }
  send(data) {
    return this.ws.send(JSON.stringify(data))
  }
  close() {
    this.status = 2
    this.ws.close()
  }
  onClose(e) {
    console.error(e)
    this.status = this.status === 2 ? this.status : 0
    setTimeout(() => {
      if (this.status === 0) {
        this.connect()
      }
    }, this.reconnect)
  }
  heartHandler() {
    const data = {
      type: 0,
    }
    this.pingInterval = setInterval(() => {
      if (this.status === 1) {
        this.ws.send(JSON.stringify(data))
      } else {
        clearInterval(this.pingInterval)
      }
    }, this.ping)
  }
}
