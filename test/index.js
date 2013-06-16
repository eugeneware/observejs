var expect = require('chai').expect
  , observejs = require('..')
  , observe = observejs.observe
  , unobserve = observejs.unobserve;

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

      // push
      { type: 'put', key: [ 'cars', '2', 'make' ], value: 'Mazda' },

      // pop
      { type: 'del', key: [ 'cars', '2' ], value:
        {
          make: 'Mazda',
          model: 'M3'
        }
      },

      // reverse
      { type: 'put', key: [ 'tags', '0' ], value: 'tag3' },
      { type: 'put', key: [ 'tags', '2' ], value: 'tag1' },

      // shift
      { type: 'del', key: [ 'tags', '2' ], value: 'tag3' },
      { type: 'put', key: [ 'tags', '0' ], value: 'tag2' },
      { type: 'put', key: [ 'tags', '1' ], value: 'tag1' }

      ];
    var received = 0;
    watcher.on('data', function (data) {
      //console.log(data);
      expect(data).to.deep.equal(expected[received++]);
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

    o.tags.reverse();
    expect(o.tags).to.deep.equal(['tag3', 'tag2', 'tag1']);

    var tag = o.tags.shift();
    expect(tag).to.equal('tag3');

    watcher.on('end', function () {
      done();
    });
    unobserve(o);
  });
});
