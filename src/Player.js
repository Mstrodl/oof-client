let EventEmitter = require("events").EventEmitter

/**
 * Represents a Player system
 * @extends EventEmitter
 * @prop {VoiceChannel} channel The voice channel the player is playing to
 * @prop {Guild} guild The guild the voice channel is in
 * @prop {Node} node The node the player is broadcasting on
 * @prop {Boolean} ready Whether or not the node is connected to the voice channel
 * @prop {Object} nowPlaying The currently playing track's info
 */
module.exports = class Player extends EventEmitter {
  constructor(channel, node) { 
    super()
    this.channel = channel
    this.guild = channel.guild
    this.node = node
    this.ready = false
  }

  /**
   * Called by the node when a voiceStateUpdate packet is sent by discord intended for the guild designated to this player
   * @private
   * @arg {*} data The voiceStateUpdate packet from Discord
   */
  stateUpdate(data) {
    this.node.send({
      op: "voiceStateUpdate",
      d: {
        guildId: this.guild.id,
        channelId: this.channel.id,
        session_id: data.session_id
      }
    })
  }

  /**
   * Called by the node when a voiceServerUpdate packet is sent by Discord intended for the guild designated to this player
   * @private
   * @arg {*} data The voiceServerUpdated packet from Discord
   */
  serverUpdate(data) {
    this.node.send({
      op: "voiceServerUpdate",
      d: {
        guildId: this.guild.id,
        channelId: this.channel.id,
        endpoint: data.endpoint,
        guild_id: data.guild_id,
        token: data.token
      }
    })
  }

  /**
   * Connect to the voice channel
   * @returns {Promise} Resolves when connected to the voice channel
   */
  connect() {
    return new Promise((resolve, reject) => {
      this.node.send({
        op: "join",
        d: {
          channelId: this.channel.id,
          guildId: this.guild.id,
          userId: this.channel.client.user.id
        }
      })
      this.once("connected", () => {
        console.log("Got connected")
        resolve()
      })
    })
  }

  /**
   * Plays a given track
   * @arg {Object} [track] Track to be played
   * @arg {Object} [track.url] URL of the track to be played
   * @returns {Promise} Resolves once the track starts playing
   */
  play(track) {
    return new Promise((resolve, reject) => {
      this.node.send({
        op: "play",
        d: {
          track: track,
          guildId: this.guild.id,
          channelId: this.channel.id
        }
      })
      this.once("playing", () => resolve())
    })
  }

  /**
   * Stops playing the current track
   * @returns {Promise} Resolves when the track ends
   */
  stop() {
    return new Promise((resolve, reject) => {
      this.node.send({
        op: "stop",
        d: {
          guildId: this.guild.id,
          channelId: this.channel.id
        }
      })
      this.once("end", () => resolve())
    })
  }

  /**
   * Leaves the channel
   * @returns {Promise} Resolves when the channel is left
   */
  leave() {
    return new Promise((resolve, reject) => {
      this.node.send({
        op: "leave",
        d: {
          guildId: this.guild.id,
          channelId: this.channel.id
        }
      })
      this.once("disconnected", () => {
        resolve()
      })
    })
  }

  /**
   * Seeks to a location in the current track
   * @arg {String} position Position to seek to
   */
  seek(position) {
    // Not implemented yet... D:
    return this.node.send({
      op: "seek",
      d: {
        position
      }
    })
  }

  /**
   * Sets the volume of the current track
   * @arg {Number} volume Volume to be changed to
   */
  volume(volume) {
    return this.node.send({
      op: "volume",
      d: {
        volume
      }
    })
  }

  /**
   * Pauses the currently playing track
   * @arg {Boolean=} pause If set, only changes to the given state
   */
  pause(pause) {
    return this.node.send({ 
      op: "pause",
      d: {
        pause: pause
      }
    })
  }

  /**
   * Handles a websocket message
   * @private
   * @arg {Object} message The incoming websocket event
   */
  onMessage(message) {
    switch(message.op) {
    case "connected": {
      this.ready = true
      /**
       * Fires when the oof node connects to the voice channel
       * @event Player#connected
       */
      this.emit("connected")
      break
    }
    case "disconnected": {
      this.ready = false
      /**
       * Fires when the oof node loses connection to the voice channel
       * @event Player#disconnected
       */
      this.emit("disconnected")
      break
    }
    case "trackInfo": { // Equivelent to saying the track is playing
      this.nowPlaying = message.d.info
      /**
       * Fires when a track starts playing
       * @event Player#playing
       * @prop {Object} info The currently playing track
       */
      this.emit("playing", this.nowPlaying)
      break
    }
    case "trackEnd": {
      this.nowPlaying = null
      /**
       * Fires when a track ends
       * @event Player#end
       */
      this.emit("end")
    }
    }
  }
}
