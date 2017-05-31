"use strict";

const assert = require("assertthat");
//const proxyquire = require("proxyquire");
const Net = require("net");

//let socketListener = [];
////close, data, error

// const socketStub = {
//     "listener": [],
//     "connect": (port, host, callback) => {
//         process.nextTick(callback);
//         process.nextTick(function () {
//             socketListener["data"](5210);
//         });
//     },
//     "on": (event, callback) => {
//         socketListener.push({
//             event,
//             callback
//         });
//     },
//     "destroy": () => {
//         return socketListener = [];
//     }
// };

// const netStub = {
//     "Socket": () => {
//         return socketStub;
//     }
// };


const Mitm = require("mitm");
const mitm = Mitm();

const Luxtronik = require("../luxtronik");

mitm.on("connection", function (socket) {
    console.log("cnnctn!");
    socket.write(5210);
});

mitm.on("connect", function (socket, opts) {
    console.log("cnnct!");
    if (opts.host === "sql.example.org" && opts.port === 5432) socket.bypass();
});


// const Luxtronik = proxyquire("../luxtronik", {
//     "net": netStub
// });

suite("Mocha tests", () => {
    suite("Luxtronik", () => {
        test("is a function.", done => {
            assert.that(Luxtronik).is.ofType("function");
            done();
        });

        test("function returns an object.", done => {
            assert.that(Luxtronik()).is.ofType("object");
            done();
        });

        test("call with new returns an object.", done => {
            assert.that(new Luxtronik).is.ofType("object");
            done();
        });
    });
    suite("Luxtronik pump", () => {
        const pump = new Luxtronik();

        test("read returns data.", done => {
            pump.read(function (err, data) {
                assert.that(err).is.null();
                assert.that(data).is.ofType("object");
                done();
            });
        });
/*
        test("mitm.", done => {
            const socket = Net.connect(22, "example.org");
            socket.write("Hello!");
            socket.setEncoding("utf8");
            socket.read(); // => "Hello back!"

            done();
        });
    */
    });
});