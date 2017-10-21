let Websocket = require("ws")
let Player = require("./Player")

/**
* Represents an oof voice node
* @arg {Object} [opts] Node options
* @arg {String="localhost"} [opts.address] Hostname to connect ot the oof server at
* @arg {String="8081"} [opts.port] Port to connect to the oof server at
* @arg {String="us"} [opts.region] Region the server is located in
* @arg {OofClient} master OofClient that instantiated this node
* @prop {String} address Hostname of the oof server
* @prop {Port} port Port of the oof server
* @prop {String} region Region the node is located in
* @prop {Object} guilds Guilds the voice node is currently connected to
* @prop {Websocket} ws Websocket client connected to the oof server
* @prop {OofClient} master OofClient that instantiated this node
* @prop {Object} [stats] Statistics of the oof client
* @prop {Number} [stats.cores] Cores the oof server's host has
* @prop {Number} [stats.load] Load value of the oof server's host
*/
module.exports = class Node {
  constructor(opts, master) {
    this.address = opts.address || "localhost"
    this.port = opts.port || "8081"
    this.region = opts.region || "us"
    this.guilds = {}
    this.ws = new Websocket(`ws://${this.address}:${this.port}`)
    this.ws.on("connection", () => this.ready = true)
    this.master = master
    this.master.client.on("self.voiceServer", this.onServerUpdate.bind(this))
    this.master.client.on("self.voiceStateUpdate", this.onVoiceStateUpdate.bind(this))
    this.stats = {
      cores: 1,
      load: 0
    }
    this.ws.on("message", this.onMessage.bind(this))
  }

  /**
  * Sends a Websocket packet
  * @private
  * @arg {*} data The data packet to send
  */
  send(data) {
    this.ws.send(JSON.stringify(data))
  }

  /**
  * Called when a voiceServerUpdate packet is recieved
  * @private
  * @arg {*} data The voiceServerUpdate packet's `d` attribute
  */
  onServerUpdate(data) {
    this.guilds[data.guild_id].serverUpdate(data)
  }

  /**
  * Called when a voiceStateUpdate packet is recieved
  * @private
  * @arg {*} data The voiceStateUpdate packet's `d` attribute
  */
  onVoiceStateUpdate(data) {
    this.guilds[data.guild_id].stateUpdate(data)
  }

  /**
  * Called when a websocket event is recieved
  * @private
  * @arg {String} data The websocket event recieved
  */
  onMessage(data) {
    let message = JSON.parse(data)
    console.log(`Got message from node ${data}`)
    if(message.d.guildId && message.d.channelId)
      this.guilds[message.d.guildId].onMessage(message)
    else {
      switch(message.op) {
      case "sendWS": {
        this.master.client.ws.send(message.d)
        console.log("We need to send a WS!!!", message)
        break
      }
      case "stats": {
        this.stats = message.d
      }
      }
    }
  }

  /**
  * Creates a new player and connects it to the voice channel
  * @arg {VoiceChannel} channel The VoiceChannel to create the player for
  * @returns {Player} The Player for the give VoiceChannel
  */
  createPlayer(channel) {
    this.guilds[channel.guild.id] = new Player(channel, this)
    this.guilds[channel.guild.id].once("disconnect", () => this.guilds[channel.guild.id] = null)
    this.guilds[channel.guild.id].connect()
    return this.guilds[channel.guild.id]
  }
}
