Luxtronik2
==========
### Luxtronik2 Reads and controls heat pumps based on the Luxtronik 2.0 contol unit with **Node.js**.

This work based on the fantastic [FHEM module 'LUXTRONIK2'](https://wiki.fhem.de/wiki/Luxtronik_2.0), the very usefull [openHAB binding 'Novelan Luxtronic heat pump'](
https://github.com/openhab/openhab1-addons/wiki/Novelan-Luxtronic-heat-pump-binding), the extensively [cbrandlehner/homebridge-luxtronik2](https://github.com/cbrandlehner/homebridge-luxtronik2) and a little bit research of my own. Hope you will like it.

#### Supports the following heat pumps
* Alpha Innotec
* Siemens Novelan (WPR NET)
* Roth (ThermoAura(r), ThermoTerra)
* Elco
* Buderus (Logamatic HMC20, HMC20 Z)
* Nibe (AP-AW10)
* Wolf Heiztechnik (BWL/BWS) 

How to use
----------
Connect your unit via lan and configure the ip parameters at your unit. The port number of your unit is 8888 by default.
Clone this code via git. You will get a package named luxtronik.js. You can require this at your code to read and write to your heat pump.

Example
-------

```javascript
var luxtronik = require('./luxtronik');

const hostIp = '192.168.0.20';  // <- Enter your Luxtronik IP here
var pump = new luxtronik(hostIp, 8888);

// read all readable data
pump.read(false, function (data) {
    console.log(data);
});

// set heating target temperature to 0 °C
pump.write('heating_target_temperature', 0);

// set warm water target temperature to 60 °C
pump.write('warmwater_target_temperature', 60);

// set heating operation mode to 'Auto'
pump.write('heating_operation_mode', 0);

// set warm water operation mode to 'Auto'
pump.write('warmwater_operation_mode', 0);

```