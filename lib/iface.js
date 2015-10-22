var Duplex = require('readable-stream/duplex')
var inherits = require('inherits')
var decode = require('./decode.js')
var encode = require('./encode.js')

module.exports = Iface
inherits(Iface, Duplex)

function Iface (id, addr, D) {
  if (!(this instanceof Iface)) return new Iface(id, addr, D)
  var self = this
  self.D = D
  self.id = id
  Duplex.call(self)
  var bufaddr = Buffer(addr.split('.').map(Number))

  self.push(encode([
    {
      type: 'nexthop',
      addr: bufaddr,
      addrEnc: 1
    }
  ]))
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
    } else if (msg.type === 'update') {
      self.emit('update', msg)
    }
  })
  self.once('finish', function () { self.decoder.end() })
  self.intervals = {}

  self.exHelloSeq = 0
  self.helloSeq = 0
  self.hellos = []

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
    self.push(encode(Object.keys(self.D).map(function (raddr) {
      return {
        type: 'update',
        addrEnc: 1,
        prefix: Buffer(raddr.split('.').map(Number)),
        plen: 32,
        flags: 0,
        omitted: 0,
        metric: self.D[raddr]
      }
    })))
  }, self.updateMsec)
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
