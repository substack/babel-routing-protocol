var randombytes = require('randombytes')
var Router = require('../')
var through = require('through2')
var shuf = require('array-shuffle')
var ip = require('ip-packet')
var createHash = require('crypto').createHash
var summary = require('summary-statistics')

var Simulator = require('network-simulator')
var sim = new Simulator()

var connected = {}, ifaces = {}, counts = {}
for (var i = 1; i <= 50; i++) (function (i) {
  var node = sim.createNode(i, [ 'eth0', 'eth1', 'eth2', 'eth3', 'eth4' ])
  ifaces[i] = Object.keys(node.ifaces)
  counts[i] = { packets: 0, data: 0 }
  var router = new Router({ id: randombytes(8) })
  var seen = {}
  ;[ 'eth0', 'eth1', 'eth2', 'eth3', 'eth4' ].forEach(function (iface) {
    node.on(iface + ':message', function (buf) {
      counts[i].packets += 1
      counts[i].data += buf.length
      var hash = createHash('sha1').update(buf).digest('hex')
      if (seen[hash]) return
      seen[hash] = true
      var packet = ip.decode(buf)

      if (packet.destinationIp.split('.')[3] === String(i)) {
        //console.log(packet)
      } else if (router.lookup(packet.destinationIp)) {
        console.log('TODO: intelligently route')
      } else {
        Object.keys(node.ifaces).forEach(function (key) {
          if (iface !== key) node.send(key, buf)
        })
      }
    })
  })
  var added = 0
  shuf(Object.keys(sim.nodes)).forEach(function (key) {
    if (added >= 3) return
    if (key === String(i)) return
    var ckey = [key,i].sort().join(',')
    if (connected[ckey]) return
    if (ifaces[key].length === 0) return
    if (ifaces[i].length === 0) return
    connected[ckey] = true
    added ++
    node.link(ifaces[i].shift(), sim.nodes[key], ifaces[key].shift())
  })
})(i)

for (var i = 0; i < 100; i++) {
  sim.nodes[1].send('eth0', ip.encode({
    version: 4,
    protocol: 0,
    sourceIp: '192.168.0.1',
    destinationIp: '192.168.0.50',
    data: Buffer('whatever! ' + i)
  }))
}

console.log('# PACKET COUNT')
console.log(summary(Object.keys(counts).map(function (key) {
  return counts[key].packets
})))
console.log('# DATA')
console.log(summary(Object.keys(counts).map(function (key) {
  return counts[key].data
})))
