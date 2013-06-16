# observejs

Watch a Javascript object for changes and stream changes to another object
using node.js Streams.

# Installation

Install with npm:

```
$ npm install observejs
```

# Example

``` js
var observejs = require('observejs');

// the source object
var o = {
  name: 'Eugene',
  number: 42,
  tags: ['tag1', 'tag2', 'tag3'],
  cars: [
    {
      make: 'Toyota',
      model: 'Camry'
    },
    {
      make: 'Toyota',
      model: 'Corolla'
    }
  ]
};

// deep clone of o
var o2 = JSON.parse(JSON.stringify(o));

// Replicate any changes to o2
observejs.observe(o)
  .pipe(observejs.changes(o2));

// Make some changes to the source object
o.name = 'Susan';
o.number = 43;
o.number = undefined;
o.cars[0].make = 'Holden';
o.cars.push({
  make: 'BMW',
  model: 'M3'
});

// o and o2 should be equal
expect(o2).to.deep.equals(o);
```

## methods

``` js
var observejs = require('observerjs');
```

### observejs.observe(src)

Watch the object ```src``` for any changes. Returns a stream which can be used
with ```observerjs.changes(dest)``` to keep another object in sync.

### observejs.unobserve(src)

Stop watching the object ```src```.

### observejs.changes(dest)

Stream which takes the data from an ```observerjs.observer(src)``` and keeps
the target object ```dest``` in sync with the source.
