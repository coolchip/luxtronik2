const net = require("net");
const winston = require("winston");
const humanizeduration = require("humanize-duration");
const huminizeoptions = {
    language: "de",
    conjunction: " und ",
    serialComma: false
};
winston.level = "warning";

const types = require("./types");


function luxtronik(host, port) {
    if (typeof port === "undefined") {
        this._port = 8888;
    } else {
        this._port = port;
    }
    this._host = host;
}


function parseFirmware(buf) {
    var firmware = "";
    for (var key in buf) {
        if ({}.hasOwnProperty.call(buf, key)) {
            firmware += (buf[key] === 0) ? "" : String.fromCharCode(buf[key]);
        }
    }
    return firmware;
}


function int2ip(value) {
    var part1 = value & 255;
    var part2 = ((value >> 8) & 255);
    var part3 = ((value >> 16) & 255);
    var part4 = ((value >> 24) & 255);
    return part4 + "." + part3 + "." + part2 + "." + part1;
}


function getStateString(values) {
    var stateStr = "";
    const state1 = values[117];
    const state2 = values[118];
    const duration = values[120];

    // Text aus Define
    if (types.stateMessages.hasOwnProperty(state1)) {
        stateStr = types.stateMessages[state1];
        if (state2 === 0 || state2 === 2) {
            stateStr += " seit ";
        } else if (state2 === 1) {
            stateStr += " in ";
        }

        // Sonderbehandlung bei WP-Fehlern - Zeitstempel des zuletzt aufgetretenen Fehlers nehmen
        if (state2 === 2) {
            stateStr += new Date(values[95] * 1000).toString();
        } else {
            stateStr += humanizeduration(duration * 1000, huminizeoptions);
        }
    } else {
        winston.log("warning", "No idea what the heatpump will do in state " + state1);
        stateStr = "Unknown [" + state1 + "]";
    }
    return stateStr;
}


function getExtendedStateString(values) {
    var stateStr = "";

    const defrostValve = values[37];
    const heatSourceMotor = values[43];
    const compressor1 = values[44];
    const state3 = values[119];
    const ahpStufe = values[121];
    const ahpTemp = values[122] / 10;

    if (types.extendetStateMessages.hasOwnProperty(state3)) {
        stateStr = types.extendetStateMessages[state3];
        if (state3 === 6) {
            // Estrich Programm
            stateStr += " Stufe " + ahpStufe + " - " + ahpTemp + " °C";
        } else if (state3 === 7) {
            // Abtauen
            if (defrostValve === 1) {
                stateStr += "Abtauen (Kreisumkehr)";
            } else if (compressor1 === 0 && heatSourceMotor === 1) {
                stateStr += "Luftabtauen";
            } else {
                stateStr += "Abtauen";
            }
        }
    } else {
        winston.log("warning", "No idea what the heatpump will do in state " + state3);
        stateStr = "Unknown [" + state3 + "]";
    }
    return stateStr;
}


function getOpState(state) {
    var stateStr = "";
    if (types.hpMode.hasOwnProperty(state)) {
        stateStr = types.hpMode[state];
    } else {
        winston.log("warning", "No idea what the heatpump will do in state " + state);
        stateStr = "Unknown [" + state + "]";
    }
    return stateStr;
}


function getOpStateHotWater(values) {
    var stateStr = "";
    const hotWaterBoilerValve = values[38];
    const opStateHotWater = values[124];
    if (opStateHotWater === 0) {
        stateStr = "Sperrzeit";
    } else if (opStateHotWater === 1 && hotWaterBoilerValve === 1) {
        stateStr = "Aufheizen";
    } else if (opStateHotWater === 1 && hotWaterBoilerValve === 0) {
        stateStr = "Temp. OK";
    } else if (opStateHotWater === 3) {
        stateStr = "Aus";
    } else {
        winston.log("warning", "No idea what the heatpump will do in state " + opStateHotWater + "/" + hotWaterBoilerValve);
        stateStr = "Unknown [" + opStateHotWater + "/" + hotWaterBoilerValve + "]";
    }
    return stateStr;
}


