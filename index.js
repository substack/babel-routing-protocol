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
  self.D[addr] = 0

  self.interfaces[ifname] = iface
  endof(iface, function () {
    delete self.interfaces[iface]
  })
  iface.on('route', function (route) {
    // ...
  })
  iface.on('nexthop', function (hop) {
    self.B = toAddr(hop.addr)
    self.NH[self.B] = ifname
    self.D[self.B] = 1
  })
  iface.on('update', function (update) {
    var A = toAddr(update.prefix)
    // http://tools.ietf.org/html/rfc6126#section-2.2
    if (self.lookup(A) === ifname) {
      self.NH[A] = ifname
      self.D[A] = C(A, self.B) + self.D[self.B]
      return
    }
    if (self.D[A] === undefined) {
      self.D[A] = Infinity
      self.NH[A] = ifname
    }
    if (C(A, self.B) + self.D[self.B] < self.D[A]) {
      self.NH[A] = ifname
      self.D[A] = C(A, self.B) + self.D[self.B]
    }
  })
  return iface
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
