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
  this.hexid = this.id.toString('hex')
  this.streams = []
  this.recent = {}
  this.edges = {}
  this.recentLen = 0
}

Introducer.prototype.createStream = function () {
  var self = this
  var stream = createStream()
  stream.on('message', function (msg) {
    var h = createHash('sha1')
    if (msg.target) h.update(msg.target)
    if (msg.payload) h.update(msg.payload)
    var hash = h.digest()
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
  var now = Date.now()
  if (msg.target && bufeq(msg.target, self.id)) {
    self.emit('message', msg.payload)
  } else self._send(msg)
}

Introducer.prototype.send = function (target, payload) {
  this._send({ target: target, payload: payload })
}

Introducer.prototype._send = function (msg) {
  var self = this
  var msg = {
    target: msg.target,
    payload: msg.payload
  }
  var sent = {}
  var sentPending = Math.min(self.streams.length, 3)
  while (sentPending > 0) {
    var i = Math.floor(Math.random() * self.streams.length)
    if (sent[i]) continue
    sent[i] = true
    sentPending--
    self.streams[i].message(msg)
    self.emit('send', msg)
  }
}
