// Karma configuration
// Generated on Tue Dec 01 2015 11:18:30 GMT+0200 (SAST)

module.exports = function(config) {
  config.set({
    crossOriginAttribute: false,

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'chai'],

    files: [
      { pattern: 'http://localhost:55000/api/client', type: 'js' },
      'browsertest_01_happner_client.js',
      'browsertest_02_security.js',
      'browsertest_03_events.js',
      'browsertest_05_login_promise.js',
      'browsertest_06_cookies.js'
    ],

    // list of files / patterns to load in the browser
    // files: [
    //  'build/crypto-min.js',
    //   {pattern: 'test/crypto-test.js', included: false}
    // ],

    // list of files to exclude
    exclude: [],

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['mocha'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['ChromeHeadless'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultanous
    concurrency: Infinity,

    browserNoActivityTimeout: 60000
  });
};
