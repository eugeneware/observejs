var expect = require('chai').expect
  , through = require('through');

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

var arrayFns = {
  pop: function (args, path, watched, s) {
    var idx = String(this.length - 1);
    var ret = Array.prototype.pop.apply(this, args);
    var evt = { type: 'del', key: path.concat(idx), value: clone(ret) };
    s.queue(evt);
    return ret;
  },
  push: function (args, path, watched, s) {
    var len = this.length;
    var ret = Array.prototype.push.apply(this, args);
    var self = this;
    args.forEach(function (arg, i) {
      var idx = String(len + i);
      watchProp(self, idx, path, watched, s);
      var evt = { type: 'put', key: path.concat(idx), value: arg };
      s.queue(evt);
    });
    return ret;
  }
};

function patchArray(o, path, watched, s) {
  ['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift']
    .forEach(function (fn) {
      var _fn = o[fn];
      o[fn] = function () {
        var args = [].slice.call(arguments);
        if (fn in arrayFns) {
          return arrayFns[fn].call(o, args, path, watched, s);
        } else {
          return _fn.apply(o, args);
        }
      };
    });

  Object.defineProperty(o, '_unpatch', {
    get: function () {
      Object.keys(_unpatch).forEach(function (fn) {
        o[fn] = Array.prototype[fn];
      });
    },
    enumerable: false
  });
}

function watchProp(o, prop, path, watched, s) {
  var val = o[prop];
  watched[prop] = val;
  Object.defineProperty(o, prop, {
    get: function () {
      var value = watched[prop];
      if (typeof value === 'object' && value._watching === undefined) {
        observe(value, s, path.concat(prop));
      }
      return value;
    },
    set: function (value) {
      var type = (value === undefined) ? 'del' : 'put';
      watched[prop] = value;
      var evt = { type: type, key: path.concat(prop) };
      if (type === 'put') evt.value = value;
      s.queue(evt);
    },
    enumerable: true,
    configurable: true
  });
}

function observe(o, s, path) {
  if (s === undefined) {
    s = through();
    s.writable = false;
    path = [];
  }

  var watched = {};

  if (Array.isArray(o) && !o._watching) {
    patchArray(o, path, watched, s);
  }

  Object.keys(o).forEach(function (prop) {
    watchProp(o, prop, path, watched, s);
  });

  Object.defineProperty(o, '_watching', {
    get: function () {
      return watched;
    },
    enumerable: false
  });

  return s;
}

describe('observejs', function () {
  it('should be able to wrap an object', function (done) {
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

    var watcher = observe(o);
    var expected = [
      { type: 'put', key: ['name'], value: 'Susan' },
      { type: 'put', key: ['number'], value: 43 },
      { type: 'del', key: ['number'] },
      { type: 'put', key: [ 'cars', '0', 'make' ], value: 'Holden' },
      { type: 'put', key: [ 'cars', '2' ], value:
        {
          make: 'BMW',
          model: 'M3'
        }
      },
      { type: 'put', key: [ 'cars', '2', 'make' ], value: 'Mazda' },
      { type: 'del', key: [ 'cars', '2' ], value:
        {
          make: 'Mazda',
          model: 'M3'
        }
      }
      ];
    var received = 0;
    watcher.on('data', function (data) {
      //console.log(data);
      expect(data).to.deep.equal(expected[received++]);
      if (received === expected.length) done();
    });

    o.name = 'Susan';
    o.number = 43;
    o.number = undefined;
    o.cars[0].make = 'Holden';
    o.cars.push({
      make: 'BMW',
      model: 'M3'
    });
    o.cars[2].make = 'Mazda';
    var car = o.cars.pop();
  });
});
