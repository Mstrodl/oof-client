const Node = require("./Node")
const REGION_MAP = {
  us: [
    "us", "brazil"
  ]
}

/**
 * An Oof Client
*/
class OofClient {
  /**
   * Creates an OofClient
   * 
   * @param {Client} client The Discord client this OofClient is for
   * @param {Node[]} nodes Nodes the oof client connects to
   * @memberof OofClient
   */
  constructor(client, nodes) {
    /**
     * The nodes the oof client connects to
     * 
     * @type {Node[]}
     */
    this.nodes = nodes && nodes.map(n => new Nodes(n, this)) || []

    /**
     * The Discord Client this OofClient is for
     * 
     * @type {Object.<string, Client>}
     */
    this.client = client

    /**
     * The players for each guild
     * 
     * @type {Guild}
     */
    this.guilds = {}
  }

  /**
   * Joins a voice channel
   * @arg {VoiceChannel} channel The voice channel to connect to
   * @returns {Promise<Player>} Resolves with the player associated with the given voice channel
   */
  async join(channel) {
    let node = this._findOptimalNode(channel.guild.region)
    this.guilds[channel.guild.id] = await node.createPlayer(channel)
    this.guilds[channel.guild.id].once("disconnected", () => {
      console.log("Node disconnect")
      delete this.guilds[channel.guild.id]
      this.guilds[channel.guild.id] = null
    })
    return this.guilds[channel.guild.id]
  }

  /**
   * Finds an optimal oof node based on guild region
   * @arg {String} region Region of the guild
   * @private
   * @returns {Node} The node chosen for the guild
   */
  _findOptimalNode(region) {
    let nodes = this.nodes.map(node => node.connected)
    let regionalNodes = []
    if(region) regionalNodes = this.nodes.filter(node => REGION_MAP[node.region].includes(simplifyRegion(region)))
    if(regionalNodes.length) nodes = regionalNodes
    nodes = nodes.sort((a, b) => (100 * (a.stats.load / a.stats.cores)) - (100 * (b.stats.load / b.stats.cores)))
    let node = nodes[0]
    return node
  }
}

function simplifyRegion(region) {
  if(region.startsWith("vip-")) region = region.replace("vip-", "")
  return region.split("-")[0]
}
