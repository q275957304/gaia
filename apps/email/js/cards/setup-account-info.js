/*global define*/
define([
  'tmpl!./setup-account-info.html',
  'mail-common',
  'mail-app',
  './setup-l10n-map',
  'l10n'
], function (templateNode, common, App, SETUP_ERROR_L10N_ID_MAP, mozL10n) {

var Cards = common.Cards,
    FormNavigation = common.FormNavigation;

/**
 * Enter basic account info card (name, e-mail address, password) to try and
 * autoconfigure an account.
 */
function SetupAccountInfoCard(domNode, mode, args) {
  this.domNode = domNode;

  // The back button should only be enabled if there is at least one other
  // account already in existence.
  if (args.allowBack) {
    var backButton = domNode.getElementsByClassName('sup-back-btn')[0];
    backButton.addEventListener('click', this.onBack.bind(this), false);
    backButton.classList.remove('collapsed');
  }

  this.nextButton = domNode.getElementsByClassName('sup-info-next-btn')[0];
  this.nextButton.addEventListener('click', this.onNext.bind(this), false);

  this.formNode = domNode.getElementsByClassName('sup-account-form')[0];

  this.nameNode = this.domNode.getElementsByClassName('sup-info-name')[0];
  this.emailNode = this.domNode.getElementsByClassName('sup-info-email')[0];
  this.passwordNode =
    this.domNode.getElementsByClassName('sup-info-password')[0];

  // Add input event handler to prevent user submit empty name or password.
  this.emailNode.addEventListener('input', this.onInfoInput.bind(this));
  this.nameNode.addEventListener('input', this.onInfoInput.bind(this));
  this.passwordNode.addEventListener('input', this.onInfoInput.bind(this));

  var manualConfig = domNode.getElementsByClassName('sup-manual-config-btn')[0];
  manualConfig.addEventListener('click', this.onClickManualConfig.bind(this),
                                false);

  new FormNavigation({
    formElem: domNode.getElementsByTagName('form')[0],
    onLast: this.onNext.bind(this)
  });
}

SetupAccountInfoCard.prototype = {
  onBack: function(event) {
    // If we are the only card, we need to remove ourselves and tell the app
    // to do initial card pushing.  This would happen if the app was started
    // without any accounts.
    if (Cards._cardStack.length === 1) {
      Cards.removeAllCards();
      App.showMessageViewOrSetup();
    }
    // Otherwise we were triggered from the settings UI and we can just pop
    // our way back to that UI.
    else {
      Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
    }
  },
  onNext: function(event) {
    var nameNode = this.domNode.getElementsByClassName('sup-info-name')[0],
        emailNode = this.domNode.getElementsByClassName('sup-info-email')[0],
        passwordNode =
          this.domNode.getElementsByClassName('sup-info-password')[0];

    // The progress card is the dude that actually tries to create the account.
    Cards.pushCard(
      'setup-progress', 'default', 'animate',
      {
        displayName: this.nameNode.value,
        emailAddress: this.emailNode.value,
        password: this.passwordNode.value,
        callingCard: this
      },
      'right');
  },

  onInfoInput: function(event) {
    this.nextButton.disabled = !this.formNode.checkValidity();
  },

  onClickManualConfig: function() {
    Cards.pushCard(
      'setup-manual-config', 'default', 'animate',
      {
        displayName: this.nameNode.value,
        emailAddress: this.emailNode.value,
        password: this.passwordNode.value
      },
      'right');
  },

  // note: this method is also reused by the manual config card
  showError: function(errName, errDetails) {
    this.domNode.getElementsByClassName('sup-error-region')[0]
        .classList.remove('collapsed');
    var errorMessageNode =
      this.domNode.getElementsByClassName('sup-error-message')[0];
    var errorCodeNode =
      this.domNode.getElementsByClassName('sup-error-code')[0];

    // Attempt to get a user-friendly string for the error we got. If we can't
    // find a match, just show the "unknown" error string.
    var errorStr = mozL10n.get(
      SETUP_ERROR_L10N_ID_MAP.hasOwnProperty(errName) ?
        SETUP_ERROR_L10N_ID_MAP[errName] :
        SETUP_ERROR_L10N_ID_MAP.unknown,
      errDetails);
    errorMessageNode.textContent = errorStr;

    // Expose the error code to the UI.  Additionally, if there was a status,
    // expose that too.
    var errorCodeStr = errName;
    if (errDetails && errDetails.status)
      errorCodeStr += '(' + errDetails.status + ')';
    errorCodeNode.textContent = errorCodeStr;

    // Make sure we are scrolled to the top of the scroll region so that the
    // error message is visible.
    this.domNode.getElementsByClassName('scrollregion-below-header')[0]
      .scrollTop = 0;
  },

  die: function() {
  }
};
Cards.defineCardWithDefaultMode(
    'setup-account-info',
    { tray: false },
    SetupAccountInfoCard,
    templateNode
);

});