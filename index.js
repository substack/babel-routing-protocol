var encode = require('./lib/encode.js')
var decode = require('./lib/decode.js')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var endof = require('end-of-stream')
var through = require('through2')
var duplexer = require('duplexer2')

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
  this.streams = {}
  this.iftable = {}
  this.seqno = 0
  this.neighbors = {}
  this.sources = {}
  this.routes = {}
  this.pending = {}
}

Router.prototype.createStream = function (addr) {
  var self = this
  var decoder = decode(function (packet) {
    console.log('PACKET=', packet)
    if (packet.type === 'hello') {
      encoder.write(encode.packet(Buffer.concat([
        encode.ihu({
          addr: addr,
          addrEnc: 1,
          csec: 50,
          rxcost: 555
        })
      ])))
    }
  })
  var encoder = through()

  var ifdex = self.ifseq++
  var stream = duplexer(decoder, encoder)
  self.streams[ifdex] = stream
  self.iftable[ifdex] = {
    helloSeq: 0,
    helloInterval: setInterval(function () {
      stream.push(encode.packet(Buffer.concat([
        encode.hello({ seq: 1, csec: 50 })
      ])))
      // hello and iHU packets
    }, 1000),
    updateInterval: setInterval(function () {
      // route updates
    }, 1000)
  }
  self.neighbors[ifdex] = { // should be indexed by address
    address: null,
    hellos: [],
    txcost: null,
    exHelloSeq: 0
  }
  endof(stream, function () {
    delete self.streams[ifdex]
    delete self.iftable[ifdex]
  })
  return stream
}

Router.prototype.multisend = function (buf) {
  this.streams.forEach(function (s) { s.write(buf) })
}

Router.prototype.send = function (addr, buf) {
}
