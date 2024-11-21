'use strict';

const refossr11 = {
  'hostname': {
    http: {
      init_funct: self => self.getIP(),
    },
    common: {
      name: {
        en: 'Device IP address or hostname',
        de: 'Geräte-IP-Adresse oder Hostname',
        ru: 'IP-адрес устройства или имя хоста',
        pt: 'Endereço IP do dispositivo ou nome de host',
        nl: 'IP-adres of gastnaam',
        fr: 'Adresse IP ou nom d\'hôte',
        it: 'Indirizzo IP del dispositivo o nome host',
        es: 'Dirección IP o nombre de host',
        pl: 'Adres IP lub hostname',
        uk: 'Пристрої IP адреси або ім\'я користувача',
        'zh-cn': '設備 IP 地址或主機名',
      },
      type: 'string',
      role: 'info.ip',
      read: true,
      write: false,
    }
  },
  'Relay0.Switch': {
    http: {
      http_cmd: '/rpc/Switch.Action.Set?id=1&action="toggle"',
      http_cmd_funct: async (value) => value === true ? { turn: 'on' } : { turn: 'off' }
    },
    common: {
      name: {
        en: 'Switch',
        de: 'Schalter',
        ru: 'Переключить',
        pt: 'Interruptor',
        nl: 'Vertaling:',
        fr: 'Interrupteur',
        it: 'Interruttore',
        es: 'Interruptor',
        pl: 'Switch',
        'zh-cn': '开 关',
      },
      type: 'boolean',
      role: 'switch',
      read: true,
      write: true,
      def: false,
    },
  },
  'Relay0.Power': {
    common: {
      name: 'Power',
      type: 'number',
      role: 'value.power',
      read: true,
      write: false,
      def: 0,
      unit: 'W',
    },
  },
}
module.exports = {
  refossr11
}