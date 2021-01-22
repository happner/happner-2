describe('integration/' + require('path').basename(__filename) + '\n', function() {
  this.timeout(5000);

  let expect = require('expect.js');
  var happnerTestHelper;

  var publisherclient;
  var listenerclient;

  let DB_NAME = 'test-happner-2-searches-count-aggregation';
  let COLL_NAME = 'test-happner-2-searches-count-aggregation-coll';

  const config = {
    happn: {
      services: {
        data: {
          config: {
            autoUpdateDBVersion: true,
            datastores: [
              {
                name: 'mongo',
                provider: 'happn-service-mongo-2',
                isDefault: true,
                settings: {
                  database: DB_NAME,
                  collection: COLL_NAME
                }
              }
            ]
          }
        }
      }
    }
  };

  before('should clear the mongo collection', async () => {
    let dropMongoDb = require('../../__fixtures/utils/drop-mongo-db');
    await dropMongoDb(DB_NAME);
  });

  before('should initialize the service and clients', async () => {
    Date.now() + '_' + require('shortid').generate();
    happnerTestHelper = require('../../__fixtures/utils/happner-test-helper').create(config);
    await happnerTestHelper.initialize();
    publisherclient = happnerTestHelper.publisherclient;
    listenerclient = happnerTestHelper.listenerclient;
  });

  function createTestItem(id, group, custom, pathPrefix) {
    return new Promise((resolve, reject) => {
      publisherclient.data.set(
        `${pathPrefix || ''}/searches-and-aggregation/${id}`,
        {
          group,
          custom,
          id
        },
        {},
        function(e, response, created) {
          if (e) return reject(e);
          resolve(created);
        }
      );
    });
  }

  before('it creates test data', async () => {
    await createTestItem(1, 'odd', 'Odd');
    await createTestItem(2, 'even', 'Even');
    await createTestItem(3, 'odd', 'odd');
    await createTestItem(4, 'even', 'even');
    await createTestItem(5, 'odd', 'ODD');
    await createTestItem(6, 'even', 'EVEN');
    await createTestItem(7, 'odd', 'odD');
    await createTestItem(8, 'even', 'EVen');
    await createTestItem(9, 'odd', 'odd');
    await createTestItem(10, 'even', 'even');
    await createTestItem(11, 'even', 'even', '/other');
    await createTestItem(12, 'even', 'even', '/other');
  });

  after(async () => {
    await happnerTestHelper.tearDown();
  });

  it('tests a normal search', function(callback) {
    listenerclient.data.get('/searches-and-aggregation/*', {}, function(e, items) {
      if (e) return callback(e);
      expect(items.length).to.be(10);
      callback();
    });
  });

  it('tests a normal search, with the count option and $not', function(callback) {
    listenerclient.data.count(
      '/searches-and-aggregation/*',
      {
        criteria: {
          custom: {
            $not: {
              $eq: 'Odd'
            }
          }
        }
      },
      function(e, count) {
        if (e) return callback(e);
        expect(count.value).to.be(9);
        callback();
      }
    );
  });

  it('tests a normal search, with the count option, collation case insensitive', function(callback) {
    listenerclient.data.count(
      '/searches-and-aggregation/*',
      {
        criteria: {
          'data.custom': {
            $eq: 'Odd'
          }
        },
        options: {
          collation: {
            locale: 'en_US',
            strength: 1
          }
        }
      },
      function(e, count) {
        if (e) return callback(e);
        expect(count.value).to.be(5);
        callback();
      }
    );
  });

  it('tests a normal search, with the count option, case sensitive', function(callback) {
    listenerclient.data.count(
      '/searches-and-aggregation/*',
      {
        criteria: {
          custom: {
            $eq: 'Odd'
          }
        },
        options: {}
      },
      function(e, count) {
        if (e) return callback(e);
        expect(count.value).to.be(1);
        callback();
      }
    );
  });

  it.skip('tests an aggregated search', function(callback) {
    listenerclient.data.get(
      '/searches-and-aggregation/*',
      {
        criteria: {
          'data.group': {
            $eq: 'odd'
          }
        },
        aggregate: [
          {
            $group: {
              _id: '$data.custom',
              total: {
                $sum: '$data.id'
              }
            }
          }
        ]
      },
      function(e, items) {
        if (e) return callback(e);
        expect(items.value.length).to.be(4);
        expect(items.value.sort((a, b) => a.total - b.total)).to.eql([
          {
            _id: 'Odd',
            total: 1
          },
          {
            _id: 'ODD',
            total: 5
          },
          {
            _id: 'odD',
            total: 7
          },
          {
            _id: 'odd',
            total: 12
          }
        ]);
        callback();
      }
    );
  });

  it('tests an aggregated search with a case-insensitive collation', function(callback) {
    listenerclient.data.get(
      '/searches-and-aggregation/*',
      {
        criteria: {
          'data.group': {
            $eq: 'odd'
          }
        },
        aggregate: [
          {
            $group: {
              _id: '$data.custom',
              total: {
                $sum: '$data.id'
              }
            }
          }
        ],
        options: {
          collation: {
            locale: 'en_US',
            strength: 1
          }
        }
      },
      function(e, items) {
        if (e) return callback(e);
        expect(items.value.length).to.be(1);
        expect(items.value).to.eql([
          {
            _id: 'Odd',
            total: 25
          }
        ]);
        callback();
      }
    );
  });
});
