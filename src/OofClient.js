let Node = require("./Node")

/**
 * An Oof Client
 * @arg {Client} client The Discord Client instance this Oof Client is for
 * @arg {Array} nodes The Oof server nodes to connect to
 * @param {Array[Node]} nodes Nodes the oof client connects to
 * @param {Client} client The Discord Client this Oof Client is for
 * @param {Object} guilds The players for each guild
 * @param {Object} regionMap the map of node region to guild region. In other words, the region of the node is used as the key and if a guild's region is contained within the array, it's eligible to be connected to for that guild
*/
module.exports = class OofClient {
  constructor(client, nodes) {
    this.nodes = []
    this.client = client
    for(let node of nodes) {
      this.nodes.push(new Node(node, this))
    }
    this.guilds = {}
    this.regionMap = {
      us: ["us", "brazil"]
    }
  }

  /**
   * Joins a voice channel
   * @arg {VoiceChannel} channel The voice channel to connect to
   * @returns {Promise<Player>} Resolves with the player associated with the given voice channel
   */
  async join(channel) {
    let node = this._findOptimalNode(channel.guild.region)
    return this.guilds[channel.guild.id] = await node.createPlayer(channel)
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
    if(region) regionalNodes = this.nodes.filter(node => this.regionMap[node.region].includes(simplifyRegion(region)))
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
