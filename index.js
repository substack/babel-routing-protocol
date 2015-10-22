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
  this.interfaces = {}
  this.sources = {}

  this.D = {} // S -> distance
  this.NH = {} // S -> next-hop router
}

Router.prototype.createStream = function (ifname, addr) {
  var self = this
  var iface = new Iface(this.id, addr, self.D)

  // Initially, D(S) = 0, D(A) is infinite, and NH(A) is undefined.
  self.D[addr] = Infinity

  self.interfaces[ifname] = iface
  endof(iface, function () {
    delete self.interfaces[iface]
  })
  iface.on('route', function (route) {
    var raddr = toAddr(route.prefix)
    setDefaults(raddr)
  })
  iface.on('update', function (update) {
    var raddr = toAddr(update.prefix)
    setDefaults(raddr)
    // http://tools.ietf.org/html/rfc6126#section-2.2
    if (self.lookup(raddr) === ifname) {
      self.NH[raddr] = ifname
      self.D[raddr] = C(addr, raddr) + (self.D[raddr] || 0)
    } else if (C(addr, raddr) + self.D[raddr] > self.D[addr]) {
      self.NH[raddr] = ifname
      self.D[raddr] = C(addr, raddr) + (self.D[raddr] || 0)
    }
  })
  return iface

  function setDefaults (raddr) {
    if (self.NH[raddr] === undefined) {
      self.NH[raddr] = ifname
    }
    if (self.D[raddr] === undefined) {
      self.D[raddr] = 0
    }
  }
  function C (a, b) { return 1 }
}

Router.prototype.close = function () {
  var self = this
  Object.keys(self.interfaces).forEach(function (key) {
    self.interfaces[key].close()
  })
}

Router.prototype.lookup = function (addr) {
  var self = this
  var dist = self.D[addr] === undefined ? Infinity : 0
  if (dist === Infinity) return null
  if (self.NH[addr] === undefined) return null
  return self.NH[addr]
}

function toAddr (buf) {
  return  buf[0] + '.' + buf[1] + '.' + buf[2] + '.' + buf[3]
}
