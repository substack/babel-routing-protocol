var Writable = require('readable-stream/writable')
var inherits = require('inherits')

module.exports = Decoder
inherits(Decoder, Writable)

function Decoder (cb) {
  if (!(this instanceof Decoder)) return new Decoder(cb)
  Writable.call(this)
  this.cb = cb
  this.buffer = null
}

Decoder.prototype._write = function (buf, enc, next) {
  if (this.buffer) buf = Buffer.concat([ this.buffer, buf ])
  this.buffer = null
  if (buf[0] !== 42) return next()
  if (buf[1] !== 2) return next()
  var len = buf.readUInt16BE(2)
  if (len < buf.length - 4) {
    this.buffer = buf
    return next()
  }
  this._decodeTLV(buf.slice(4, len + 4))
  if (buf.length - 4 > len) {
    this._write(buf.slice(len + 4), enc, next)
  } else next()
}

Decoder.prototype._decodeTLV = function (buf) {
  for (var offset = 0; offset < buf.length; ) {
    var type = buf[offset+0]
    if (type === 0) { // pad1
      offset++
      continue
    }
    var len = buf[offset+1]
    if (type === 1) {
      // padn
    } else if (type === 2) {
      this.cb({
        type: 'ackreq',
        nonce: buf.readUInt16BE(offset+4),
        csec: buf.readUInt16BE(offset+6)
      })
    } else if (type === 3) {
      this.cb({
        type: 'ack',
        nonce: buf.readUInt16BE(offset+2)
      })
    } else if (type === 4) {
      this.cb({
        type: 'hello',
        seq: buf.readUInt16BE(offset+4),
        csec: buf.readUInt16BE(offset+6)
      })
    } else if (type === 5) {
      this.cb({
        type: 'ihu',
        addrEnc: buf[offset+2],
        rxcost: buf.readUInt16BE(offset+4),
        csec: buf.readUInt16BE(offset+6),
        addr: buf.slice(offset+8, offset+2+len)
      })
    } else if (type === 6) {
      this.cb({
        type: 'routerid', 
        id: buf.slice(offset+4, offset+2+len)
      })
    } else if (type === 7) {
      this.cb({
        type: 'nexthop',
        addrEnc: buf[offset+2],
        addr: buf.slice(offset+4, offset+4+len-2)
      })
    } else if (type === 8) {
      this.cb({
        type: 'update',
        addrEnc: buf[offset+2],
        flags: buf[offset+3],
        plen: buf[offset+4],
        omitted: buf[offset+5],
        csec: buf.readUInt16BE(offset+6),
        seq: buf.readUInt16BE(offset+8),
        metric: buf.readUInt16BE(offset+10),
        prefix: buf.slice(offset+12, offset+2+len)
      })
    } else if (type === 9) {
      this.cb({
        addrEnc: buf[offset+2],
        plen: buf[offset+3],
        prefix: buf.slice(offset+4, offset+2+len)
      })
    } else if (type === 10) {
      this.cb({
        addrEnc: buf[offset+2],
        plen: buf[offset+3],
        seq: buf.readUInt16BE(offset+4),
        hopCount: buf[offset+6],
        routerId: buf.slice(offset+8, offset+16),
        prefix: buf.slice(offset+16, offset+2+len)
      })
    }
    offset += len + 2
  }
}
