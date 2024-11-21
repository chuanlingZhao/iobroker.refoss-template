'use strict';

/*
 * Created with @iobroker/create-adapter v2.6.5
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const axios = require('axios'); // 需要先安装axios库
const objectHelper = require('@apollon/iobroker-tools').objectHelper;
const BaseClient = require('./lib/protocol/udp4').BaseClient;
const BaseServer = require('./lib/protocol/udp4').BaseServer;
const adapterName = require('./package.json').name.split('.').pop();

// @ts-ignore
const tcpPing = require('tcp-ping');

// Load your modules here, e.g.:
// const fs = require("fs");

class Refoss extends utils.Adapter {
  constructor(options) {
    super({
      ...options,
      name: adapterName,
    });
    this.isUnloaded = false;
    this.clientServer = null;
    this.onlineCheckTimeout = null;
    this.server = null;
    this.onlineDevices = {};
    this.on('ready', this.onReady.bind(this));
    this.on('stateChange', this.onStateChange.bind(this));
    // this.on('objectChange', this.onObjectChange.bind(this));
    // this.on('message', this.onMessage.bind(this));
    this.on('unload', this.onUnload.bind(this));
  }

  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    console.log('onReady---');
    try {
      // Initialize your adapter here

      // The adapters config (in the instance object everything under the attribute "native") is accessible via
      // this.config:
      this.log.info('config port----: ' + this.config.port);
      // this.log.info('config option2: ' + this.config.option2);

      /*
      For every state in the system there has to be also an object of type state
      Here a simple Refoss for a boolean variable named "testVariable"
      Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
      */
      await this.setObjectNotExistsAsync('testVariable', {
        type: 'state',
        common: {
          name: 'testVariable',
          type: 'boolean',
          role: 'indicator',
          read: true,
          write: true,
        },
        native: {},
      });

      // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
      // this.subscribeStates('testVariable');
      // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
      // this.subscribeStates('lights.*');
      // Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
      await this.mkdirAsync(this.namespace, 'scripts');
      this.subscribeForeignFiles(this.namespace, '*');
      this.subscribeStates('*');
      objectHelper.init(this);


      // *发送udp广播
      this.clientServer = new BaseClient(this.config.port, this)
      this.server = new BaseServer(this.config.port, this, objectHelper)

      /*
          setState examples
          you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
      */
      // the variable testVariable is set to true as command (ack=false)
      await this.setStateAsync('testVariable', true);

      // same thing, but the value is flagged "ack"
      // ack should be always set to true if the value is received from or acknowledged from the target system
      await this.setStateAsync('testVariable', { val: true, ack: true });

      // same thing, but the state is deleted after 30s (getState will return null afterwards)
      await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });

      // init connect status--info.connection决定实例列表中Connected to device or service的状态
      await this.setStateAsync('info.connection', { val: false, ack: true });
      // await this.setStateAsync('refoss.Relay0.Switch', { val: true, ack: true });
      // await axios.get('http://10.10.10.1/rpc/Switch.Status.Get?id=1').then(async res => {
      //   const switchDef = res.data.result.output
      //   this.log.info(`switchDef----${switchDef}`);
      //   await this.setStateAsync('refoss.Relay0.Switch', { val: switchDef, ack: true });
      // }).catch(error => {
      //   console.error(error);
      // });

      // start online check
      await this.onlineCheck();
      // this.server = new protocolBase.BaseClient()

      // examples for the checkPassword/checkGroup functions
      let result = await this.checkPasswordAsync('admin', 'iobroker');
      this.log.info('check user admin pw iobroker: ' + result);

      result = await this.checkGroupAsync('admin', 'admin');
      this.log.info('check group user admin group admin: ' + result);
    } catch (error) {
      this.log.error(`[onReady] Startup error: ${error}`);
    }
  }

  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   * @param {() => void} callback
   */
  onUnload(callback) {
    this.isUnloaded = true;
    try {
      // Here you must clear all timeouts or intervals that may still be active
      // clearTimeout(timeout1);
      // clearTimeout(timeout2);
      // ...
      // clearInterval(interval1);

      callback();
    } catch (e) {
      callback();
    }
  }

  // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
  // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
  // /**
  //  * Is called if a subscribed object changes
  //  * @param {string} id
  //  * @param {ioBroker.Object | null | undefined} obj
  //  */
  // onObjectChange(id, obj) {
  //     if (obj) {
  //         // The object was changed
  //         this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
  //     } else {
  //         // The object was deleted
  //         this.log.info(`object ${id} deleted`);
  //     }
  // }

  /**
   * Is called if a subscribed state changes
   * @param {string} id
   * @param {ioBroker.State | null | undefined} state
   */
  onStateChange(id, state) {
    if (state && !state.ack) {
      this.log.info(`id----${id}`);
      if (id == 'refoss-template.0.refoss.Relay0.Switch') {
        this.log.info(`axios11----`);
        axios.get('http://10.10.10.1/rpc/Switch.Action.Set?id=1&action="toggle"')
          .then(response => {
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
            this.log.info(`axios22----`);
            axios.get('http://10.10.10.1/rpc/Switch.Status.Get?id=1').then(res => {
              this.log.info(`state ${id} info ${res} `);
            }).catch(error => {
              console.error(error);
            });
          })
          .catch(error => {
            console.error(error);
          });
      }
      // The state was changed
    } else {
      // The state was deleted
      this.log.info(`state ${id} deleted`);
    }
  }
  // online check
  async onlineCheck() {
    const valPort = 80;
    try {
      const deviceIds = await this.getAllDeviceIds();
      for (const deviceId of deviceIds) {
        const valHostname = await this.getStateAsync(`${deviceId}.hostname`);
        if (valHostname) {
          this.log.debug(`[onlineCheck] Checking ${deviceId} on ${valHostname}:${valPort}`);
          // @ts-ignore
          tcpPing.probe(valHostname, valPort, (error, isAlive) => this.deviceStatusUpdate(deviceId, isAlive));
        }
      }
    } catch (error) {
      this.log.error(error.toString());
    }
  }
  async deviceStatusUpdate(deviceId, status) {
    if (this.isUnloaded) return;
    if (!deviceId) return;

    this.log.debug(`[deviceStatusUpdate] ${deviceId}: ${status}`);

    // Check if device object exists
    const knownDeviceIds = await this.getAllDeviceIds();
    if (knownDeviceIds.indexOf(deviceId) === -1) {
      return;
    }

    // Update online status
    const idOnline = `${deviceId}.online`;
    const onlineState = await this.getStateAsync(idOnline);

    if (onlineState) {
      // Compare to previous value
      const prevValue = onlineState.val ? (onlineState.val === 'true' || onlineState.val === true) : false;

      if (prevValue != status) {
        await this.setStateAsync(idOnline, { val: status, ack: true });
      }
    }
    // Update connection state
    const oldOnlineDeviceCount = Object.keys(this.onlineDevices).length;
    
  }
  isOnline(deviceId) {
    return Object.prototype.hasOwnProperty.call(this.onlineDevices, deviceId);
  }
  async getAllDeviceIds() {
    const devices = await this.getDevicesAsync();
    return devices.map(device => this.removeNamespace(device._id));
  }
  removeNamespace(id) {
    const re = new RegExp(`${this.namespace}*\\.`, 'g');
    return id.replace(re, '');
  }
  // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
  // /**
  //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
  //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
  //  * @param {ioBroker.Message} obj
  //  */
  // onMessage(obj) {
  //     if (typeof obj === 'object' && obj.message) {
  //         if (obj.command === 'send') {
  //             // e.g. send email or pushover or whatever
  //             this.log.info('send command');

  //             // Send response in callback if required
  //             if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
  //         }
  //     }
  // }

}

if (require.main !== module) {
  // Export the constructor in compact mode
  /**
   * @param {Partial<utils.AdapterOptions>} [options={}]
   */
  module.exports = (options) => new Refoss(options);
} else {
  // otherwise start the instance directly
  new Refoss();
}