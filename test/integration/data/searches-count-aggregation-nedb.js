describe('integration/' + require('path').basename(__filename) + '\n', function() {
  this.timeout(10000);

  let expect = require('expect.js');
  let test_id;
  var happnerTestHelper;

  var publisherclient;
  var listenerclient;

  const config = {
    happn: {}
  };

  before('should initialize the service and clients', async () => {
    test_id = Date.now() + '_' + require('shortid').generate();
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

  it('tests a normal search, with the count option and $not fails', function(callback) {
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
      function(e) {
        expect(e.toString()).to.be('SystemError: Unknown comparison function $not');
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
        //this is because the nedb data provider has no idea about collation
        expect(count.value).to.be(1);
        callback();
      }
    );
  });

  it('tests an aggregated search', function(callback) {
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
      function(e) {
        expect(e.toString()).to.be(
          'SystemError: aggregate feature not available for provider on path: /searches-and-aggregation/*'
        );
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
      function(e) {
        expect(e.toString()).to.be(
          'SystemError: aggregate feature not available for provider on path: /searches-and-aggregation/*'
        );
        callback();
      }
    );
  });
});
