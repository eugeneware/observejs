var expect = require('chai').expect
  , observe = require('..');

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
