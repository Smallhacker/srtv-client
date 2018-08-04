'use strict';
import FormModal from "./formModal";

export default class UserModal extends FormModal {
    /**
     * @param {Context} parentContext
     * @param {HydraApi} api
     * @param {Function} callback
     * @param {string|null} title
     * @param {string|null} submitText
     * @param {string|null} submitStyle
     * @param {string|null} fieldLabel
     */
    constructor(parentContext, api, callback, title = null, submitText = null, submitStyle = null, fieldLabel = null) {
        super(parentContext, title || "User", submitText || "Submit", submitStyle);

        /**
         * @type {HydraApi}
         * @private
         */
        this._api = api;

        /**
         * @type {jQuery}
         * @private
         */
        this._userField = this.form.username(api, fieldLabel || "User", null);

        this._callback = callback;
    }

    _submit() {
        let value = this._userField.val();
        return this._callback(value);
    }

    _opening(username) {
        this._userField.val(username);
    }
}