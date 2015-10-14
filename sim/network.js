var randombytes = require('randombytes')
var xor = require('bitwise-xor')
var Introducer = require('../')

var nodes = []
for (var i = 0; i < 50; i++) {
  nodes.push(new Introducer({
    id: randombytes(20),
    metric: xor
  }))
}

var connections = {}

nodes.forEach(function (node, nodei) {
  for (var i = 0; i < 3; i++) {
    do {
      var x = Math.floor(Math.random() * nodes.length)
      var key = [nodei,x].sort().join(',')
    } while (connections[key])
    connections[key] = true
    var s = nodes[x].createStream()
    s.pipe(node.createStream()).pipe(s)
  }
})

Object.keys(connections).forEach(function (key) {
  console.log(key)
})
