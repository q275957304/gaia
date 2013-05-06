/*global define*/
define([
  'tmpl!./settings-account.html',
  'tmpl!./tng/account-settings-server.html',
  'tmpl!./tng/account-delete-confirm.html',
  'mail-common',
  'mail-app',
  './setup-l10n-map',
  'l10n'
], function (templateNode, tngAccountSettingsServerNode,
   tngAccountDeleteConfirmNode, common, App, SETUP_ERROR_L10N_ID_MAP, mozL10n) {

var Cards = common.Cards,
    ConfirmDialog = common.ConfirmDialog;

/**
 * Per-account settings, maybe some metadata.
 */
function SettingsAccountCard(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;

  var serversContainer =
    domNode.getElementsByClassName('tng-account-server-container')[0];

  domNode.getElementsByClassName('tng-account-header-label')[0]
    .textContent = args.account.name;

  domNode.getElementsByClassName('tng-back-btn')[0]
    .addEventListener('click', this.onBack.bind(this), false);

  domNode.getElementsByClassName('tng-account-delete')[0]
    .addEventListener('click', this.onDelete.bind(this), false);

  // ActiveSync, IMAP and SMTP are protocol names, no need to be localized
  domNode.getElementsByClassName('tng-account-type')[0].textContent =
    (this.account.type === 'activesync') ? 'ActiveSync' : 'IMAP+SMTP';

  var synchronizeNode = domNode.getElementsByClassName(
    'tng-account-synchronize')[0];
  synchronizeNode.value = this.account.syncRange;
  synchronizeNode.addEventListener(
    'change', this.onChangeSynchronize.bind(this), false);

  this.account.servers.forEach(function(server, index) {
    var serverNode = tngAccountSettingsServerNode.cloneNode(true);
    var serverLabel =
      serverNode.getElementsByClassName('tng-account-server-label')[0];

    serverLabel.textContent = mozL10n.get('settings-' + server.type + '-label');
    serverLabel.addEventListener('click',
      this.onClickServers.bind(this, index), false);

    serversContainer.appendChild(serverNode);
  }.bind(this));

  domNode.getElementsByClassName('tng-account-credentials')[0]
    .addEventListener('click',
      this.onClickCredentials.bind(this), false);
}
SettingsAccountCard.prototype = {
  onBack: function() {
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  onClickCredentials: function() {
    Cards.pushCard(
      'settings-account-credentials', 'default', 'animate',
      {
        account: this.account
      },
      'right');
  },

  onClickServers: function(index) {
    Cards.pushCard(
      'settings-account-servers', 'default', 'animate',
      {
        account: this.account,
        index: index
      },
      'right');
  },

  onChangeSynchronize: function(event) {
    this.account.modifyAccount({syncRange: event.target.value});

    // If we just changed the currently-selected account, refresh the
    // currently-open folder to propagate the syncRange change.
    var curAccount = Cards.findCardObject(['folder-picker', 'navigation'])
                          .cardImpl.curAccount;
    if (curAccount.id === this.account.id) {
      Cards.findCardObject(['message-list', 'nonsearch']).cardImpl.onRefresh();
    }
  },

  onDelete: function() {
    var account = this.account;

    var dialog = tngAccountDeleteConfirmNode.cloneNode(true);
    var content = dialog.getElementsByTagName('p')[0];
    content.textContent = mozL10n.get('settings-account-delete-prompt',
                                      { account: account.name });
    ConfirmDialog.show(dialog,
      { // Confirm
        id: 'account-delete-ok',
        handler: function() {
          account.deleteAccount();
          Cards.removeAllCards();
          App.showMessageViewOrSetup();
        }
      },
      { // Cancel
        id: 'account-delete-cancel',
        handler: null
      }
    );
  },

  die: function() {
  }
};
Cards.defineCardWithDefaultMode(
    'settings-account',
    { tray: false },
    SettingsAccountCard,
    templateNode
);

});