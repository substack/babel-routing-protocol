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
console.log(msg)
    if (msg.type === 'hello') {
      self.push(encode([
        {
          type: 'ihu',
          addr: addr,
          addrEnc: 1,
          csec: 50,
          rxcost: 555
        }
      ]))
    }
  })
  self.once('finish', function () { self.decoder.end() })

  self.helloInterval = setInterval(function () {
    self.push(encode([
      {
        type: 'hello',
        seq: self.helloSeq++,
        csec: 50
      }
    ]))
  }, 1000)
  self.updateInterval = setInterval(function () {
    // ...
  }, 1000)
}

Iface.prototype._write = function (buf, enc, next) {
  return this.decoder._write(buf, enc, next)
}

Iface.prototype._read = function () {}
