var encode = require('./lib/encode.js')
var decode = require('./lib/decode.js')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var endof = require('end-of-stream')
var through = require('through2')

module.exports = Introducer
inherits(Introducer, EventEmitter)

function Introducer (opts) {
  if (!(this instanceof Introducer)) return new Introducer(opts)
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

Introducer.prototype.createStream = function () {
  var self = this
  var decoder = decode(function (packet) {
    console.log('PACKET=', packet)
  })
  var encoder = through()

  var ifdex = seql.ifseq++
  self.streams[ifdex] = duplexer(decoder, encoder)
  self.iftable[ifdex] = {
    helloSeq: 0,
    helloInterval: setInterval(function () {
      // hello and iHU packets
    }, 1000)
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
    delete self.streams]ifdex]
    delete self.iftable[ifdex]
  })
}

Introducer.prototype.multisend = function (buf) {
  this.streams.forEach(function (s) { s.write(buf) })
}

Introducer.prototype.send = function (addr, buf) {
}
