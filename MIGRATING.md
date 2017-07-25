# Migrating

Little changes were made betwen v0.1.2 and v1.0.0. This document describes how
to upgrade your application or library to use the new APIs when upgrading to
luxtronik2 1.0.0.

## Creating an object 

In version 1.0.0, you not longer need to create an instance yourself.

v0.1.2:

```
// v0.1.2
const pump = new luxtronik("127.0.0.1", 8888);
```

v1.0.0:

```
// v1.0.0
const pump = luxtronik("127.0.0.1", 8888);
```

But you can, if you want to.

## Use Node.js error first callback standard 

In version 1.0.0, luxtronik2 calls callbacks in the node.js standard way.

v0.1.2:

```
// v0.1.2
const pump = new luxtronik("127.0.0.1", 8888);
pump.read(function (data) {
    console.log(data);
    console.log(data.values.errors);
});
```

v1.0.0:

```
// v1.0.0
const pump = new luxtronik("127.0.0.1", 8888);
pump.read(function (err, data) {
    if (err) {
        return console.log(err);
    }
    console.log(data);
    console.log(data.values.errors);
});
```
