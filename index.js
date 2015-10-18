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
  this.seqno = 0
  this.neighbors = {}
  this.interfaces = {}
  this.sources = {}
  this.routes = {}
  this.pending = {}
}

Router.prototype.createStream = function (ifaceName, addr) {
  var self = this
  var iface = new Iface(addr)
  self.interfaces[ifaceName] = iface
  endof(iface, function () {
    delete self.interfaces[ifaceName]
  })
  return iface
}

Router.prototype.close = function () {
  var self = this
  Object.keys(self.interfaces).forEach(function (key) {
    self.interfaces[key].close()
  })
}

Router.prototype.lookup = function (addr) {
  return false
}
