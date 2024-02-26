const luxtronik = require('./luxtronik');

const pump = luxtronik.createConnection('127.0.0.1', 8888);

pump.read(function (err, data) {
    if (err) {
        return console.log(err);
    }
    console.log(data);
    console.log(data.values.errors);

    require('fs').writeFileSync('data.json', JSON.stringify(data, null, 4));
});
/*
pump.write('heating_target_temperature', 0, function (err, data) {
    if (!err) {
        console.log(data);
    }
});
pump.write('warmwater_target_temperature', 60);
pump.write('heating_operation_mode', 0, function (err, data) {
    if (!err) {
        console.log(data);
    }
});
pump.write('warmwater_operation_mode', 0, function (err, data) {
    if (!err) {
        console.log(data);
    }
});
*/
