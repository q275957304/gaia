'use strict';
define(function(require) {

var date = require('date'),
    dataEvent = require('../mixins/data-event'),
    dataPassProp = require('../mixins/data-pass-prop'),
    dataProp = require('../mixins/data-prop'),
    defaultVScrollData = require('./default_vscroll_data'),
    ListCursor = require('list_cursor'),
    mozL10n = require('l10n!'),
    messageDisplay = require('message_display'),
    MessageListTopBar = require('message_list_topbar'),
    updatePeepDom = require('./peep_dom').update;

// Custom elements used in the template.
require('element!data_slot');
require('element!./search_link');
require('element!./msg_vscroll');

return [
  require('../base_render')(['folder'], function(html) {
    var folder = this.state.folder;
    if (!folder || this.curFolder === folder) {
      return;
    }

    switch (folder.type) {
      case 'drafts':
      case 'localdrafts':
      case 'outbox':
      case 'sent':
        this.isIncomingFolder = false;
        break;
      default:
        this.isIncomingFolder = true;
        break;
    }

    html`
    <!-- exists so we can force a minimum height -->
    <div class="msg-list-scrollinner">
      <data-slot data-slot-id="headerElement"></data-slot>
      <lst-msg-vscroll data-prop="msgVScroll"
                       data-event="messageClick,messagesChange"
                       aria-label="${folder.name}"
                       data-empty-l10n-id="messages-folder-empty">
      </lst-msg-vscroll>
    </div>

    <!-- New email notification bar -->
    <div class="message-list-topbar"></div>
    `;
  }),

  require('./msg_click'),

  {
    createdCallback: function() {
      // Workaround to multiple notifications on the same folder for minor
      // changes (sync status pending active switching mostly).
      this.curFolder = null;

      // This is set by the custom element that owns this element.
      this.editController = null;
    },

    renderEnd: function() {
      var folder = this.state.folder;

      if (!folder || this.curFolder === folder) {
        return;
      }

      // Set the curFolder in renderEnd instead of render.
      this.curFolder = folder;

      // Wires up the data-prop properties.
      dataPassProp.templateInsertedCallback.call(this);
      dataProp.templateInsertedCallback.call(this);
      dataEvent.templateInsertedCallback.call(this);

      // If the headerElement cares about the scroll area, then also tell it
      // the scrollContainer to use.
      var headerElement = this.slots.headerElement;
      if (headerElement.scrollAreaInitialized) {
        headerElement.scrollContainer = this;
      }

      this.onceDomEvent(this.msgVScroll, 'messagesSeekEnd',
                        this.scrollAreaInitialized.bind(this));

      var vScrollBindData = (model, node) => {
        model.element = node;
        node.message = model;
        this.updateMessageDom(model);
      };

      this.msgVScroll.init(this,
                           vScrollBindData,
                           defaultVScrollData);

      this.msgVScroll._needVScrollData = true;

      var listCursor = this.listCursor = new ListCursor();
      this.listCursor.bindToList(this.model.api
                                  .viewFolderConversations(folder));
      this.msgVScroll.setListCursor(listCursor, this.model);

      // For search we want to make sure that we capture the screen size prior
      // to focusing the input since the FxOS keyboard will resize our window to
      // be smaller which messes up our logic a bit.  We trigger metric
      // gathering in non-search cases too for consistency.
      this.msgVScroll.vScroll.captureScreenMetrics();

      // Once the real render is called, this element is already in the DOM,
      // so can do the DOM calculations.
      this.setHeaderElementHeight();
      this.msgVScroll.vScroll.nowVisible();

      // Create topbar. Do this **after** calling init on msgVScroll.
      this.topBar = new MessageListTopBar(
        this.querySelector('.message-list-topbar')
      );
      this.topBar.bindToElements(this,
                                  this.msgVScroll.vScroll);
      // Also tell the MessageListTopBar about vScroll offset.
      this.topBar.visibleOffset = this.msgVScroll.vScroll.visibleOffset;
    },

    setHeaderElementHeight: function() {
      // Get the height of the top element and tell vScroll about it.
      this.msgVScroll.vScroll.visibleOffset =
                              this.slots.headerElement.offsetHeight;
    },

    scrollAreaInitialized: function() {
      if (this.slots.headerElement.scrollAreaInitialized) {
        this.slots.headerElement.scrollAreaInitialized();
      }
    },

    // Reset checked mode for all message items. Called by the owner of this
    // element.
    resetEditSelection: function() {
      var msgNodes = this.msgVScroll.querySelectorAll('.msg-message-item');
      for (var i = 0; i < msgNodes.length; i++) {
        this.editController.updateDomMessageChecked(msgNodes[i], false);
      }
    },

    // Override of msg_click's isEditModeClick, since
    // editController has the functionality here.
    isEditModeClick: function(messageNode) {
      if (this.editController.editMode) {
        this.editController.toggleSelection(messageNode);
        return true;
      }
      return false;
    },

    messagesChange: function(event) {
      var { message } = event;
      this.updateMessageDom(message);
    },

    /**
     * Update the state of the given DOM node.  Note that DOM nodes are reused
     * so you must ensure that this method cleans up any dirty state resulting
     * from any possible prior operation of this method.
     */
    updateMessageDom: function(message) {
      var msgNode = message.element;

      if (!msgNode) {
        return;
      }

      // If the placeholder data, indicate that in case VScroll
      // wants to go back and fix later.
      var classAction = message.isPlaceholderData ? 'add' : 'remove';
      var defaultDataClass = this.msgVScroll.vScroll.itemDefaultDataClass;
      msgNode.classList[classAction](defaultDataClass);

      // ID is stored as a data- attribute so that it can survive
      // serialization to HTML for storing in the HTML cache, and
      // be usable before the actual data from the backend has
      // loaded, as clicks to the message list are allowed before
      // the back end is available. For this reason, click
      // handlers should use dataset.id when wanting the ID.
      msgNode.dataset.id = message.id;

      // some things only need to be done once
      var dateNode = msgNode.querySelector('.msg-message-date');
      var subjectNode = msgNode.querySelector('.msg-message-subject');
      var snippetNode = msgNode.querySelector('.msg-message-snippet');

      var listPerson;
      if (this.isIncomingFolder || this.is) {
        listPerson = message.authors[0];
      // XXX This is not to UX spec, but this is a stop-gap and that would
      // require adding strings which we cannot justify as a slipstream fix.
      } else if (message.to && message.to.length) {
        listPerson = message.to[0];
      } else if (message.cc && message.cc.length) {
        listPerson = message.cc[0];
      } else if (message.bcc && message.bcc.length) {
        listPerson = message.bcc[0];
      } else {
//todo: changed this for drafts, but is it ideal if isDraft is on the message?
        listPerson = message.authors[0];
      }

      var detailsNode = msgNode.querySelector('.msg-message-details-section');
      detailsNode.classList.toggle('draft', message.hasDrafts);

      // author
      listPerson.element =
        msgNode.querySelector('.msg-message-author');
      listPerson.onchange = updatePeepDom;
      listPerson.onchange(listPerson);

      // count, if more than one.
      var countNode = msgNode.querySelector('.msg-message-count'),
          accountCountContainer = msgNode
                                  .querySelector('.msg-message-author-count');
      if (message.messageCount > 1) {
        accountCountContainer.classList.add('multiple-count');
      } else {
        accountCountContainer.classList.remove('multiple-count');
      }
      mozL10n.setAttributes(countNode, 'message-header-conv-count', {
        n: message.messageCount
      });

      // date
      var dateTime = dateNode.dataset.time =
                     message.mostRecentMessageDate.valueOf();
      date.relativeDateElement(dateNode, dateTime);

      // subject
      messageDisplay.subject(msgNode.querySelector('.msg-message-subject'),
                            message);

      // attachments (can't change within a message but can change between
      // messages, and since we reuse DOM nodes...)
      var attachmentsNode = msgNode.querySelector('.msg-message-attachments');
      attachmentsNode.classList.toggle('msg-message-attachments-yes',
                                       message.hasAttachments);
      // snippet needs to be shorter if icon is shown
      snippetNode.classList.toggle('icon-short', message.hasAttachments);

//todo: want first one or first unread one? Can tidbits be read messages?
      // snippet
      var tidbit = message.messageTidbits[0];
      snippetNode.textContent = (tidbit && tidbit.snippet) || ' ';

      // update styles throughout the node for read vs unread
      msgNode.classList.toggle('unread', message.hasUnread);

      // star
      var starNode = msgNode.querySelector('.msg-message-star');

      starNode.classList.toggle('msg-message-star-starred', message.hasStarred);
      // subject needs to give space for star if it is visible
      subjectNode.classList.toggle('icon-short', message.hasStarred);

      // sync status
      var syncNode =
            msgNode.querySelector('.msg-message-syncing-section');

      // sendState is only intended for outbox messages, so not all
      // messages will have sendProblems defined.
      var sendState = message.sendProblems && message.sendProblems.state;

      syncNode.classList.toggle('msg-message-syncing-section-syncing',
                                sendState === 'sending');
      syncNode.classList.toggle('msg-message-syncing-section-error',
                                sendState === 'error');

      // Set the accessible label for the syncNode.
      if (sendState) {
        mozL10n.setAttributes(syncNode, 'message-message-state-' + sendState);
      } else {
        syncNode.removeAttribute('data-l10n-id');
      }

      // edit mode select state, defined in lst/edit_controller
      this.editController.updateDomSelectState(msgNode, message);
    }


  }
];

});
