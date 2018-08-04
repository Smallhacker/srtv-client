'use strict';
import FormModal from "./formModal";

const STATUSES = [
    { value: 'DONE', label: "Done"},
    { value: 'READY', label: "Ready/Racing"},
    { value: 'JOINED', label: "Joined"},
    { value: 'DNF', label: "DNF"},
    { value: 'DQ', label: "DQ"},
    { value: 'DROPPED', label: "Dropped"},
    { value: 'REMOVED', label: "Removed"}
];

export function getStatus(status) {
    let s = STATUSES.filter(s => s.value === status)[0];
    return (s && s.label) || status;
}

export default class EntryStatusModal extends FormModal {
    /**
     * @param {Context} parentContext
     * @param {Function} callback
     * @param {string|null} title
     * @param {string|null} submitText
     * @param {string|null} submitStyle
     * @param {string|null} fieldLabel
     */
    constructor(parentContext, callback, title = null, submitText = null, submitStyle = null, fieldLabel = null) {
        super(parentContext, title || "Runner Status", submitText || "Submit", submitStyle);

        /**
         * @type {jQuery}
         * @private
         */
        this._statusField = this.form.select(fieldLabel || "Status", STATUSES, null);

        this._entry = null;

        this._callback = callback;
    }

    _submit() {
        let value = this._statusField.val();
        return this._callback({entry: this._entry, status: value});
    }

    _opening({status, entry}) {
        this._entry = entry;
        this._statusField.val(status);
    }
}