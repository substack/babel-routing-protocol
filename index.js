var pbuf = require('protocol-buffers-stream')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var endof = require('end-of-stream')
var bufeq = require('buffer-equals')

var fs = require('fs')
var path = require('path')
var schema = fs.readFileSync(path.join(__dirname, 'schema.proto'), 'utf8')
var createStream = pbuf(schema)
var createHash = require('crypto').createHash

module.exports = Introducer
inherits(Introducer, EventEmitter)

function Introducer (opts) {
  if (!(this instanceof Introducer)) return new Introducer(opts)
  EventEmitter.call(this)
  if (!opts) opts = {}
  this.id = opts.id
  this.streams = []
  this.recent = {}
  this.recentLen = 0
}

Introducer.prototype.createStream = function () {
  var self = this
  var stream = createStream()
  stream.on('message', function (msg) {
    var hash = createHash('sha1').update(stream._buffer).digest()
    if (self.recent[hash]) return
    var now = Date.now()
    self.recent[hash] = now
    if (++self.recentLen >= 100) self._purgeRecent(now)
    self._onMessage(msg)
  })
  self.streams.push(stream)
  endof(stream, function () {
    var ix = self.streams.indexOf(stream)
    if (ix >= 0) {
      self.streams.splice(ix, 1)
    }
  })
  return stream
}

Introducer.prototype._purgeRecent = function (now) {
  var self = this
  var sorted = Object.keys(self.recent).sort(function (a, b) {
    return self.recent[a] < self.recent[b] ? -1 : 1
  })
  for (var i = 0; i < 10; i++) {
    delete self.recent[sorted[i]]
    self.recentLen--
  }
}

Introducer.prototype._onMessage = function (msg) {
  var self = this
  if (bufeq(msg.target, self.id)) {
    self.emit('message', msg.payload)
  } else self.send(msg.target, msg.payload)
}

Introducer.prototype.send = function (target, payload) {
  var self = this
  var sent = {}, sentPending = Math.max(self.streams.length, 2)
  while (sentPending > 0) {
    var i = Math.floor(Math.random() * self.streams.length)
    if (sent[i]) continue
    sentPending--
    self.streams[i].message({
      target: target,
      payload: payload
    })
  }
}
