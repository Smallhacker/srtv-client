'use strict';
import Modal from "./modal";
import {isString, textNode} from "../utils";

export default class ConfirmModal extends Modal {
    /**
     * @param {Context} parentContext
     * @param {string} title
     * @param {string} text
     * @param {string} confirmText
     * @param {string|null} confirmStyle
     * @param {Function} callback
     */
    constructor(parentContext, title, text, confirmText, confirmStyle, callback) {
        super(parentContext);

        this._title = title;
        this._text = text;
        this._confirmText = confirmText;
        this._confirmStyle = confirmStyle || 'default';
        this._callback = callback;
    }

    _renderModal(body) {
        body.append(textNode(this._text));
        body.set('title', this._title);
        body.addButton("Cancel");
        body.addButton(this._confirmText, this._confirmStyle, () => {
            Promise.resolve(this._callback())
                .then(() => {
                    this.close();
                }, error => {
                    alert(isString(error) ? error : "An error occurred.");
                });
        }, false);
    }
}