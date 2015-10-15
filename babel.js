function packet (body) {
  var buf = new Buffer(body.length + 4)
  buf[0] = 42 // magic
  buf[1] = 2 // version
  buf.writeUInt16BE(body.length, 2)
  return buf
}

function pad1 () {
  return Buffer([0])
}

function padn (n) {
  var buf = new Buffer(n + 2)
  buf.fill(0)
  buf[0] = 1
  buf[1] = n
  return buf
}

function ackReq (csec) {
  var buf = new Buffer(8)
  buf[0] = 2
  buf[1] = 6
  buf.writeUInt16BE(0, 2)
  buf.writeUInt16BE(Math.floor(Math.random() * 65536), 4)
  buf.writeUInt16BE(csec, 6)
  return buf
}

function ack (nonce) {
  var buf = new Buffer(4)
  buf[0] = 3
  buf[1] = 2
  buf.writeUInt16BE(nonce, 2)
  return buf
}

function hello (seqno, csec) {
  var buf = new Buffer(8)
  buf[0] = 4
  buf[1] = 6
  buf.writeUInt16BE(0, 2)
  buf.writeUInt16BE(seqno, 4)
  buf.writeUInt16BE(csec, 6)
  return buf
}

function ihu (addr, addrEnc, rxcost, csec) {
  var buf = new Buffer(addr.length + 8)
  buf[0] = 5
  buf[1] = addr.length + 6
  buf[2] = addrEnc
  buf[3] = 0
  buf.writeUInt16BE(rxcost, 4)
  buf.writeUInt16BE(csec, 6)
  addr.copy(buf, 8)
  return buf
}

function routerId (id) {
  var buf = new Buffer(4 + id.length)
  buf[0] = 6
  buf[1] = id.length + 2
  buf.writeUInt16BE(0, 2)
  id.copy(buf, 4)
  return buf
}

function nextHop (addr, addrEnc) {
  var buf = new Buffer(4 + addr.length)
  buf[0] = 7
  buf[1] = addr.length + 2
  buf[2] = addrEnc
  buf[3] = 0
  addr.copy(buf, 4)
  return buf
}

function update (prefix, plen, addrEnc, flags, omitted, csec, seqno, metric) {
  var buf = new Buffer(prefix.length + 12)
  buf[0] = 8
  buf[1] = prefix.length + 10
  buf[2] = addrEnc
  buf[3] = flags
  buf[4] = plen
  buf[5] = omitted
  buf.writeUInt16BE(csec, 6)
  buf.writeUInt16BE(seqno, 8)
  buf.writeUInt16BE(metric, 10)
  prefix.copy(buf, 12)
  return buf
}

function route (addrEnc, prefix, plen) {
  var buf = new Buffer(prefix.length + 4)
  buf[0] = 9
  buf[1] = prefix.length + 2
  buf[2] = addrEnc
  buf[3] = plen
  prefix.copy(buf, 4)
  return buf
}

function seqno (addrEnc, plen, seqno, hopCount, routerId, prefix) {
  var buf = new Buffer(routerId.length + prefix.length + 8)
  buf[0] = 10
  buf[1] = buf.length - 2
  buf[2] = addrEnc
  buf[3] = plen
  buf.writeUInt16BE(seqno, 4)
  buf[6] = hopCount
  buf[7] = 0
  routerId.copy(buf, 8)
  prefix.copy(buf, 8 + routerId.length)
  return buf
}
