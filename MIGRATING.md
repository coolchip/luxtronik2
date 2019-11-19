# Migrating

## to 2.0.0

Minimalistic breaking changes. Only the parameter name "returnTempHyst" has changed to "returnTemperatureHysteresis". And "hotWaterTemperatureHysterese" changed to "hotWaterTemperatureHysteresis".

## to 1.0.0

Little changes were made betwen v0.1.2 and v1.0.0. This document describes how
to upgrade your application or library to use the new APIs when upgrading to
luxtronik2 1.0.0.

### Creating an object 

In version 1.0.0, you not longer need to create an instance of luxtronik2. Just
use the createConnection() function to create an connection object to your pump.

v0.1.2:

```
// v0.1.2
const pump = new luxtronik('127.0.0.1', 8888);
```

v1.0.0:

```
// v1.0.0
const pump = luxtronik.createConnection('127.0.0.1', 8888);
```

### Use Node.js ["error-first" callback standard](http://fredkschott.com/post/2014/03/understanding-error-first-callbacks-in-node-js/)

In version 1.0.0, luxtronik2 gives you two parameters in the callback. First
is an error object, second is the data you want to receive. If the error argument
is null, then the operation was successful and if the error argument is not null,
then an error has occurred. This is the Node.js standard way for callbacks.

So you fist have to check if there is an error. Otherwise your are able to continue
processing your data. Be carefull! If error isn't null, no data 

v0.1.2:

```
// v0.1.2
pump.read(function (data) {
    console.log(data);
});
```

v1.0.0:

```
// v1.0.0
pump.read(function (err, data) {
    if (err) {
        return console.log(err);
    }
    console.log(data);
});
```