function generateLogLine(time, msg) {
    return new Date(time * 1000).toString() + " - " + msg;
}


function generateLogList(timeArray, msgArray) {
    var logArray = [];
    for (var i = 0; i < timeArray.length; i++) {
        logArray.push(generateLogLine(timeArray[i], msgArray[i]));
    }
    return logArray;
}


function toInt32ArrayReadBE(buffer) {
    var i32a = new Int32Array(buffer.length / 4);
    for (var i = 0; i < i32a.length; i++) {
        i32a[i] = buffer.readInt32BE(i * 4);
    }
    return i32a;
}


function processData() {
    var payload = {};
    const heatpumpParameters = toInt32ArrayReadBE(receivy["3003"].payload);
    const heatpumpValues = toInt32ArrayReadBE(receivy["3004"].payload);
    const heatpumpVisibility = receivy["3005"].payload;

    if (typeof heatpumpParameters === "undefined" ||
        typeof heatpumpValues === "undefined" ||
        typeof heatpumpVisibility === "undefined") {

        payload = {
            additional: {
                error: "Unexpected Data"
            }
        };
    } else {

        if (receivy.rawdata) {
            payload = {
                values: "[" + heatpumpValues + "]",
                parameters: "[" + heatpumpParameters + "]"
            };
        } else {
            payload = {
                values: {
                    "temperature_supply": heatpumpValues[10] / 10, // #15
                    "temperature_return": heatpumpValues[11] / 10, // #16
                    "temperature_target_return": heatpumpValues[12] / 10, // #17
                    "temperature_extern_return": (heatpumpVisibility[24] === 1) ? heatpumpValues[13] / 10 : "no", // #18
                    "temperature_hot_gas": heatpumpValues[14] / 10, // #26
                    "temperature_outside": heatpumpValues[15] / 10, // #12
                    "temperature_outside_avg": heatpumpValues[16] / 10, // #13
                    "temperature_hot_water": heatpumpValues[17] / 10, // #14
                    "temperature_hot_water_target": heatpumpValues[18] / 10, // #25
                    "temperature_heat_source_in": heatpumpValues[19] / 10, // #23
                    "temperature_heat_source_out": heatpumpValues[20] / 10, // #24
                    "temperature_mixer1_flow": (heatpumpVisibility[31] === 1) ? heatpumpValues[21] / 10 : "no", // #55
                    "temperature_mixer1_target": (heatpumpVisibility[32] === 1) ? heatpumpValues[22] / 10 : "no", // #56
                    "temperaturw_RFV": (heatpumpVisibility[33] === 1) ? heatpumpValues[23] / 10 : "no",
                    "temperature_mixer2_flow": (heatpumpVisibility[34] === 1) ? heatpumpValues[24] / 10 : "no", // #57
                    "temperature_mixer2_target": (heatpumpVisibility[35] === 1) ? heatpumpValues[25] / 10 : "no", // #48
                    "temperature_solar_collector": (heatpumpVisibility[36] === 1) ? heatpumpValues[26] / 10 : "no", // #50
                    "temperature_solar_storage": (heatpumpVisibility[37] === 1) ? heatpumpValues[27] / 10 : "no", // #51
                    "temperature_external_source": (heatpumpVisibility[38] === 1) ? heatpumpValues[28] / 10 : "no",

                    "ASDin": heatpumpValues[29],
                    "BWTin": heatpumpValues[30],
                    "EVUin": heatpumpValues[31],
                    "HDin": heatpumpValues[32],
                    "MOTin": heatpumpValues[33],
                    "NDin": heatpumpValues[34],
                    "PEXin": heatpumpValues[35],
                    "SWTin": heatpumpValues[36],

                    "AVout": heatpumpValues[37],
                    "BUPout": heatpumpValues[38],
                    "HUPout": heatpumpValues[39],
                    "MA1out": heatpumpValues[40],
                    "MZ1out": heatpumpValues[41],
                    "VENout": heatpumpValues[42],
                    "VBOout": heatpumpValues[43],
                    "VD1out": heatpumpValues[44],
                    "VD2out": heatpumpValues[45],
                    "ZIPout": heatpumpValues[46],
                    "ZUPout": heatpumpValues[47],
                    "ZW1out": heatpumpValues[48],
                    "ZW2SSTout": heatpumpValues[49],
                    "ZW3SSTout": heatpumpValues[50],
                    "FP2out": heatpumpValues[51],
                    "SLPout": heatpumpValues[52],
                    "SUPout": heatpumpValues[53],
                    "MZ2out": heatpumpValues[54],
                    "MA2out": heatpumpValues[55],

                    "defrostValve": (heatpumpVisibility[47] === 1) ? heatpumpValues[37] : "no", // #67
                    "hotWaterBoilerValve": heatpumpValues[38], // #9
                    "heatingSystemCircPump": (heatpumpValues[39] === 1) ? "on" : "off", // #27

                    "heatSourceMotor": (heatpumpVisibility[54] === 1) ? heatpumpValues[43] : "no", // #64
                    "compressor1": heatpumpValues[44],

                    "hotWaterCircPumpExtern": (heatpumpVisibility[57] === 1) ? heatpumpValues[46] : "no", // #28

                    "hours_compressor1": Math.round(heatpumpValues[56] / 3600),
                    "starts_compressor1": heatpumpValues[57],
                    "hours_compressor2": Math.round(heatpumpValues[58] / 3600),
                    "starts_compressor2": heatpumpValues[59],
                    "hours_2nd_heat_source1": (heatpumpVisibility[84] === 1) ? Math.round(heatpumpValues[60] / 3600) : "no", // #32
                    "hours_2nd_heat_source2": (heatpumpVisibility[85] === 1) ? Math.round(heatpumpValues[61] / 3600) : "no", // #38
                    "hours_2nd_heat_source3": (heatpumpVisibility[86] === 1) ? Math.round(heatpumpValues[62] / 3600) : "no", // #39
                    "hours_heatpump": (heatpumpVisibility[87] === 1) ? Math.round(heatpumpValues[63] / 3600) : "no", // #33
                    "hours_heating": (heatpumpVisibility[195] === 1) ? Math.round(heatpumpValues[64] / 3600) : "no", // #34
                    "hours_warmwater": (heatpumpVisibility[196] === 1) ? Math.round(heatpumpValues[65] / 3600) : "no", // #35
                    "hours_cooling": (heatpumpVisibility[197] === 1) ? Math.round(heatpumpValues[66] / 3600) : "no",

                    "Time_WPein_akt": heatpumpValues[67],
                    "Time_ZWE1_akt": heatpumpValues[68],
                    "Time_ZWE2_akt": heatpumpValues[69],
                    "Timer_EinschVerz": heatpumpValues[70],
                    "Time_SSPAUS_akt": heatpumpValues[71],
                    "Time_SSPEIN_akt": heatpumpValues[72],
                    "Time_VDStd_akt": heatpumpValues[73],
                    "Time_HRM_akt": heatpumpValues[74],
                    "Time_HRW_akt": heatpumpValues[75],
                    "Time_LGS_akt": heatpumpValues[76],
                    "Time_SBW_akt": heatpumpValues[77],

                    "typeHeatpump": types.hpTypes[heatpumpValues[78]], // #31
                    "bivalentLevel": heatpumpValues[79], // #43

                    "WP_BZ_akt": heatpumpValues[80],

                    "firmware": parseFirmware(heatpumpValues.slice(81, 91)), // #20

                    "AdresseIP_akt": int2ip(heatpumpValues[91]),
                    "SubNetMask_akt": int2ip(heatpumpValues[92]),
                    "Add_Broadcast": int2ip(heatpumpValues[93]),
                    "Add_StdGateway": int2ip(heatpumpValues[94]),

                    "errors": generateLogList(heatpumpValues.slice(95, 100), heatpumpValues.slice(100, 105)), // #42 Time of first error

                    "error_count": heatpumpValues[105],

                    "switch_off": generateLogList(heatpumpValues.slice(111, 116), heatpumpValues.slice(106, 111)),

                    "Comfort_exists": heatpumpValues[116],

                    "heatpump_state1": heatpumpValues[117],
                    "heatpump_state2": heatpumpValues[118], // #40
                    "heatpump_state3": heatpumpValues[119],
                    "heatpump_duration": heatpumpValues[120], // #41
                    "heatpump_state_string": getStateString(heatpumpValues),
                    "heatpump_extendet_state_string": getExtendedStateString(heatpumpValues),

                    "ahp_Stufe": heatpumpValues[121],
                    "ahp_Temp": heatpumpValues[122],
                    "ahp_Zeit": heatpumpValues[123],

                    "opStateHotWater": heatpumpValues[124], // #8
                    "opStateHotWaterString": getOpStateHotWater(heatpumpValues),
                    "opStateHeating": heatpumpValues[125], // #46
                    "opStateMixer1": heatpumpValues[126],
                    "opStateMixer2": heatpumpValues[127],
                    "Einst_Kurzprogramm": heatpumpValues[128],
                    "StatusSlave_1": heatpumpValues[129],
                    "StatusSlave_2": heatpumpValues[130],
                    "StatusSlave_3": heatpumpValues[131],
                    "StatusSlave_4": heatpumpValues[132],
                    "StatusSlave_5": heatpumpValues[133],

                    "rawDeviceTimeCalc": new Date(heatpumpValues[134] * 1000).toString(), // #22

                    "opStateMixer3": heatpumpValues[135],
                    "temperature_mixer3_target": (heatpumpVisibility[211] === 1) ? heatpumpValues[136] / 10 : "no", // #60
                    "temperature_mixer3_flow": (heatpumpVisibility[210] === 1) ? heatpumpValues[137] / 10 : "no", // #59

                    "MZ3out": heatpumpValues[138],
                    "MA3out": heatpumpValues[139],
                    "FP3out": heatpumpValues[140],

                    "heatSourceDefrostTimer": (heatpumpVisibility[219] === 1) ? heatpumpValues[141] : "no", // #66

                    "Temperatur_RFV2": heatpumpValues[142] / 10,
                    "Temperatur_RFV3": heatpumpValues[143] / 10,
                    "SH_SW": heatpumpValues[144],
                    "Zaehler_BetrZeitSW": Math.round(heatpumpValues[145] / 3600),
                    "FreigabKuehl": heatpumpValues[146],
                    "AnalogIn": heatpumpValues[147],
                    "SonderZeichen": heatpumpValues[148],
                    "SH_ZIP": heatpumpValues[149],
                    "WebsrvProgrammWerteBeobarten": heatpumpValues[150],

                    "thermalenergy_heating": (heatpumpVisibility[0] === 1) ? heatpumpValues[151] / 10 : "no", // #36
                    "thermalenergy_warmwater": (heatpumpVisibility[1] === 1) ? heatpumpValues[152] / 10 : "no", // #37
                    "thermalenergy_pool": (heatpumpVisibility[2] === 1) ? heatpumpValues[153] / 10 : "no", // #62
                    "thermalenergy_total": heatpumpValues[154] / 10,
                    "flowRate": (heatpumpParameters[870] !== 0) ? heatpumpValues[155] : "no", // #19

                    "analogOut1": heatpumpValues[156],
                    "analogOut2": heatpumpValues[157],
                    "Time_Heissgas": heatpumpValues[158],
                    "Temp_Lueftung_Zuluft": heatpumpValues[159] / 10,
                    "Temp_Lueftung_Abluft": heatpumpValues[160] / 10,

                    "hours_solar": (heatpumpVisibility[248] === 1) ? Math.round(heatpumpValues[161] / 3600) : "no", // #52
                    "analogOut3": heatpumpValues[162],
                    "analogOut4": (heatpumpVisibility[267] === 1) ? heatpumpValues[163] : "no", // #73 - Voltage heating system circulation pump

                    "Out_VZU": heatpumpValues[164],
                    "Out_VAB": heatpumpValues[165],
                    "Out_VSK": heatpumpValues[166],
                    "Out_FRH": heatpumpValues[167],
                    "AnalogIn2": heatpumpValues[168],
                    "AnalogIn3": heatpumpValues[169],
                    "SAXin": heatpumpValues[170],
                    "SPLin": heatpumpValues[171],
                    "Compact_exists": heatpumpValues[172],
                    "Durchfluss_WQ": heatpumpValues[173],
                    "LIN_exists": heatpumpValues[174],
                    "LIN_TUE": heatpumpValues[175],
                    "LIN_TUE1": heatpumpValues[176],
                    "LIN_VDH": heatpumpValues[177],
                    "LIN_UH": heatpumpValues[178],
                    "LIN_UH_Soll": heatpumpValues[179],
                    "LIN_HD": heatpumpValues[180],
                    "LIN_ND": heatpumpValues[181],
                    "LIN_VDH_out": heatpumpValues[182]
                },
                parameters: {
                    "heating_temperature": heatpumpParameters[1] / 10, // #54 - returnTemperatureSetBack
                    "warmwater_temperature": heatpumpParameters[2] / 10,
                    "heating_operation_mode": heatpumpParameters[3], // #10
                    "warmwater_operation_mode": heatpumpParameters[4], // #7

                    "heating_operation_mode_string": getOpState(heatpumpParameters[3]),
                    "warmwater_operation_mode_string": getOpState(heatpumpParameters[4]),

                    "heating_curve_end_point": (heatpumpVisibility[207] === 1) ? heatpumpParameters[11] / 10 : "no", // #69
                    "heating_curve_parallel_offset": (heatpumpVisibility[207] === 1) ? heatpumpParameters[12] / 10 : "no", // #70
                    "deltaHeatingReduction": heatpumpParameters[13] / 10, // #47

                    "heatSourcedefrostAirThreshold": (heatpumpVisibility[97] === 1) ? heatpumpParameters[44] / 10 : "no", // #71

                    "hotWaterTemperatureHysterese": heatpumpParameters[74] / 10, // #49

                    "returnTempHyst": (heatpumpVisibility[93] === 1) ? heatpumpParameters[88] / 10 : "no", // #68

                    "heatSourcedefrostAirEnd": (heatpumpVisibility[105] === 1) ? heatpumpParameters[98] / 10 : "no", // #72

                    "temperature_hot_water_target": heatpumpParameters[105] / 10,

                    "cooling_operation_mode": heatpumpParameters[108],

                    "cooling_release_temperature": heatpumpParameters[110] / 10,
                    "thresholdTemperatureSetBack": heatpumpParameters[111] / 10, // #48

                    "cooling_inlet_temp": heatpumpParameters[132] / 10,

                    "hotWaterCircPumpDeaerate": (heatpumpVisibility[167] === 1) ? heatpumpParameters[684] : "no", // #61

                    "heatingLimit": heatpumpParameters[699], // #11
                    "thresholdHeatingLimit": heatpumpParameters[700] / 10, // #21

                    "cooling_start_after_hours": heatpumpParameters[850],
                    "cooling_stop_after_hours": heatpumpParameters[851],

                    "typeSerial": heatpumpParameters[874].toString().substr(0, 4) + "/" + heatpumpParameters[874].toString().substr(4) + "-" + heatpumpParameters[875].toString(16).toUpperCase(),

                    "returnTemperatureTargetMin": heatpumpParameters[979] / 10 // #63

                    //"possible_temperature_hot_water_limit1": heatpumpParameters[47] / 10,
                    //"possible_temperature_hot_water_limit2": heatpumpParameters[84] / 10,
                    //"possible_temperature_hot_water_limit3": heatpumpParameters[973] / 10,
                },
                additional: {
                    "reading_calculated_time_ms": receivy.readingEndTime - receivy.readingStartTime
                }
            };

            // skips inconsistent flow rates (known problem of the used flow measurement devices)
            if (payload.values.flowRate !== "no" && payload.values.heatingSystemCircPump) {
                if (payload.values.flowRate === 0) {
                    payload.values.flowRate = "inconsistent";
                }
            }

            if (payload.parameters.hotWaterCircPumpDeaerate !== "no") {
                payload.parameters.hotWaterCircPumpDeaerate = payload.parameters.hotWaterCircPumpDeaerate ? "on" : "off";
            }

            // Consider also heating limit
            var value = "";
            if (payload.parameters.heating_operation_mode === 0 && payload.parameters.heatingLimit === 1 &&
                payload.values.temperature_outside_avg >= payload.parameters.thresholdHeatingLimit &&
                (payload.values.temperature_target_return === payload.parameters.returnTemperatureTargetMin || payload.values.temperature_target_return === 20 && payload.values.temperature_outside < 10)
            ) {
                if (payload.values.temperature_outside >= 10) {
                    value = "Heizgrenze (Soll " + payload.parameters.returnTemperatureTargetMin + " °C)";
                } else {
                    value = "Frostschutz (Soll 20 °C)";
                }
            } else {
                if (types.heatingState.hasOwnProperty(payload.values.opStateHeating)) {
                    value = types.heatingState[payload.values.opStateHeating];
                } else {
                    value = "unbekannt (" + payload.values.opStateHeating + ")";
                }

                // Consider heating reduction limit
                if (payload.values.opStateHeating === 0) {
                    if (payload.parameters.thresholdTemperatureSetBack <= payload.values.temperature_outside) {
                        value += " " + payload.parameters.deltaHeatingReduction + " °C";
                    } else {
                        value = "Normal da < " + payload.parameters.thresholdTemperatureSetBack + " °C";
                    }
                }
            }
            payload.values.opStateHeatingString = value;
        }
    }
    receivy.callback(payload);
}


