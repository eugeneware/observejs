var through = require('through')
  , diff = require('changeset');

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
  },
  shift: function (args, path, watched, s) {
    var idx = String(this.length - 1);
    var ret = Array.prototype.shift.apply(this, args);
    s.queue({ type: 'del', key: path.concat(idx), value: ret });
    var self = this;
    Object.keys(this).forEach(function (idx) {
      var value =self[idx];
      watchProp(self, idx, path.concat(idx), watched, s);
      s.queue(
        { type: 'put', key: path.concat(String(idx)), value: clone(value) });
    });
    return ret;
  },
  sort: function (args, path, watched, s) {
    var i;
    unobserve(this);
    var old = clone(this);
    var ret = Array.prototype.sort.apply(this, args);
    var changes = diff(old, ret);
    var self = this;
    changes.forEach(function (change) {
      change.key = path.concat(change.key);
      s.queue(change);
    });
    observe(this, s, path);
    return ret;
  },
  splice: function (args, path, watched, s) {
    // array.splice(index , howMany[, element1[, ...[, elementN]]])
    var i;
    var index = args[0]
      , howMany = args[1]
      , elCount = args.length - 2;
    var ret = Array.prototype.splice.apply(this, args);
    for (i = index; i < index + howMany; i++) {
      s.queue({ type: 'del', key: path.concat(String(i)) });
    }
    for (i = index; i < index + elCount; i++) {
      var value = this[i];
      var idx = String(i);
      watchProp(this, idx, path.concat(idx), watched, s);
      s.queue(
        { type: 'put', key: path.concat(String(i)), value: clone(value) });
    }
    return ret;
  }
};

var arrayMethods =
  ['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'];

function patchArray(o, path, watched, s) {
    arrayMethods.forEach(function (fn) {
      var _fn = o[fn];
      Object.defineProperty(o, fn, {
        configurable: true,
        enumerable: false,
        get: function () {
          return function () {
            var args = [].slice.call(arguments);
            if (fn in arrayFns) {
              return arrayFns[fn].call(o, args, path, watched, s);
            } else {
              return _fn.apply(o, args);
            }
          };
        }
      });
    });

  Object.defineProperty(o, '_unpatch', {
    get: function () {
      return function () {
        arrayMethods.forEach(function (fn) {
          o[fn] = Array.prototype[fn];
        });
        delete o._unpatch;
      };
    },
    enumerable: false,
    configurable: true
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

exports.observe = observe;
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
    configurable: true,
    get: function () {
      return {
        watched: watched,
        path: path,
        s: s
      };
    },
    enumerable: false
  });

  return s;
}

exports.unobserve = unobserve;
function unobserve(o) {
  var state;
  if (Array.isArray(o) && o._watching) {
    o._unpatch();
  }

  if (typeof o === 'object' && (state = o._watching)) {
    var path = state.path
      , watched = state.watched
      , s = state.s;
    Object.keys(o).forEach(function (prop) {
      var value = watched[prop];
      unobserve(value);
      delete o[prop];
      o[prop] = value;
    });

    delete o._watching;

    if (path.length === 0) s.emit('end');
  }
}
