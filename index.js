var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var endof = require('end-of-stream')
var Iface = require('./lib/iface.js')

module.exports = Router
inherits(Router, EventEmitter)

function Router (opts) {
  if (!(this instanceof Router)) return new Router(opts)
  EventEmitter.call(this)
  if (!opts) opts = {}
  this.id = opts.id // 8 octets
  if (!this.id) throw new Error('router id required')
  if (this.id.length !== 8) throw new Error('router id must be 8 bytes')
  this.ifseq = 0
  this.seqno = 0
  this.neighbors = {}
  this.sources = {}
  this.routes = {}
  this.pending = {}
}

Router.prototype.createStream = function (addr) {
  var self = this
  var iface = new Iface(addr)
  var ifdex = self.ifseq++
  self.neighbors[ifdex] = iface
  endof(iface, function () {
    delete self.neighbors[ifdex]
  })
  return iface
}

Router.prototype.multisend = function (buf) {
  //this.streams.forEach(function (s) { s.write(buf) })
}

Router.prototype.send = function (addr, buf) {
}
