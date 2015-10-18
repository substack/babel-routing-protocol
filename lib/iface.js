var Duplex = require('readable-stream/duplex')
var inherits = require('inherits')
var decode = require('./decode.js')
var encode = require('./encode.js')

module.exports = Iface
inherits(Iface, Duplex)

function Iface (addr) {
  if (!(this instanceof Iface)) return new Iface(addr)
  var self = this
  Duplex.call(self)
  self.decoder = decode(function (msg) {
    if (msg.type === 'hello') {
      self.push(encode([
        {
          type: 'ihu',
          addr: addr,
          addrEnc: 1,
          csec: self.helloMsec/10,
          rxcost: 555
        }
      ]))
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
  self.intervals.update = setInterval(function () {
    // ...
  }, 1000)
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
