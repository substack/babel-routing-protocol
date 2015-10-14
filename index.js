var pbuf = require('protocol-buffers-stream')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var endof = require('end-of-stream')

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
  this.neighbors = {}
  this.recent = {}
  this.recentLen = 0
  this.metric = opts.metric
  this._pending = 0
}

Introducer.prototype.createStream = function () {
  var self = this
  var stream = createStream()
  var otherId = null, otherIdHex = null
  self._pending++
  stream.on('message', function (msg) {
    var hash = createHash('sha1').update(stream._buffer).digest()
    if (self.recent[hash]) return
    var now = Date.now()
    self.recent[hash] = now
    if (++self.recentLen >= 100) self._purgeRecent(now)

    if (!otherId && msg.route) {
      otherId = msg.route.hops[msg.route.hops.length-1]
      otherIdHex = otherId.toString('hex')
      self.neighbors[otherIdHex] = { stream: stream, id: otherId }
      self.emit('neighbor', otherId, stream)
      if (--self._pending === 0) self.emit('_ready')
    }
    self._onMessage(otherId, msg)
  })
  endof(stream, function () {
    if (otherId) {
      delete self.neighbors[otherIdHex]
      self.emit('disconnect', otherId)
    } else if (--self._pending === 0) self.emit('_ready')
  })
  stream.message({ route: { hops: [ self.id ] } })
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

Introducer.prototype._onMessage = function (id, msg) {
  var self = this
  if (msg.target && msg.route && msg.route.hops.length < 2) {
    self.send(xtend(msg, { route: msg.route.hops.concat(self.id) }))
  }
}

Introducer.prototype.search = function (q, cb) {
  if (!q.target) throw new Error('query target not provided')
  var self = this
  if (self._pending > 0) {
    return self.once('_ready', function () { self.search(q, cb) })
  }
  self.send({
    target: q.target,
    signal: q.signal,
    route: q.route ? q.route.concat(self.id) : [self.id]
  })
}

Introducer.prototype.send = function (q, cb) {
  var self = this
  var sorted = self._sort(q.target)
  if (q.route) {
    var routed = {}
    q.route.forEach(function (id) { routed[id.toString('hex')] = true })
    sorted = sorted.filter(function (key) { return !routed[key] })
  }
  var len = Math.min(sorted.length, 2)
  for (var i = 0; i < len; i++) {
    var key = sorted[i]
    self.neighbors[key].stream.message({
      target: q.target,
      signal: q.signal,
      route: { hops: q.route ? q.route.concat(self.id) : [self.id] }
    })
  }
}

Introducer.prototype._sort = function (target) {
  var self = this
  var keys = Object.keys(self.neighbors)
  var distances = {}
  keys.forEach(function (key) {
    distances[key] = self.metric(target, self.neighbors[key].id)
  })
  return keys.sort(function (a, b) {
    return greater(distances[a], distances[b]) ? 1 : -1
  })
}

function greater (a, b) {
  var len = Math.max(a.length, b.length)
  for (var i = 0; i < len; i++) {
    if (a[i] < b[i]) return false
    if (a[i] > b[i]) return true
  }
  return false
}
