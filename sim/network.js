var randombytes = require('randombytes')
var Introducer = require('../')
var connected = require('connected-components')
var toalist = require('edges-to-adjacency-list')
var through = require('through2')
var summary = require('summary-statistics')
var table = require('text-table')

var nodes = []
for (var i = 0; i < 50; i++) {
  nodes.push(new Introducer({
    id: randombytes(20)
  }))
}

var connections = {}
var alist, edges = []
var bytes = []

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
  var stat = summary(bytes)
  console.log(table([
    [ 'total bytes', stat.sum ],
    [ 'bytes/node', stat.avg ],
    [ 'min bytes', stat.min ],
    [ 'q1 bytes', stat.q1 ],
    [ 'med bytes', stat.median ],
    [ 'q3 bytes', stat.q3 ],
    [ 'max bytes', stat.max ]
  ]))
})

function measure (index, stream) {
  bytes[index] = 0
  stream.pipe(through(function (buf, enc, next) {
    bytes[index] += buf.length
    next()
  }))
}
