var encode = require('./lib/encode.js')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var endof = require('end-of-stream')

module.exports = Introducer
inherits(Introducer, EventEmitter)

function Introducer (opts) {
  if (!(this instanceof Introducer)) return new Introducer(opts)
  EventEmitter.call(this)
  if (!opts) opts = {}
  this.streams = []
}

Introducer.prototype.createStream = function () {
}

Introducer.prototype.multisend = function (buf) {
  this.streams.forEach(function (s) { s.write(buf) })
}

Introducer.prototype.send = function (addr, buf) {
}
