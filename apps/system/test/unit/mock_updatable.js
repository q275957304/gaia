'use strict';

function MockAppUpdatable(aApp) {
  this.app = aApp;

  this.mDownloadCalled = false;
  this.mCancelCalled = false;
  this.mUninitCalled = false;
  MockAppUpdatable.mCount++;
}

MockAppUpdatable.mTeardown = function() {
  MockAppUpdatable.mCount = 0;
};

MockAppUpdatable.mCount = 0;

MockAppUpdatable.prototype.uninit = function() {
  this.mUninitCalled = true;
};

MockAppUpdatable.prototype.download = function() {
  this.mDownloadCalled = true;
};

MockAppUpdatable.prototype.cancelDownload = function() {
  this.mCancelCalled = true;
};

function MockSystemUpdatable() {
  this.size = null;
  this.buildID = '19700101000000';
  this.detailsURL = 'about:blank';
  this.nameL10nId = 'systemUpdateWithVersion';
  this.nameL10nArgs = '1.0';

  this.mDownloadCalled = false;
  this.mCancelCalled = false;
  this.mUninitCalled = false;

  MockSystemUpdatable.mInstancesCount++;
}

MockSystemUpdatable.mInstancesCount = 0;
MockSystemUpdatable.mTeardown = function() {
  MockSystemUpdatable.mInstancesCount = 0;
  delete MockSystemUpdatable.mKnownUpdate;
};


MockSystemUpdatable.prototype.uninit = function() {
  this.mUninitCalled = true;
};

MockSystemUpdatable.prototype.download = function() {
  this.mDownloadCalled = true;
};

MockSystemUpdatable.prototype.cancelDownload = function() {
  this.mCancelCalled = true;
};

MockSystemUpdatable.prototype.rememberKnownUpdate = function() {
  this.mKnownUpdate = true;
};

MockSystemUpdatable.prototype.forgetKnownUpdate = function() {
  delete this.mKnownUpdate;
};

MockSystemUpdatable.prototype.checkKnownUpdate = function(callback) {
  if (this.mKnownUpdate && typeof callback === 'function') {
    callback();
  }
};

MockSystemUpdatable.prototype.declineInstallWait = function() {};
