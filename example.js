const luxtronik = require("./luxtronik");

/* eslint no-console: "off" */
const pump = new luxtronik("127.0.0.1", 8888);
pump.read(function (data) {
    console.log(data);
    console.log(data.values.errors);
});
// pump.write("heating_target_temperature", 0, function (data) {
//     console.log(data);
// });
// pump.write("warmwater_target_temperature", 60);
// pump.write("heating_operation_mode", 0);
// pump.write("warmwater_operation_mode", 0);
