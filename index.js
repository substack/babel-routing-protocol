var pbuf = require('protocol-buffers-stream')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var endof = require('end-of-stream')

var fs = require('fs')
var path = require('path')
var schema = fs.readFileSync(path.join(__dirname, 'schema.proto'), 'utf8')

module.exports = Introducer
inherits(Introducer, EventEmitter)

function Introducer (opts) {
  if (!(this instanceof Introducer)) return new Introducer(opts)
  EventEmitter.call(this)
  if (!opts) opts = {}
  this.id = opts.id
  this.neighbors = {}
  this.metric = opts.metric
}

Introducer.prototype.createStream = function () {
  var self = this
  var stream = pbuf(schema)
  var otherId = null, otherIdHex = null
  stream.on('message', function (msg) {
    if (!otherId && msg.route) {
      otherId = msg.route[msg.route[msg.route.length-1]]
      otherIdHex = otherId.toString('hex')
      self.neighbors[otherIdHex] = { stream: stream, id: otherId }
      self.emit('neighbor', otherId, stream)
    }
    self._onMessage(otherId, msg)
  })
  endof(stream, function () {
    if (otherId) {
      delete self.neighbors[otherIdHex]
      self.emit('disconnect', otherId)
    }
  })
  stream.message({ route: [ self.id ] })
  return stream
}

Introducer.prototype._onMessage = function (id, msg) {
  var self = this
  console.log('MESSAGE', msg)
}

Introducer.prototype.search = function (target, signal) {
  var self = this
  var sorted = self._sort(target)

  Object.keys(self.neighbors).sort(function (a, b) {
    return self._compare(a, b)
  })
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
