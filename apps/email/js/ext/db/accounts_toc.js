define(function (require) {
  'use strict';

  var evt = require('evt');
  var logic = require('logic');

  const { bsearchForInsert } = require('../util');

  /**
   * Ordering accounts by their name, why not.  (It used to just be creation / id
   * order.)
   */
  function accountDefComparator(a, b) {
    return a.name.localeCompare(b.name);
  }

  /**
   * Provides a list of all accountDefs known to the system.  These accounts need
   * not be loaded/active in memory.  (This differs from v1 where an account had
   * to be loaded to be reported, limiting our capability to lazy-load.)
   *
   * The data-representation provided to the front-end is a specialized wire-rep
   * that censors some data (passwords!), and XXX in the future will include some
   * overlay gunk.
   *
   * The `AccountManager` creates us and is responsible for telling us about
   * accounts being added and removed.  It is the one who listens to MailDB
   * events, not us!  This sets us apart from other TOC's that do their own
   * listening.  We do this because there is lazy-loading involved and it's
   * simpler to reason about if we don't announce the account until everything is
   * good to go.  (This also allows us to potentially introduce some additional
   * pre-reqs in the future.)
   */
  function AccountsTOC() {
    evt.Emitter.call(this);
    logic.defineScope(this, 'AccountsTOC');

    this.accountDefs = [];
    this.accountDefsById = new Map();
  }
  AccountsTOC.prototype = evt.mix({
    type: 'AccountsTOC',

    // We don't care about who references us because we have the lifetime of the
    // universe.
    __acquire: function () {
      return Promise.resolve(this);
    },

    __release: function () {
      // nothing to do
    },

    isKnownAccount: function (accountId) {
      return this.accountDefsById.has(accountId);
    },

    getAllItems: function () {
      return this.accountDefs.map(this.accountDefToWireRep);
    },

    /**
     * Add the account with the given accountDef to be tracked by the TOC,
     * returning the wireRep for the account for any legacy needs.  (We otherwise
     * have no useful return value, so why not do something ugly?)
     */
    __addAccount: function (accountDef) {
      var idx = bsearchForInsert(this.accountDefs, accountDef, accountDefComparator);
      this.accountDefs.splice(idx, 0, accountDef);
      this.accountDefsById.set(accountDef.id, accountDef);
      logic(this, 'addAccount', { accountId: accountDef.id, index: idx });

      var wireRep = this.accountDefToWireRep(accountDef);
      this.emit('add', wireRep, idx);
    },

    __accountModified: function (accountDef) {
      // (Object identity holds here, and the number of accounts will always be
      // smallish, so just use indexOf.)
      var idx = this.accountDefs.indexOf(accountDef);
      if (idx === -1) {
        throw new Error('how do you have a different object?');
      }
      this.emit('change', this.accountDefToWireRep(accountDef), idx);
    },

    __removeAccountById: function (accountId) {
      var accountDef = this.accountDefsById.get(accountId);
      var idx = this.accountDefs.indexOf(accountDef);
      logic(this, 'removeAccountById', { accountId: accountId, index: idx });

      this.accountDefsById.delete(accountId);
      this.accountDefs.splice(idx, 1);

      this.emit('remove', accountId, idx);
    },

    accountDefToWireRep: function (accountDef) {
      return {
        id: accountDef.id,
        name: accountDef.name,
        type: accountDef.type,
        engine: accountDef.engine,

        defaultPriority: accountDef.defaultPriority,

        enabled: true, // XXX overlay mechanism or universe consultation?
        problems: [], // XXX ditto

        syncRange: accountDef.syncRange,
        syncInterval: accountDef.syncInterval,
        notifyOnNew: accountDef.notifyOnNew,
        playSoundOnSend: accountDef.playSoundOnSend,

        identities: accountDef.identities,

        credentials: {
          username: accountDef.credentials.username,
          outgoingUsername: accountDef.credentials.outgoingUsername,
          // no need to send the password to the UI.
          // send all the oauth2 stuff we've got, though.
          oauth2: accountDef.credentials.oauth2
        },

        servers: [{
          type: accountDef.receiveType,
          connInfo: accountDef.receiveConnInfo,
          activeConns: 0 }, // XXX overlay info but we have never used this
        {
          type: accountDef.sendType,
          connInfo: accountDef.sendConnInfo,
          activeConns: 0 }]
      };
    }

  });

  // XXX overlay info but we have never used this
  return AccountsTOC;
});