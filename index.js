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

Router.prototype.createStream = function (ifname, addr) {
  var self = this
  var iface = new Iface(this.id, addr)
  self.interfaces[ifname] = iface
  self.neighbors[addr] = {
    iface: iface,
    ifname: ifname
  }
  endof(iface, function () {
    delete self.interfaces[iface]
    delete self.neighbors[addr]
  })
  iface.on('route', function (route) {
    var raddr = route.prefix[0] + '.' + route.prefix[1] + '.'
      + route.prefix[2] + '.' + route.prefix[3]
    self.routes[raddr] = ifname
    Object.keys(self.interfaces).forEach(function (key) {
      if (key !== ifname) self.interfaces[key].advertise(route)
    })
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
  if (this.neighbors[addr]) return this.neighbors[addr].ifname
  if (this.routes[addr]) return this.routes[addr]
  return null
}