receivy = {};
client = null;


function writeCommand(command) {
    const buffer = Buffer.allocUnsafe(8);
    buffer.writeInt32BE(command, 0);
    buffer.writeInt32BE(0, 4);
    client.write(buffer);
}


function nextJob() {
    if (receivy.jobs.length > 0) {
        receivy.activeCommand = 0;
        writeCommand(receivy.jobs.shift());
    } else {
        client.destroy();
        client = null;
        receivy.readingEndTime = Date.now();
        process.nextTick(processData);
    }
}


function startRead(host, port, rawdata, callback) {
    client = new net.Socket();
    client.connect(port, host, function () {
        winston.log("debug", "Connected");

        receivy = {
            jobs: [3003, 3004, 3005],
            activeCommand: 0,
            readingStartTime: Date.now(),
            rawdata: rawdata,
            callback: callback
        };
        process.nextTick(nextJob);
    });

    client.on("error", function (error) {
        winston.log("error", error);
        client.destroy();
        process.nextTick(
            function() {
                callback({
                    error: "Unable to connect: " + error
                })
            }
        );
        client = null;
    });


    client.on("data", function (data) {
        if (receivy.activeCommand === 0) {
            const commandEcho = data.readInt32BE(0);
            var firstReadableDataAddress = 0;

            if (commandEcho === 3004) {
                const status = data.readInt32BE(4);
                if (status > 0) {
                    winston.log("error", "Parameter on target changed, restart parameter reading after 5 seconds");
                    client.destroy();
                    process.nextTick(
                        function() {
                            receivy.callback({
                              error: "busy"
                            })
                        }
                    );
                    return;
                } else {
                    firstReadableDataAddress = 12;
                }
            } else {
                firstReadableDataAddress = 8;
            }
            const paramCount = data.readInt32BE(firstReadableDataAddress - 4);
            var dataCount = 0;
            if (commandEcho === 3005) {
                // 8 Bit values
                dataCount = paramCount;
            } else {
                // 32 Bit values
                dataCount = paramCount * 4;
            }
            const payload = data.slice(firstReadableDataAddress, data.length);

            receivy.activeCommand = commandEcho;
            receivy[commandEcho] = {
                remaining: dataCount - payload.length,
                payload
            };
        } else {
            receivy[receivy.activeCommand] = {
                remaining: receivy[receivy.activeCommand].remaining - data.length,
                payload: Buffer.concat([receivy[receivy.activeCommand].payload, data])
            };
        }

        if (receivy[receivy.activeCommand].remaining <= 0) {
            winston.log("debug", receivy.activeCommand + " completed");
            process.nextTick(nextJob);
        }
    });

    client.on("close", function () {
        winston.log("debug", "Connection closed");
    });
}


