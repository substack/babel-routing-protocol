var randombytes = require('randombytes')
var Introducer = require('../')
var connected = require('connected-components')
var toalist = require('edges-to-adjacency-list')

var nodes = []
for (var i = 0; i < 50; i++) {
  nodes.push(new Introducer({
    id: randombytes(20)
  }))
}

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
      var s = nodes[x].createStream()
      s.pipe(node.createStream()).pipe(s)
    }
  })
  alist = toalist(edges)
} while (connected(alist).length > 1)

/*
edges.forEach(function (edge) {
  console.log(edge)
})
*/

nodes[0].send(nodes[1].id, Buffer('hello!'))

nodes[1].on('message', function (buf) {
  console.log('MESSAGE=' + buf)
})
