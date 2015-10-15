exports.packet = function packet (body) {
  var buf = new Buffer(body.length + 4)
  buf[0] = 42 // magic
  buf[1] = 2 // version
  buf.writeUInt16BE(body.length, 2)
  body.copy(buf, 4)
  return buf
}

exports.pad1 = function pad1 () {
  return Buffer([0])
}

exports.padn = function padn (params) {
  var buf = new Buffer(params.n + 2)
  buf.fill(0)
  buf[0] = 1
  buf[1] = n
  return buf
}

exports.ackReq = function ackReq (params) {
  var buf = new Buffer(8)
  buf[0] = 2
  buf[1] = 6
  buf.writeUInt16BE(0, 2)
  buf.writeUInt16BE(Math.floor(Math.random() * 65536), 4)
  buf.writeUInt16BE(params.csec, 6)
  return buf
}

exports.ack = function ack (params) {
  var buf = new Buffer(4)
  buf[0] = 3
  buf[1] = 2
  buf.writeUInt16BE(params.nonce, 2)
  return buf
}

exports.hello = function hello (params) {
  var buf = new Buffer(8)
  buf[0] = 4
  buf[1] = 6
  buf.writeUInt16BE(0, 2)
  buf.writeUInt16BE(params.seq, 4)
  buf.writeUInt16BE(params.csec, 6)
  return buf
}

exports.ihu = function ihu (params) {
  var buf = new Buffer(params.addr.length + 8)
  buf[0] = 5
  buf[1] = params.addr.length + 6
  buf[2] = params.addrEnc
  buf[3] = 0
  buf.writeUInt16BE(params.rxcost, 4)
  buf.writeUInt16BE(params.csec, 6)
  params.addr.copy(buf, 8)
  return buf
}

exports.routerId = function routerId (params) {
  var buf = new Buffer(4 + params.id.length)
  buf[0] = 6
  buf[1] = params.id.length + 2
  buf.writeUInt16BE(0, 2)
  params.id.copy(buf, 4)
  return buf
}

exports.nextHop = function nextHop (params) {
  var buf = new Buffer(4 + params.addr.length)
  buf[0] = 7
  buf[1] = params.addr.length + 2
  buf[2] = params.addrEnc
  buf[3] = 0
  params.addr.copy(buf, 4)
  return buf
}

exports.update = function update (params) {
  var buf = new Buffer(params.prefix.length + 12)
  buf[0] = 8
  buf[1] = params.prefix.length + 10
  buf[2] = params.addrEnc
  buf[3] = params.flags
  buf[4] = params.plen
  buf[5] = params.omitted
  buf.writeUInt16BE(params.csec, 6)
  buf.writeUInt16BE(params.seq, 8)
  buf.writeUInt16BE(params.metric, 10)
  params.prefix.copy(buf, 12)
  return buf
}

exports.route = function route (params) {
  var buf = new Buffer(params.prefix.length + 4)
  buf[0] = 9
  buf[1] = params.prefix.length + 2
  buf[2] = params.addrEnc
  buf[3] = params.plen
  params.prefix.copy(buf, 4)
  return buf
}

exports.seq = function seq (params) {
  var buf = new Buffer(params.routerId.length + params.prefix.length + 8)
  buf[0] = 10
  buf[1] = buf.length - 2
  buf[2] = params.addrEnc
  buf[3] = params.plen
  buf.writeUInt16BE(params.seq, 4)
  buf[6] = params.hopCount
  buf[7] = 0
  params.routerId.copy(buf, 8)
  params.prefix.copy(buf, 8 + params.routerId.length)
  return buf
}
