var randombytes = require('randombytes')
var Router = require('../')
var through = require('through2')
var shuf = require('array-shuffle')
var createHash = require('crypto').createHash
var summary = require('summary-statistics')
var bufeq = require('buffer-equals')

var ip = require('ip-packet')
var udp = require('udp-packet')

var Simulator = require('network-simulator')
var sim = new Simulator()

var connected = {}, ifaces = {}, counts = {}, addrs = {}
var NODES = 50
for (var i = 1; i <= NODES; i++) (function (i) {
  var node = sim.createNode(i, [ 'eth0', 'eth1', 'eth2', 'eth3', 'eth4' ])
  ifaces[i] = Object.keys(node.ifaces)
  var added = 0
  shuf(Object.keys(sim.nodes)).forEach(function (key) {
    if (added >= 3) return
    if (key === String(i)) return
    var ckey = [key,i].sort().join(',')
    if (connected[ckey]) return
    if (ifaces[key].length === 0) return
    if (ifaces[i].length === 0) return
    if (!addrs[key]) addrs[key] = {}
    if (!addrs[i]) addrs[i] = {}
    addrs[key][ifaces[key][0]] = '192.168.1.' + i
    addrs[i][ifaces[i][0]] = '192.168.1.' + key
    connected[ckey] = true
    added ++
    node.link(ifaces[i].shift(), sim.nodes[key], ifaces[key].shift())
  })
})(i)

var routers = {}
Object.keys(sim.nodes).forEach(function (i) {
  var node = sim.nodes[i]
  var addr = '192.168.1.' + i
  counts[i] = { packets: 0, data: 0, miss: 0, match: 0 }

  var router = new Router({ id: randombytes(8) })
  routers[i] = router
  var seen = {}
  Object.keys(addrs[i]).forEach(function (iface) {
    var stream = router.createStream(iface, addr)
    var srcPort = Math.floor(Math.random() * Math.pow(2,16))
    stream.pipe(through(function (buf, enc, next) {
      node.send(iface, ip.encode({
        version: 4,
        protocol: 0x11,
        sourceIp: addr,
        destinationIp: addrs[i][iface],
        data: udp.encode({
          sourcePort: srcPort,
          destinationPort: 6697,
          data: buf
        })
      }))
      next()
    }))
    node.on(iface + ':message', function (buf) {
      counts[i].packets += 1
      counts[i].data += buf.length

      var hash = createHash('sha1').update(buf).digest('hex')
      if (seen[hash]) return
      seen[hash] = true
      var packet = ip.decode(buf)
      var upacket = packet.protocol === 0x11 && udp.decode(packet.data)

      var rface
      if (packet.destinationIp === addr && upacket
      && upacket.destinationPort === 6697) {
        stream.write(upacket.data)
      } else if (packet.destinationIp === addr) {
        //console.log(packet)
      } else if (rface = router.lookup(packet.destinationIp)) {
        counts[i].match += 1
        node.send(rface, buf)
      } else {
        counts[i].miss += 1
        shuf(Object.keys(node.ifaces))
          .filter(function (key) { return key !== i })
          .forEach(function (key) {
            node.send(key, buf)
          })
      }
    })
  })
})

setTimeout(function () {
  printSummary('WARMUP')
  sendData()
}, 5000)

var N = 100
var pending = N
var txdata = 0

function sendData () {
  Object.keys(routers).forEach(function (i) {
    var router = routers[i]
    Object.keys(router.interfaces).forEach(function (ifname) {
      var ivs = router.interfaces[ifname].intervals
      Object.keys(ivs).forEach(function (key) {
        clearInterval(ivs[key])
      })
    })
  })

  var dstnode = sim.nodes[NODES]
  var dst = '192.168.1.' + NODES
  var sent = {}

  Object.keys(dstnode.ifaces).forEach(function (iface) {
    dstnode.on(iface + ':message', function onmessage (buf) {
      var packet = ip.decode(buf)
      var hex = packet.data.toString('hex')
      if (packet.destinationIp === dst && sent[hex] > 0) {
        sent[hex] -= 1
        txdata += buf.length
        if (--pending === 0) done()
      }
    })
  })

  for (var i = 0; i < N; i++) (function (i) {
    var srci = Math.floor(Math.random() * (NODES-1) + 1)
    var src = '192.168.1.' + srci
    var msg = randombytes(Math.floor(Math.random() * 1000))
    var hex = msg.toString('hex')
    sent[hex] = (sent[hex] || 0) + 1

    sim.nodes[srci].send('eth0', ip.encode({
      version: 4,
      protocol: 0,
      sourceIp: src,
      destinationIp: dst,
      data: msg
    }))
  })(i)
}

function done () {
  printSummary('FINAL')
  estats()
  process.removeListener('exit', onexit)
}
process.on('exit', onexit)
function onexit () {
  printSummary('EXIT')
  estats()
}

function estats () {
  console.log('*** DELIVERED: ' + (N-pending) + '/' + N)
  console.log('*** TRANSFERRED: ' + txdata + ' BYTES')
}

function printSummary (pre) {
  console.log('-------------------------')
  var props = {
    packets: 'PACKETS',
    data: 'DATA',
    miss: 'MISS',
    match: 'MATCH'
  }
  Object.keys(props).forEach(function (key) {
    console.log('# ' + pre + ' ' + props[key] + ' COUNT')
    console.log(summary(Object.keys(counts).map(function (ckey) {
      return counts[ckey][key]
    })))
  })
}
