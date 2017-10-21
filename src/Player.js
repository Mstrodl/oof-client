const EventEmitter = require("events").EventEmitter

/**
 * Represents a player system
 * 
 * @class Player
 * @extends {EventEmitter}
 */
class Player extends EventEmitter {
  /**
   * @param {VoiceChannel} channel The voice channel the player is playing to
   * @param {Node} node The node the player is broadcasting on
   */
  constructor(channel, node) { 
    super()

    /**
     * The voice channel the player is playing to
     * @type {VoiceChannel}
     */
    this.channel = channel

    /**
     * The node the player is broadcasting on
     * @type {Node}
     */
    this.node = node

    /**
     * Whether or not the node is connected to the voice channel
     * @type {boolean}
     */
    this.ready = false
    
    /**
     * The currently playing track's info, or null when there is no currently playing track.
     * @type {Object | null}
     */
    this.nowPlaying = null;
    
    /**
     * Whether or not this instance has been destroyed
     * @type {boolean}
     */
    this.destroyed = false
  }

  /**
   * The guild the voice channel is in
   * @type {Guild}
   * 
   * @readonly
   */
  get guild() {
    return this.channel.guild;
  }

  /**
   * Wrapper for the send function
   * 
   * @param {String} opcode The opcode of this websocket message
   * @param {any} payload The data to send
   */
  send(opcode, payload) {
    return this.node.send({
      op: opcode,
      d: payload
    })
  }

  /**
   * Called by the node when a voiceStateUpdate packet is sent by discord intended for the guild designated to this player
   * @private
   * @arg {*} data The voiceStateUpdate packet from Discord
   */
  stateUpdate(data) {
    this.send("voiceStateUpdate", {
      guildId: this.guild.id,
      channelId: this.channel.id,
      session_id: data.session_id
    })
  }

  /**
   * Called by the node when a voiceServerUpdate packet is sent by Discord intended for the guild designated to this player
   * @private
   * @arg {*} data The voiceServerUpdated packet from Discord
   */
  serverUpdate(data) {
    this.send("voiceServerUpdate", {
      guildId: this.guild.id,
      channelId: this.channel.id,
      endpoint: data.endpoint,
      guild_id: data.guild_id,
      token: data.token
    })
  }

  /**
   * Connect to the voice channel
   * @returns {Promise} Resolves when connected to the voice channel
   */
  connect() {
    return new Promise((resolve, reject) => {
      this.send("join", {
        channelId: this.channel.id,
        guildId: this.guild.id,
        userId: this.channel.client.user.id
      })
      this.once("connected", () => {
        console.log("Got connected")
        resolve()
      })
    })
  }

  /**
   * Plays a given track
   * @arg {Object.<string, string>} [track] Track to be played
   * @arg {String} [track.url] URL of the track to be played
   * @returns {Promise} Resolves once the track starts playing
   */
  play(track) {
    return new Promise((resolve, reject) => {
      this.send("play", {
        track: track,
        guildId: this.guild.id,
        channelId: this.channel.id
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
      this.send("stop", {
        guildId: this.guild.id,
        channelId: this.channel.id
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
      this.send("leave", {
        guildId: this.guild.id,
        channelId: this.channel.id
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
    return this.send("seek", {
      position,
      guildId: this.guild.id,
      channelId: this.channel.id
    })
  }

  /**
   * Sets the volume of the current track
   * @arg {Number} volume Volume to be changed to
   */
  volume(volume) {
    return this.send("volume", {
      volume,
      guildId: this.guild.id,
      channelId: this.channel.id
    })
  }

  /**
   * Pauses the currently playing track
   * @arg {Boolean=} pause If set, only changes to the given state
   */
  pause(pause) {
    return this.send("pause", {
      pause,
      guildId: this.guild.id,
      channelId: this.channel.id
    })
  }

  /**
   * Destroys the Player object
   */
  destroy() {
    for(let key of Object.keys(this)) {
      delete this[key]
    }
    this.destroyed = true
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

module.export = Player;
