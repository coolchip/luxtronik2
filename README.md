# Luxtronik2

Luxtronik2 reads and controls heat pumps based on the Luxtronik 2.0 contol unit with **Node.js**.

This work based on the fantastic [FHEM module 'LUXTRONIK2'](https://wiki.fhem.de/wiki/Luxtronik_2.0), the very usefull [openHAB binding 'Novelan Luxtronic heat pump'](
https://github.com/openhab/openhab1-addons/wiki/Novelan-Luxtronic-heat-pump-binding), the extensively [cbrandlehner/homebridge-luxtronik2](https://github.com/cbrandlehner/homebridge-luxtronik2) and a little bit research of my own. Hope you will like it.

**Supports the following heat pumps**

* Alpha Innotec
* Siemens Novelan (WPR NET)
* Roth (ThermoAura(r), ThermoTerra)
* Elco
* Buderus (Logamatic HMC20, HMC20 Z)
* Nibe (AP-AW10)
* Wolf Heiztechnik (BWL/BWS) 

## Status

| Category         | Status                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Version          | [![npm version](https://badge.fury.io/js/luxtronik2.svg)](https://badge.fury.io/js/luxtronik2)                            |
| Dependencies     | [![Dependency Status](https://david-dm.org/coolchip/luxtronik2.svg)](https://david-dm.org/coolchip/luxtronik2)            |
| Build            | [![Build Status](https://travis-ci.org/coolchip/luxtronik2.svg?branch=master)](https://travis-ci.org/coolchip/luxtronik2) |
| License          | [![npm](https://img.shields.io/npm/l/express.svg)](https://www.npmjs.com/package/luxtronik2)                              |
## Installation

```shell
npm install luxtronik2
```

## How to use

Connect your unit via lan and configure the ip parameters at your unit. The port number of your unit is 8888 by default.
Clone this code via git or simply via npm. You will get a package named luxtronik. You can require this at your code to
read and write to your heat pump.

## Examples

```javascript
var luxtronik = require('luxtronik2');

const hostIp = '127.0.0.1';  // <- Enter your Luxtronik IP here
var pump = new luxtronik.createConnection(hostIp, 8888);

// read all readable data
pump.read(function (err, data) {
    if (err) {
        return console.log(err);
    }
    console.log(data);
    console.log(data.values.errors);
});

// set heating target temperature to 0 °C
pump.write('heating_target_temperature', 0);

// set warm water target temperature to 60 °C and use callback
pump.write('warmwater_target_temperature', 60, function (err, res) {
    if (err) {
        return console.log(err);
    }
    console.log(res);
});

// set heating operation mode to 'Auto'
pump.write('heating_operation_mode', 0);

// set warm water operation mode to 'Auto'
pump.write('warmwater_operation_mode', 0);

// set heating target temperature and use callback
pump.write('heating_target_temperature', 0, function (err, res) {
    if (err) {
        return console.log(err);
    }
    console.log(res);
});

```

## Migrating to version 1.0.0

The API changed between version 0.1.2 and version 1.0.0. [See migrating guide](MIGRATING.md) for information on how to migrate your application to the new API.
