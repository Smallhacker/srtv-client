'use strict';
import FormModal from "./formModal";

export default class SelectModal extends FormModal {
    /**
     * @param {Context} parentContext
     * @param {HydraApi} api
     * @param {{value: string, label: string}[]} values
     * @param {Function} callback
     * @param {string|null} title
     * @param {string|null} submitText
     * @param {string|null} submitStyle
     * @param {string|null} fieldLabel
     */
    constructor(parentContext, api, values, callback, title = null, submitText = null, submitStyle = null, fieldLabel = null) {
        super(parentContext, title || "Change Value", submitText || "Submit", submitStyle);

        /**
         * @type {HydraApi}
         * @private
         */
        this._api = api;

        /**
         * @type {jQuery}
         * @private
         */
        this._selectField = this.form.select(fieldLabel || "Value", values);

        this._callback = callback;
    }

    _submit() {
        let value = this._selectField.val();
        return this._callback(value);
    }

    _opening(value) {
        this._selectField.val(value || null);
    }
}