function value2SetValue(realValue) {
    // Allow only integer temperature or with decimal .5
    return parseInt(realValue * 2, 10) * 5;
}


function startWrite(host, port, parameterName, realValue) {
    var setParameter = 0;
    var setValue = 0;

    if (parameterName === "heating_target_temperature") {
        setParameter = 1;
        if (realValue < -10) {
            realValue = -10;
        }
        if (realValue > 10) {
            realValue = +10;
        }
        setValue = value2SetValue(realValue);
    } else if (parameterName === "warmwater_target_temperaure") {
        setParameter = 2;
        if (realValue < 30) {
            realValue = 30;
        }
        if (realValue > 65) {
            realValue = 65;
        }
        setValue = value2SetValue(realValue);
    } else if (parameterName === "heating_operation_mode") {
        if (!types.hpMode.hasOwnProperty(realValue.toString())) {
            winston.log("error", "Wrong parameter given for heating_operation_mode");
            return;
        }
        setParameter = 3;
        setValue = realValue;
    } else if (parameterName === "warmwater_operation_mode") {
        if (!types.hpMode.hasOwnProperty(realValue.toString())) {
            winston.log("error", "Wrong parameter given for warmwater_operation_mode");
            return;
        }
        setParameter = 4;
        setValue = realValue;
    } else if (parameterName === "cooling_operation_mode") {
        setParameter = 108;
        realValue = setValue;
    } else if (parameterName === "cooling_release_temp") {
        setParameter = 110;
        setValue = value2SetValue(realValue);
    } else if (parameterName === "cooling_inlet_temp") {
        setParameter = 132;
        setValue = value2SetValue(realValue);
    } else if (parameterName === "cooling_start") {
        setParameter = 850;
        realValue = setValue;
    } else if (parameterName === "cooling_stop") {
        setParameter = 851;
        realValue = setValue;
    }

    if (setParameter !== 0) {
        client = new net.Socket();
        client.connect(port, host, function () {
            winston.log("debug", "Connected");
            winston.log("debug", "Set parameter " + parameterName + "(" + setParameter + ") = " + realValue + "(" + setValue + ")");

            const buffer = Buffer.allocUnsafe(12);
            const command = 3002;
            buffer.writeInt32BE(command, 0);
            buffer.writeInt32BE(setParameter, 4);
            buffer.writeInt32BE(setValue, 8);
            client.write(buffer);
        });

        client.on("error", function (error) {
            winston.log("error", error);
            client.destroy();
            client = null;
        });

        client.on("data", function (data) {
            const commandEcho = data.readInt32BE(0);
            if (commandEcho !== 3002) {
                winston.log("error", "Host did not confirm parameter setting");
                return;
            } else {
                const setParameterEcho = data.readInt32BE(4);
                winston.log("debug", setParameterEcho + " - ok");
            }
            client.destroy();
            client = null;
        });
    }
}


luxtronik.prototype.read = function (rawdata, callback) {
    if (rawdata instanceof Function) {
        callback = rawdata;
        rawdata = false;
    }
    startRead(this._host, this._port, rawdata, callback);
};


luxtronik.prototype.readRaw = function (callback) {
    startRead(this._host, this._port, true, callback);
};


luxtronik.prototype.write = function (parameterName, realValue) {
    startWrite(this._host, this._port, parameterName, realValue);
};


module.exports = luxtronik;
