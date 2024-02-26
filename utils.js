'use strict';

const humanizeduration = require('humanize-duration');
const huminizeoptions = {
    language: 'de',
    conjunction: ' und ',
    serialComma: false,
};

const types = require('./types');

function createFirmwareString(buf) {
    let firmware = '';
    for (const key in buf) {
        if ({}.hasOwnProperty.call(buf, key)) {
            firmware += buf[key] === 0 ? '' : String.fromCharCode(buf[key]);
        }
    }
    return firmware;
}

function int2ipAddress(value) {
    const part1 = value & 255;
    const part2 = (value >> 8) & 255;
    const part3 = (value >> 16) & 255;
    const part4 = (value >> 24) & 255;
    return part4 + '.' + part3 + '.' + part2 + '.' + part1;
}

function createStateString(values) {
    let stateStr = '';
    const state1 = values[117];
    const state2 = values[118];
    const duration = values[120];

    // Text aus Define
    if (Object.prototype.hasOwnProperty.call(types.stateMessages, state1)) {
        stateStr = types.stateMessages[state1];
        if (state2 === 0 || state2 === 2) {
            stateStr += ' seit ';
        } else if (state2 === 1) {
            stateStr += ' in ';
        }

        // Sonderbehandlung bei WP-Fehlern - Zeitstempel des zuletzt aufgetretenen Fehlers nehmen
        if (state2 === 2) {
            stateStr += new Date(values[95] * 1000).toString();
        } else {
            stateStr += humanizeduration(duration * 1000, huminizeoptions);
        }
    } else {
        stateStr = 'Unknown [' + state1 + ']';
    }
    return stateStr;
}

function createExtendedStateString(values) {
    let stateStr = '';
    const defrostValve = values[37];
    const heatSourceMotor = values[43];
    const compressor1 = values[44];
    const state3 = values[119];
    const ahpStufe = values[121];
    const ahpTemp = values[122] / 10;

    if (Object.prototype.hasOwnProperty.call(types.extendetStateMessages, state3)) {
        stateStr = types.extendetStateMessages[state3];
        if (state3 === 6) {
            // Estrich Programm
            stateStr += ' Stufe ' + ahpStufe + ' - ' + ahpTemp + ' °C';
        } else if (state3 === 7) {
            // Abtauen
            if (defrostValve === 1) {
                stateStr += 'Abtauen (Kreisumkehr)';
            } else if (compressor1 === 0 && heatSourceMotor === 1) {
                stateStr += 'Luftabtauen';
            } else {
                stateStr += 'Abtauen';
            }
        }
    } else {
        stateStr = 'Unknown [' + state3 + ']';
    }
    return stateStr;
}

function createOperationStateString(state) {
    let stateStr = '';
    if (Object.prototype.hasOwnProperty.call(types.hpMode, state)) {
        stateStr = types.hpMode[state];
    } else {
        stateStr = 'Unknown [' + state + ']';
    }
    return stateStr;
}

function createHotWaterStateString(values) {
    let stateStr = '';
    const hotWaterBoilerValve = values[38];
    const opStateHotWater = values[124];
    if (opStateHotWater === 0) {
        stateStr = 'Sperrzeit';
    } else if (opStateHotWater === 1 && hotWaterBoilerValve === 1) {
        stateStr = 'Aufheizen';
    } else if (opStateHotWater === 1 && hotWaterBoilerValve === 0) {
        stateStr = 'Temp. OK';
    } else if (opStateHotWater === 3) {
        stateStr = 'Aus';
    } else {
        stateStr = 'Unknown [' + opStateHotWater + '/' + hotWaterBoilerValve + ']';
    }
    return stateStr;
}

function createCode(time, code, codeTypes) {
    return {
        code,
        date: new Date(time * 1000),
        message: Object.prototype.hasOwnProperty.call(codeTypes, code) ? codeTypes[code] : codeTypes[-1],
    };
}

function createCodeList(timeArray, codeArray, codeTypes) {
    const logArray = [];
    for (let i = 0; i < timeArray.length; i++) {
        logArray.push(createCode(timeArray[i], codeArray[i], codeTypes));
    }
    return logArray;
}

function createOutageCodeList(timeArray, codeArray) {
    return createCodeList(timeArray, codeArray, types.outageCodes);
}

function createErrorCodeList(timeArray, codeArray) {
    return createCodeList(timeArray, codeArray, types.errorCodes);
}

function toInt32ArrayReadBE(buffer) {
    const i32a = new Int32Array(buffer.length / 4);
    for (let i = 0; i < i32a.length; i++) {
        i32a[i] = buffer.readInt32BE(i * 4);
    }
    return i32a;
}

function createHeatPumptTypeString(value) {
    return Object.prototype.hasOwnProperty.call(types.hpTypes, value) ? types.hpTypes[value] : types.hpTypes[-1];
}

function value2LuxtronikSetTemperatureValue(realValue) {
    // Allow only integer temperature. Add factor x10.
    return parseInt(realValue * 10, 10);
}

function value2LuxtronikSetHundrethValue(realValue) {
    // Allow only integer temperature. Add factor x100.
    return parseInt(realValue * 100, 10);
}

function isValidOperationMode(value) {
    return Object.prototype.hasOwnProperty.call(types.hpMode, value.toString());
}

function limitRange(value, min, max) {
    if (value < min) {
        value = min;
    }
    if (value > max) {
        value = max;
    }
    return value;
}

function createTimerTableTypeString(value) {
    let tableStr = '';

    if (Object.prototype.hasOwnProperty.call(types.timerTableTypes, value)) {
        tableStr = types.timerTableTypes[value];
    } else {
        tableStr = 'unbekannt';
    }

    return tableStr;
}

function secondsToTimeString(value) {
    const timeMilliseconds = new Date(value * 1000);
    const timeStr = timeMilliseconds.toISOString().substr(11, 5);
    return timeStr;
}

function createTimerTable(parameters, startindex, rows, swapOnOff = false) {
    const timerTable = [];

    for (let rowindex = 0; rowindex < rows; rowindex++) {
        let onTime = secondsToTimeString(parameters[startindex + rowindex * 2]);
        let offTime = secondsToTimeString(parameters[startindex + rowindex * 2 + 1]);
        if (swapOnOff === true) {
            const tmp = onTime;
            onTime = offTime;
            offTime = tmp;
        }
        timerTable.push({
            on: onTime,
            off: offTime,
        });
    }

    return timerTable;
}

module.exports = {
    createFirmwareString,
    int2ipAddress,
    createStateString,
    createExtendedStateString,
    createOperationStateString,
    createHotWaterStateString,
    createOutageCodeList,
    createErrorCodeList,
    toInt32ArrayReadBE,
    createHeatPumptTypeString,
    value2LuxtronikSetTemperatureValue,
    value2LuxtronikSetHundrethValue,
    isValidOperationMode,
    limitRange,
    createTimerTableTypeString,
    createTimerTable,
};
