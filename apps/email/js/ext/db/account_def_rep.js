define(function (require) {
  'use strict';

  const { NOW } = require('../date');

  /**
   * Create an account definition out of its source pieces.  For historical
   * reasons right now, an account definition is a mixed-in soup of several sets
   * of data:
   * - Fields required by the AccountManager to work at all.
   *   - id
   *   - type
   *   - engine
   * - Common account fundamentals that can be used without understanding the
   *   account type.
   *   - name
   *   - defaultPriority: A timestamp allowing us to reorder the account to be the
   *     default account by setting the value to be the current timestamp.
   *   - identities
   * - Standardized fields we enforce existing across all accounts but where the
   *   data inside can and will vary.
   *   - engineData
   *   - credentials
   * - Cross-account settings (exposed in UI)
   *   - syncInterval
   *   - notifyOnNew
   *   - playSoundOnSend
   * - Per-account settings (exposed conditionally in UI)
   *   - syncRange (Activesync-only)
   * - Per-account connection detail settings that potentially differ:
   *   - activesync: connInfo
   *   - composite:
   *     - receiveConnInfo
   *     - sendConnInfo
   *     - receiveType
   *     - sendType
   *
   * For populating the structure, we break this out into a number of separate
   * dictionaries based on data source and how the variables can change.
   *
   * @param args.infra
   *   Explicit dictionary provided by the general account creation logic (versus
   *   specific per-account logic.)
   * @param args.infra.id
   * @param args.infra.name
   * @param args.credentials
   *   Username/password/oauth2 stuff dictionary that ends up on the `credentials`
   *   property.  Provided by the account-specific logic.  This object will be
   *   mutated if the password(s) need to be updated or for oauth churn reasons.
   *   Compare with the connection info fields which we generally require to be
   *   constant.
   * @param args.prefFields
   *   A dictionary of preference fields to be mixed-in.
   * @param args.typeFields
   *   These are fields derived statically from the account type that could not
   *   conceivably change without requiring the account to be re-created from
   *   scratch.  Contrast with engineFields which can only be determined by
   *   account validation and probing.  This covers receiveType and sendType.
   * @param args.engineFields
   *   A dict that looks like { engine, engineData }, generated by the validation
   *   (AKA probing) step.
   * @param args.connInfoFields
   *   A dictionary of connection-info fields to be mixed-in.  These include
   *   connection details that could theoretically change without altering the
   *   fundamental nature of the account.  For example, domain hostnames, port
   *   numbers, etc.
   */
  function makeAccountDef({ infra, credentials, prefFields, typeFields,
    engineFields, connInfoFields, identities }) {
    var def = {
      id: infra.id,
      name: infra.name,
      defaultPriority: NOW(),

      type: infra.type,
      engine: engineFields.engine,
      engineData: engineFields.engineData,
      // receiveType/sendType come from typeFields (if relevant)

      credentials,
      // connInfo/receiveConnInfo/sendConnInfo come from connInfoFields

      identities
    };

    for (var key of Object.keys(prefFields)) {
      def[key] = prefFields[key];
    }

    for (var key of Object.keys(typeFields)) {
      def[key] = typeFields[key];
    }

    for (var key of Object.keys(connInfoFields)) {
      def[key] = connInfoFields[key];
    }

    return def;
  }

  function makeIdentity(raw) {
    return {
      id: raw.id,
      name: raw.name,
      address: raw.address,
      replyTo: raw.replyTo,
      signature: raw.signature,
      signatureEnabled: raw.signatureEnabled
    };
  }

  return {
    makeAccountDef,
    makeIdentity
  };
});