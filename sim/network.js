var randombytes = require('randombytes')
var Introducer = require('../')
var through = require('through2')
var shuf = require('array-shuffle')

var Simulator = require('network-simulator')
var sim = new Simulator()

var connected = {}, ifaces = {}
for (var i = 0; i < 50; i++) (function (i) {
  var node = sim.createNode(i, [ 'eth0', 'eth1', 'eth2', 'eth3', 'eth4' ])
  ifaces[i] = []
  var router = new Introducer({ id: randombytes(8) })
  ;[ 'eth0', 'eth1', 'eth2', 'eth3', 'eth4' ].forEach(function (iface) {
    node.on(iface + ':message', function (buf) {
      console.log('BUF=', buf)
    })
  })

  shuf(Object.keys(sim.nodes)).forEach(function (key) {
    if (key === String(i)) return
    var ckey = [key,i].sort().join(',')
    if (connected[ckey]) return
    connected[ckey] = true
    if (!ifaces[key]) ifaces[key] = [ 'eth0', 'eth1', 'eth2', 'eth3', 'eth4' ]
    if (ifaces[key].length === 0) return
    if (ifaces[i].length === 0) return
    node.link(ifaces[i].shift(), sim.nodes[key], ifaces[key].shift())
  })
})(i)

sim.nodes[0].send('eth0', Buffer('whatever!'))
