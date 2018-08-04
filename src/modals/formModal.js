'use strict';
import Modal from "./modal";
import {Form} from "../bootstrap";
import {isString} from "../utils";

export default class FormModal extends Modal {
    /**
     * @param {Context} parentContext
     * @param {string} title
     * @param {string} submitText
     * @param {string|null} submitStyle
     * @param {number} inputColWidth
     */
    constructor(parentContext, title, submitText, submitStyle = null, inputColWidth = 8) {
        super(parentContext);

        /**
         * @type {Form}
         * @private
         */
        this._form = new Form(inputColWidth);
        this._form.onSubmit(() => this.submit());

        this._title = title;
        this._submitText = submitText;
        this._submitStyle = submitStyle || 'default';
    }

    /**
     * @returns {Form}
     */
    get form() {
        return this._form;
    }

    submit() {
        this._submit()
            .then(() => {
                this.close();
            }, error => {
                alert(isString(error) ? error : "An error occurred.");
            });
    }

    /**
     * @returns {Promise}
     * @private
     */
    _submit() {
        throw new Error("Not implemented");
    }

    _renderModal(body) {
        body.append(this._form.node);

        body.set('title', this._title);
        body.addButton("Cancel");
        body.submitButton(this._form, this._submitText, this._submitStyle, false);
    }
}