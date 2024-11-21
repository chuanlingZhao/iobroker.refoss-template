const base = require('./base').base

var dgram = require("dgram");
var client = dgram.createSocket("udp4");
var server = dgram.createSocket("udp4");

// *客户端发送广播
class BaseClient {
  constructor(port, adapter) {
    this.adapter = adapter
    this.port = port
    this.start()
  }
  start() {
    client.bind(9988, () => {
      client.setBroadcast(true);
    });
    var data = {
      id: '48cbd88f969eb3c486085cfe7b5eb1e4',
      devName: '*'
    }
    var message = JSON.stringify(data);
    this.adapter.log.warn(`${message}`)
    const that = this
    client.send(message, 0, message.length, 9988, '255.255.255.255', function (err, bytes) {
      that.adapter.log.warn('sending-----')
      client.close();
    });
  }
}
class BaseServer extends base  {
  constructor(port, adapter, objectHelper) {
    super(port, adapter);
    this.adapter = adapter
    this.objectHelper = objectHelper
    this.port = port
    this.start()
  }
  start() {
    const that = this
    // *服务器接收
    server.on("error", function (err) {
      that.adapter.log.warn(`server error ${err.stack}`)
      server.close();
    });
    server.on("message", async function (msg, rinfo) {
      that.adapter.log.warn(`server got ${msg} from ${rinfo.address}: ${rinfo.port}`)
      if (msg) {
        const json = JSON.parse(msg.toString())
        that.initObjects(json);
      }
    });
    server.on("listening", function () {
      var address = server.address();
      that.adapter.log.warn(`server listening${address.address}: ${address.port}`)
    });
    server.bind(9989);
  }
}

module.exports = {
  BaseClient,
  BaseServer
};
