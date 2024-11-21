const dataoptions = require('../datapoints')

class base {
  constructor(port, adapter, objectHelper) {
    this.adapter = adapter
    this.objectHelper = objectHelper;
    this.port = port
    this.deviceId = null;
    this.deviceMode = null
    this.ip = null 
    this.device = {};
  }
  async initDeviceModeFromState() {
    const deviceModeState = await this.adapter.getStateAsync(`${this.getDeviceId()}.Sys.deviceMode`);
    if (deviceModeState && deviceModeState?.val) {
      this.deviceMode = deviceModeState.val;
    }
  }
  async initObjects(deveiceInfo) {
    this.ip = deveiceInfo.ip
    this.getDeviceId(deveiceInfo)
    this.deleteOldObjects()
    this.createObjects()
  }
  async deleteOldObjects() {
    const objList = await this.adapter.getAdapterObjectsAsync();
    const dps = dataoptions.getDeviceByClass()
    if (dps) {
      for (const o in objList) {
        const tmpObj = objList[o];
        if (tmpObj && tmpObj._id && tmpObj.type) {
          // remove namespace
          const stateId = tmpObj._id.replace(`${this.adapter.namespace}.${this.deviceId}.`, '');
          // Just delete states of this device!
          if (tmpObj.type === 'state' && tmpObj._id.startsWith(`${this.adapter.namespace}.${this.deviceId}`)) {
            if (!dps[stateId]) {
              try {
                if (this.objectHelper.getObject(tmpObj._id)) {
                  this.objectHelper.deleteObject(tmpObj._id);
                } else {
                  await this.adapter.delForeignObjectAsync(tmpObj._id);
                }

                delete objList[tmpObj._id];
                delete this.device[stateId];

                this.adapter.log.debug(`Deleted unused state "${tmpObj._id}"`);
              } catch (err) {
                this.adapter.log.error(`Could not delete unused state "${tmpObj._id}": ${err}`);
              }
            }
          }
        }
      }
    }
    // Delete empty channels
    for (const o in objList) {
      const tmpObj = objList[o];
      if (tmpObj && tmpObj.type && tmpObj._id && tmpObj.type === 'channel') {
        // Search for states in current channel
        let found = false
        for (const j in objList) {
          const tmpidj = objList[j];
          if (!tmpidj) {
            continue;
          }

          if (tmpidj && tmpidj.type && tmpidj._id && tmpidj.type === 'state' && tmpidj._id.startsWith(tmpObj._id)) {
            found = true;
            break;
          }
        }
        if (found === false) {
          try {
            if (this.objectHelper.getObject(tmpObj._id)) {
              this.objectHelper.deleteObject(tmpObj._id);
            } else {
              await this.adapter.delForeignObjectAsync(tmpObj._id, { recursive: true });
            }

            delete objList[tmpObj._id];

            this.adapter.log.debug(`Deleted unused channel "${tmpObj._id}"`);
          } catch (err) {
            this.adapter.log.error(`Could not delete unused channel "${tmpObj._id}": ${err}`);
          }
        }
      }
    }
  }
  async createObjects() {
    return new Promise((resolve, reject) => {
      try {
        const deviceStates = dataoptions.getDeviceByClass()
        if (deviceStates) {
          for (const stateId in deviceStates) {
            const state = deviceStates[stateId];
            state.state = stateId;
            this.objectHelper.setOrUpdateObject(this.deviceId, {
              type: 'device',
              common: {
                name: `Device ${this.deviceId}`,
                statusStates: {
                  onlineId: `${this.adapter.namespace}.${this.deviceId}.online`,
                },
              },
              native: {},
            }, ['name'])
            const channel = stateId.split('.').slice(0, 1).join();
            if (channel !== stateId) {
              const channelId = `${this.deviceId}.${channel}`;
              this.objectHelper.setOrUpdateObject(channelId, {
                type: 'channel',
                common: {
                  name: `Channel ${channel}`,
                },
              }, ['name']);
            }
            const fullStateId = `${this.deviceId}.${stateId}`;
            let controlFunction;

            // if(state.http.http_cmd) {
            //   controlFunction = async (value) => {
            //     if (this.isOnline()) {
            //       let publishValue = value;
            //     }
            //   }
            // }
            this.objectHelper.setOrUpdateObject(fullStateId, {
              type: 'state',
              common: state.common,
            }, ['name']);
          }
        }
        this.objectHelper.processObjectQueue(() => {
          // this.http = deviceStatesHttp;
          this.device = deviceStates;
          // this.adapter.log.debug(`[createObjects] Finished object creation of ${this.getLogInfo()}`);
          resolve(true);
        });

      } catch (error) {

      }
    })
  }
  getDeviceId(deveiceInfo) {
    this.adapter.log.warn(`devName----${deveiceInfo.devName}`)
    this.deviceId = 'refoss' + deveiceInfo.devName + '#' + deveiceInfo.mac.replaceAll(':', '')
  }
  getOldDeviceInfo(deviceId) {
    return 'refoss' // *区分不同型号
  }
  getIP() {
    return this.ip;
}
  isOnline() {
    return this.adapter.isOnline(this.deviceId);
}
}
module.exports = {
  base
};