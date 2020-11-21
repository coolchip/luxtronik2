// 'use strict';

// const fs = require('fs');
// const path = require('path');

// const { assert } = require('assertthat');
// const mitm = require('mitm')();

// const luxtronik = require('../luxtronik');

// let receiveDataBuffer = [];

// mitm.on('connection', function (socket) {
//     socket.on('data', function (data) {
//         const recvSym = data.readInt32BE(0);
//         if (recvSym === 0) {
//             const command = receiveDataBuffer.pop();
//             const dataFile = path.join(__dirname, 'data', command.toString());
//             fs.readFile(dataFile, function (err, data) {
//                 if (!err) {
//                     socket.write(data);
//                 }
//             });
//             receiveDataBuffer = [];
//         } else {
//             receiveDataBuffer.push(recvSym);
//         }
//     });
// });

// suite('Mocha tests', () => {
//     suite('Luxtronik', () => {
//         test('is an object.', done => {
//             assert.that(luxtronik).is.ofType('object');
//             done();
//         });

//         test('createConnection() function returns an object.', done => {
//             assert.that(luxtronik.createConnection()).is.ofType('object');
//             done();
//         });

//         test('connection has function read.', done => {
//             assert.that(luxtronik.createConnection().read).is.ofType('function');
//             done();
//         });

//         test('connection has function write.', done => {
//             assert.that(luxtronik.createConnection().write).is.ofType('function');
//             done();
//         });
//     });

//     /*    suite('Luxtronik pump', () => {
//             const pump = luxtronik.createConnection('127.0.0.1', 8888);
//             test('read returns data.', done => {
//                 pump.read(function (err, data) {
//                     assert.that(err).is.null();
//                     assert.that(data).is.ofType('object');
//                     assert.that(data.values).is.ofType('object');
//                     assert.that(data.parameters).is.ofType('object');
//                     done();
//                 });
//             });
//         });*/
// });
