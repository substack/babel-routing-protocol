var randombytes = require('randombytes')
var Introducer = require('../')
var connected = require('connected-components')
var toalist = require('edges-to-adjacency-list')
var through = require('through2')
var summary = require('summary-statistics')
var table = require('text-table')

var bytes = [], sent = []

var nodes = []
for (var i = 0; i < 50; i++) (function (index) {
  var node = new Introducer({
    id: randombytes(20)
  })
  nodes.push(node)
  sent[index] = 0
  node.on('send', function () { sent[index]++ })
})(i)

var connections = {}
var alist, edges = []

do {
  nodes.forEach(function (node, nodei) {
    for (var i = 0; i < 3; i++) {
      do {
        var x = Math.floor(Math.random() * nodes.length)
        var key = [nodei,x].sort().join(',')
      } while (connections[key])
      connections[key] = true
      edges.push([nodei,x], [x,nodei])
      var a = nodes[x].createStream()
      var b = node.createStream()
      measure(x, a)
      measure(nodei, b)
      a.pipe(b).pipe(a)
    }
  })
  alist = toalist(edges)
} while (connected(alist).length > 1)

nodes[0].send(nodes[1].id, Buffer('hello!'))

nodes[1].on('message', function (buf) {
  console.log('MESSAGE=' + buf)
})

process.once('exit', function () {
  var bstat = summary(bytes)
  var sstat = summary(sent)
  console.log(table([
    [ '', 'bytes', 'messages' ],
    [ 'sum', bstat.sum, sstat.sum ],
    [ 'avg', bstat.avg, sstat.avg ],
    [ 'min', bstat.min, sstat.min ],
    [ 'q1', bstat.q1, sstat.q1 ],
    [ 'med', bstat.median, sstat.median ],
    [ 'q3', bstat.q3, sstat.q3 ],
    [ 'max', bstat.max, sstat.max ]
  ]))
})

function measure (index, stream) {
  bytes[index] = 0
  stream.pipe(through(function (buf, enc, next) {
    bytes[index] += buf.length
    next()
  }))
}
