'use strict';
/*jshint browser: true */
/*global requireApp, suite, setup, testConfig, test, assert,
  suiteSetup, suiteTeardown */

requireApp('email/js/alameda.js');
requireApp('email/test/config.js');

suite('model_create', function() {
  var model;

  suiteSetup(function(done) {
    testConfig(
      {
        suiteTeardown: suiteTeardown,
        done: done
      },
      ['model_create'],
      function(mc) {
        model = mc.defaultModel;
      }
    );
  });

  suite('no account by default', function() {
    test('hasAccount false', function() {
      assert.equal(model.hasAccount(), false);
      assert.equal(model.inited, false);
    });
  });


  suite('load default account', function() {
    var account, accounts;

    setup(function(done) {
      model.init();
      model.latestOnce('account', function() {
        account = model.account;
        accounts = model.accounts;
        done();
      });
    });

    test('hasAccount true', function() {
      assert.equal(model.hasAccount(), true);
      assert.equal(model.inited, true);
      assert.equal(accounts.defaultAccount === account, true);
    });
  });

});
