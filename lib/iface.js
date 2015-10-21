var Duplex = require('readable-stream/duplex')
var inherits = require('inherits')
var decode = require('./decode.js')
var encode = require('./encode.js')

module.exports = Iface
inherits(Iface, Duplex)

function Iface (id, addr) {
  if (!(this instanceof Iface)) return new Iface(id, addr)
  var self = this
  self.id = id
  Duplex.call(self)
  var bufaddr = Buffer(addr.split('.').map(Number))

  self.decoder = decode(function (msg) {
    if (msg.type === 'hello') {
      self.push(encode([
        {
          type: 'ihu',
          addr: bufaddr,
          addrEnc: 1,
          csec: self.helloMsec/10,
          rxcost: 555
        }
      ]))
    } else if (msg.type === 'route') {
      self.emit('route', msg)
    }
  })
  self.once('finish', function () { self.decoder.end() })
  self.intervals = {}
  self._advertised = {}
  self._advertiseQueue = []

  self.exHelloSeq = 0
  self.helloSeq = 0
  self.hellos = []
  self.push(encode([
    {
      type: 'routerid',
      id: self.id
    },
    {
      type: 'route',
      addrEnc: 1,
      prefix: bufaddr,
      plen: 32
    },
    {
      type: 'hello',
      seq: self.helloSeq++,
      csec: self.helloMsec/10
    }
  ]))

  self.helloMsec = 1000
  self.intervals.hello = setInterval(function () {
    self.push(encode([
      {
        type: 'hello',
        seq: self.helloSeq++,
        csec: self.helloMsec/10
      }
    ]))
  }, self.helloMsec)
  self.updateMsec = 1000
  self.intervals.update = setInterval(function () {
    if (self._advertiseQueue.length === 0) return
    self.push(encode(self._advertiseQueue.splice(0).map(function (r) {
      return {
        type: 'route',
        addrEnc: r.addrEnc,
        prefix: r.prefix,
        plen: r.plen
      }
    })))
  }, self.updateMsec)
}

Iface.prototype.advertise = function (route) {
  var hexaddr = route.prefix.toString('hex')
  if (this._advertised[hexaddr]) return
  this._advertised[hexaddr] = true
  this._advertiseQueue.push(route)
}

Iface.prototype._write = function (buf, enc, next) {
  if (this.closed) return
  return this.decoder._write(buf, enc, next)
}

Iface.prototype._read = function () {}

Iface.prototype.close = function () {
  var self = this
  Object.keys(self.intervals).forEach(function (key) {
    clearInterval(self.intervals[key])
  })
  self.closed = true
  self.push(null)
}
