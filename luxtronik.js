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


// @TODO: Insert queue for read/write jobs
// @TODO: Translate to english


function luxtronik(host, port = 8888) {
    this._host = host;
    this._port = port;
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
        if (state3 == 6) {
            // Estrich Programm
            stateStr += " Stufe " + ahpStufe + " - " + ahpTemp + " °C";
        } else if (state3 == 7) {
            // Abtauen
            if (defrostValve == 1) {
                stateStr += "Abtauen (Kreisumkehr)";
            } else if (compressor1 === 0 && heatSourceMotor == 1) {
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


function getLogLine(time, value) {
    return new Date(time * 1000).toString() + " - " + value;
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
    const heatpump_parameters = toInt32ArrayReadBE(this.receivy["3003"].payload);
    const heatpump_values = toInt32ArrayReadBE(this.receivy["3004"].payload);
    const heatpump_visibility = this.receivy["3005"].payload;

    if (heatpump_parameters !== undefined &&
        heatpump_values !== undefined &&
        heatpump_visibility !== undefined) {

        if (receivy.rawdata) {
            payload = {
                values: "[" + heatpump_values + "]",
                parameters: "[" + heatpump_parameters + "]"
            };
        } else {
            payload = {
                values: {
                    "temperature_supply": heatpump_values[10] / 10, // #15
                    "temperature_return": heatpump_values[11] / 10, // #16
                    "temperature_target_return": heatpump_values[12] / 10, // #17
                    "temperature_extern_return": (heatpump_visibility[24] == 1) ? heatpump_values[13] / 10 : "no", // #18
                    "temperature_hot_gas": heatpump_values[14] / 10, // #26
                    "temperature_outside": heatpump_values[15] / 10, // #12
                    "temperature_outside_avg": heatpump_values[16] / 10, // #13
                    "temperature_hot_water": heatpump_values[17] / 10, // #14
                    "temperature_hot_water_target": heatpump_values[18] / 10, // #25
                    "temperature_heat_source_in": heatpump_values[19] / 10, // #23
                    "temperature_heat_source_out": heatpump_values[20] / 10, // #24
                    "temperature_mixer1_flow": (heatpump_visibility[31] == 1) ? heatpump_values[21] / 10 : "no", // #55
                    "temperature_mixer1_target": (heatpump_visibility[32] == 1) ? heatpump_values[22] / 10 : "no", // #56
                    "temperaturw_RFV": (heatpump_visibility[33] == 1) ? heatpump_values[23] / 10 : "no",
                    "temperature_mixer2_flow": (heatpump_visibility[34] == 1) ? heatpump_values[24] / 10 : "no", // #57
                    "temperature_mixer2_target": (heatpump_visibility[35] == 1) ? heatpump_values[25] / 10 : "no", // #48
                    "temperature_solar_collector": (heatpump_visibility[36] == 1) ? heatpump_values[26] / 10 : "no", // #50
                    "temperature_solar_storage": (heatpump_visibility[37] == 1) ? heatpump_values[27] / 10 : "no", // #51
                    "temperature_external_source": (heatpump_visibility[38] == 1) ? heatpump_values[28] / 10 : "no",

                    "ASDin": heatpump_values[29],
                    "BWTin": heatpump_values[30],
                    "EVUin": heatpump_values[31],
                    "HDin": heatpump_values[32],
                    "MOTin": heatpump_values[33],
                    "NDin": heatpump_values[34],
                    "PEXin": heatpump_values[35],
                    "SWTin": heatpump_values[36],

                    "AVout": heatpump_values[37],
                    "BUPout": heatpump_values[38],
                    "HUPout": heatpump_values[39],
                    "MA1out": heatpump_values[40],
                    "MZ1out": heatpump_values[41],
                    "VENout": heatpump_values[42],
                    "VBOout": heatpump_values[43],
                    "VD1out": heatpump_values[44],
                    "VD2out": heatpump_values[45],
                    "ZIPout": heatpump_values[46],
                    "ZUPout": heatpump_values[47],
                    "ZW1out": heatpump_values[48],
                    "ZW2SSTout": heatpump_values[49],
                    "ZW3SSTout": heatpump_values[50],
                    "FP2out": heatpump_values[51],
                    "SLPout": heatpump_values[52],
                    "SUPout": heatpump_values[53],
                    "MZ2out": heatpump_values[54],
                    "MA2out": heatpump_values[55],

                    "defrostValve": (heatpump_visibility[47] == 1) ? heatpump_values[37] : "no", // #67
                    "hotWaterBoilerValve": heatpump_values[38], // #9
                    "heatingSystemCircPump": (heatpump_values[39] == 1) ? "on" : "off", // #27

                    "heatSourceMotor": (heatpump_visibility[54] == 1) ? heatpump_values[43] : "no", // #64
                    "compressor1": heatpump_values[44],

                    "hotWaterCircPumpExtern": (heatpump_visibility[57] == 1) ? heatpump_values[46] : "no", // #28

                    "hours_compressor1": Math.round(heatpump_values[56] / 3600),
                    "starts_compressor1": heatpump_values[57],
                    "hours_compressor2": Math.round(heatpump_values[58] / 3600),
                    "starts_compressor2": heatpump_values[59],
                    "hours_2nd_heat_source1": (heatpump_visibility[84] == 1) ? Math.round(heatpump_values[60] / 3600) : "no", // #32
                    "hours_2nd_heat_source2": (heatpump_visibility[85] == 1) ? Math.round(heatpump_values[61] / 3600) : "no", // #38
                    "hours_2nd_heat_source3": (heatpump_visibility[86] == 1) ? Math.round(heatpump_values[62] / 3600) : "no", // #39
                    "hours_heatpump": (heatpump_visibility[87] == 1) ? Math.round(heatpump_values[63] / 3600) : "no", // #33
                    "hours_heating": (heatpump_visibility[195] == 1) ? Math.round(heatpump_values[64] / 3600) : "no", // #34
                    "hours_warmwater": (heatpump_visibility[196] == 1) ? Math.round(heatpump_values[65] / 3600) : "no", // #35
                    "hours_cooling": (heatpump_visibility[197] == 1) ? Math.round(heatpump_values[66] / 3600) : "no",

                    "Time_WPein_akt": heatpump_values[67],
                    "Time_ZWE1_akt": heatpump_values[68],
                    "Time_ZWE2_akt": heatpump_values[69],
                    "Timer_EinschVerz": heatpump_values[70],
                    "Time_SSPAUS_akt": heatpump_values[71],
                    "Time_SSPEIN_akt": heatpump_values[72],
                    "Time_VDStd_akt": heatpump_values[73],
                    "Time_HRM_akt": heatpump_values[74],
                    "Time_HRW_akt": heatpump_values[75],
                    "Time_LGS_akt": heatpump_values[76],
                    "Time_SBW_akt": heatpump_values[77],

                    "typeHeatpump": types.hpTypes[heatpump_values[78]], // #31
                    "bivalentLevel": heatpump_values[79], // #43

                    "WP_BZ_akt": heatpump_values[80],

                    "firmware": parseFirmware(heatpump_values.slice(81, 91)), // #20

                    "AdresseIP_akt": int2ip(heatpump_values[91]),
                    "SubNetMask_akt": int2ip(heatpump_values[92]),
                    "Add_Broadcast": int2ip(heatpump_values[93]),
                    "Add_StdGateway": int2ip(heatpump_values[94]),

                    "errors": [
                        getLogLine(heatpump_values[95], heatpump_values[100]), // #42
                        getLogLine(heatpump_values[96], heatpump_values[101]),
                        getLogLine(heatpump_values[97], heatpump_values[102]),
                        getLogLine(heatpump_values[98], heatpump_values[103]),
                        getLogLine(heatpump_values[99], heatpump_values[104]),
                    ],

                    "error_count": heatpump_values[105],

                    "switch_off": [
                        getLogLine(heatpump_values[111], heatpump_values[106]),
                        getLogLine(heatpump_values[112], heatpump_values[107]),
                        getLogLine(heatpump_values[113], heatpump_values[108]),
                        getLogLine(heatpump_values[114], heatpump_values[109]),
                        getLogLine(heatpump_values[115], heatpump_values[110]),
                    ],

                    "Comfort_exists": heatpump_values[116],

                    "heatpump_state1": heatpump_values[117],
                    "heatpump_state2": heatpump_values[118], // #40
                    "heatpump_state3": heatpump_values[119],
                    "heatpump_duration": heatpump_values[120], // #41
                    "heatpump_state_string": getStateString(heatpump_values),
                    "heatpump_extendet_state_string": getExtendedStateString(heatpump_values),

                    "ahp_Stufe": heatpump_values[121],
                    "ahp_Temp": heatpump_values[122],
                    "ahp_Zeit": heatpump_values[123],

                    "opStateHotWater": heatpump_values[124], // #8
                    "opStateHotWaterString": getOpStateHotWater(heatpump_values),
                    "opStateHeating": heatpump_values[125], // #46
                    "opStateMixer1": heatpump_values[126],
                    "opStateMixer2": heatpump_values[127],
                    "Einst_Kurzprogramm": heatpump_values[128],
                    "StatusSlave_1": heatpump_values[129],
                    "StatusSlave_2": heatpump_values[130],
                    "StatusSlave_3": heatpump_values[131],
                    "StatusSlave_4": heatpump_values[132],
                    "StatusSlave_5": heatpump_values[133],

                    "rawDeviceTimeCalc": new Date(heatpump_values[134] * 1000).toString(), // #22

                    "opStateMixer3": heatpump_values[135],
                    "temperature_mixer3_target": (heatpump_visibility[211] == 1) ? heatpump_values[136] / 10 : "no", // #60
                    "temperature_mixer3_flow": (heatpump_visibility[210] == 1) ? heatpump_values[137] / 10 : "no", // #59

                    "MZ3out": heatpump_values[138],
                    "MA3out": heatpump_values[139],
                    "FP3out": heatpump_values[140],

                    "heatSourceDefrostTimer": (heatpump_visibility[219] == 1) ? heatpump_values[141] : "no", // #66

                    "Temperatur_RFV2": heatpump_values[142] / 10,
                    "Temperatur_RFV3": heatpump_values[143] / 10,
                    "SH_SW": heatpump_values[144],
                    "Zaehler_BetrZeitSW": Math.round(heatpump_values[145] / 3600),
                    "FreigabKuehl": heatpump_values[146],
                    "AnalogIn": heatpump_values[147],
                    "SonderZeichen": heatpump_values[148],
                    "SH_ZIP": heatpump_values[149],
                    "WebsrvProgrammWerteBeobarten": heatpump_values[150],

                    "thermalenergy_heating": (heatpump_visibility[0] == 1) ? heatpump_values[151] / 10 : "no", // #36
                    "thermalenergy_warmwater": (heatpump_visibility[1] == 1) ? heatpump_values[152] / 10 : "no", // #37
                    "thermalenergy_pool": (heatpump_visibility[2] == 1) ? heatpump_values[153] / 10 : "no", // #62
                    "thermalenergy_total": heatpump_values[154] / 10,
                    "flowRate": (heatpump_parameters[870] !== 0) ? heatpump_values[155] : "no", // #19

                    "analogOut1": heatpump_values[156],
                    "analogOut2": heatpump_values[157],
                    "Time_Heissgas": heatpump_values[158],
                    "Temp_Lueftung_Zuluft": heatpump_values[159] / 10,
                    "Temp_Lueftung_Abluft": heatpump_values[160] / 10,

                    "hours_solar": (heatpump_visibility[248] == 1) ? Math.round(heatpump_values[161] / 3600) : "no", // #52
                    "analogOut3": heatpump_values[162],
                    "analogOut4": (heatpump_visibility[267] == 1) ? heatpump_values[163] : "no", // #73 - Voltage heating system circulation pump

                    "Out_VZU": heatpump_values[164],
                    "Out_VAB": heatpump_values[165],
                    "Out_VSK": heatpump_values[166],
                    "Out_FRH": heatpump_values[167],
                    "AnalogIn2": heatpump_values[168],
                    "AnalogIn3": heatpump_values[169],
                    "SAXin": heatpump_values[170],
                    "SPLin": heatpump_values[171],
                    "Compact_exists": heatpump_values[172],
                    "Durchfluss_WQ": heatpump_values[173],
                    "LIN_exists": heatpump_values[174],
                    "LIN_TUE": heatpump_values[175],
                    "LIN_TUE1": heatpump_values[176],
                    "LIN_VDH": heatpump_values[177],
                    "LIN_UH": heatpump_values[178],
                    "LIN_UH_Soll": heatpump_values[179],
                    "LIN_HD": heatpump_values[180],
                    "LIN_ND": heatpump_values[181],
                    "LIN_VDH_out": heatpump_values[182]
                },
                parameters: {
                    "heating_temperature": heatpump_parameters[1] / 10, // #54 - returnTemperatureSetBack
                    "warmwater_temperature": heatpump_parameters[2] / 10,
                    "heating_operation_mode": heatpump_parameters[3], // #10
                    "warmwater_operation_mode": heatpump_parameters[4], // #7

                    "heating_operation_mode_string": getOpState(heatpump_parameters[3]),
                    "warmwater_operation_mode_string": getOpState(heatpump_parameters[4]),

                    "heating_curve_end_point": (heatpump_visibility[207] == 1) ? heatpump_parameters[11] / 10 : "no", // #69
                    "heating_curve_parallel_offset": (heatpump_visibility[207] == 1) ? heatpump_parameters[12] / 10 : "no", // #70
                    "deltaHeatingReduction": heatpump_parameters[13] / 10, // #47

                    "heatSourcedefrostAirThreshold": (heatpump_visibility[97] == 1) ? heatpump_parameters[44] / 10 : "no", // #71

                    "hotWaterTemperatureHysterese": heatpump_parameters[74] / 10, // #49

                    "returnTempHyst": (heatpump_visibility[93] == 1) ? heatpump_parameters[88] / 10 : "no", // #68

                    "heatSourcedefrostAirEnd": (heatpump_visibility[105] == 1) ? heatpump_parameters[98] / 10 : "no", // #72

                    "temperature_hot_water_target": heatpump_parameters[105] / 10,

                    "cooling_operation_mode": heatpump_parameters[108],

                    "cooling_release_temperature": heatpump_parameters[110] / 10,
                    "thresholdTemperatureSetBack": heatpump_parameters[111] / 10, // #48

                    "cooling_inlet_temp": heatpump_parameters[132] / 10,

                    "hotWaterCircPumpDeaerate": (heatpump_visibility[167] == 1) ? heatpump_parameters[684] : "no", // #61

                    "heatingLimit": heatpump_parameters[699], // #11
                    "thresholdHeatingLimit": heatpump_parameters[700] / 10, // #21

                    "cooling_start_after_hours": heatpump_parameters[850],
                    "cooling_stop_after_hours": heatpump_parameters[851],

                    "typeSerial": heatpump_parameters[874].toString().substr(0, 4) + "/" + heatpump_parameters[874].toString().substr(4) + "-" + heatpump_parameters[875].toString(16).toUpperCase(),

                    "returnTemperatureTargetMin": heatpump_parameters[979] / 10 // #63

                    //"possible_temperature_hot_water_limit1": heatpump_parameters[47] / 10,
                    //"possible_temperature_hot_water_limit2": heatpump_parameters[84] / 10,
                    //"possible_temperature_hot_water_limit3": heatpump_parameters[973] / 10,
                },
                additional: {
                    "reading_calculated_time_ms": receivy.readingEndTime - receivy.readingStartTime
                }
            };

            // skips inconsistent flow rates (known problem of the used flow measurement devices)
            if (payload.values.flowRate != "no" && payload.values.heatingSystemCircPump) {
                if (payload.values.flowRate === 0) {
                    payload.values.flowRate = "inconsistent";
                }
            }

            if (payload.parameters.hotWaterCircPumpDeaerate != "no") {
                payload.parameters.hotWaterCircPumpDeaerate = payload.parameters.hotWaterCircPumpDeaerate ? "on" : "off";
            }

            // Consider also heating limit
            var value = "";
            if (payload.parameters.heating_operation_mode === 0 && payload.parameters.heatingLimit == 1 &&
                payload.values.temperature_outside_avg >= payload.parameters.thresholdHeatingLimit &&
                (payload.values.temperature_target_return == payload.parameters.returnTemperatureTargetMin || payload.values.temperature_target_return == 20 && payload.values.temperature_outside < 10)
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


luxtronik.prototype.receivy = {};


luxtronik.prototype.client = null;


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


function writeCommand(command) {
    const buffer = Buffer.allocUnsafe(8);
    buffer.writeInt32BE(command, 0);
    buffer.writeInt32BE(0, 4);
    client.write(buffer);
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

    client.on("data", function (data) {
        if (receivy.activeCommand === 0) {
            const commandEcho = data.readInt32BE(0);
            var firstReadableDataAddress = 0;

            if (commandEcho === 3004) {
                const status = data.readInt32BE(4);
                if (status > 0) {
                    winston.log("error", "Parameter on target changed, restart parameter reading after 5 seconds");
                    client.destroy();
                    process.nextTick(receivy.callback({
                        error: "busy"
                    }));
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
                payload: payload
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


function startWrite(host, port, parameterName, realValue) {
    var setParameter = 0;
    var setValue = 0;

    if (parameterName === "heating_target_temperature") {
        setParameter = 1;
        if (realValue < -10) realValue = -10;
        if (realValue > 10) realValue = +10;
        // Allow only integer temperature or with decimal .5
        setValue = parseInt(realValue * 2, 10) * 5;
        realValue = setValue / 10;
    } else if (parameterName === "warmwater_target_temperaure") {
        setParameter = 2;
        if (realValue < 30) realValue = 30;
        if (realValue > 65) realValue = 65;
        // Allow only integer temperature or with decimal .5
        setValue = parseInt(realValue * 2, 10) * 5;
        realValue = setValue / 10;
    } else if (parameterName === "heating_operation_mode") {
        if (!types.hpMode.hasOwnProperty(realValue.toString())) {
            winston.log("error", "Wrong parameter given for opModeHotWater, use Automatik,Party,Off");
            return;
        }
        setParameter = 3;
        setValue = realValue;
    } else if (parameterName === "warmwater_operation_mode") {
        if (!types.hpMode.hasOwnProperty(realValue.toString())) {
            winston.log("error", "Wrong parameter given for opModeHotWater, use Automatik,Party,Off");
            return;
        }
        setParameter = 4;
        setValue = realValue;
    } else if (parameterName === "cooling_operation_mode") {
        setParameter = 108;
        realValue = setValue;
    } else if (parameterName === "cooling_release_temp") {
        setParameter = 110;
        // Allow only integer temperature or with decimal .5
        setValue = parseInt(realValue * 2, 10) * 5;
        realValue = setValue / 10;
    } else if (parameterName === "cooling_inlet_temp") {
        setParameter = 132;
        // Allow only integer temperature or with decimal .5
        setValue = parseInt(realValue * 2, 10) * 5;
        realValue = setValue / 10;
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
    startRead(this._host, this._port, rawdata, callback);
};


luxtronik.prototype.readRaw = function (callback) {
    startRead(this._host, this._port, true, callback);
};


luxtronik.prototype.write = function (parameterName, realValue) {
    startWrite(this._host, this._port, parameterName, realValue);
};


module.exports = luxtronik;