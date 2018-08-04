'use strict';
import {Renderable} from "../rendering";
import Rendering from "../rendering";
import {appendIcon, uniqueId} from "../utils";

export default class Modal extends Renderable {
    /**
     * @param {Context|null} parentContext
     */
    constructor(parentContext = null) {
        super(parentContext);
        this._id = uniqueId();
    }

    /**
     * @returns {Rendering}
     */
    render() {
        let modal = $('<div>', {
            class: 'modal fade',
            id: this._id,
            tabindex: '-1',
            role: 'dialog'
        });

        let modalDialog = $('<div>', {
            class: 'modal-dialog',
            role: 'document'
        }).appendTo(modal);

        let modalContent = $('<div>', {
            class: 'modal-content'
        }).appendTo(modalDialog);

        let modalBody = $('<div>', {
            class: 'modal-body'
        });

        let body = new ModalRendering(this.context, modalBody);
        this._renderModal(body);
        body.appendTo(modalContent);

        let title = body.get('title');
        if (title) {
            let modalHeader = $('<div>', {
                class: 'modal-header'
            }).prependTo(modalContent);


            if (body.get('closeButton', true)) {
                let button = $('<button>', {
                    type: 'button',
                    class: 'close',
                    'data-dismiss': 'modal',
                    'aria-label': "Close"
                });

                $('<span>', {
                    'aria-hidden': 'true',
                    text: "\u00D7"
                }).appendTo(button);

                button.appendTo(modalHeader);
            }

            if (title) {
                let titleId = uniqueId();

                $('<h4>', {
                    class: 'modal-title',
                    id: titleId,
                    text: title
                }).appendTo(modalHeader);

                modal.attr('aria-labelledby', titleId);
            }
        }

        let buttons = body.get('buttons', []);
        if (buttons.length) {
            let modalFooter = $('<div>', {
                class: 'modal-footer'
            }).appendTo(modalContent);

            for (let button of buttons) {
                modalFooter.append(button);
            }
        }

        modal.modal({show: false});

        return new Rendering(this.context, modal);
    }

    /**
     * @param {Page} page
     * @returns {Modal}
     */
    renderModalInPage(page) {
        this.renderInPage(page, $(document.body));
        return this;
    }

    /**
     * @param {*|null} params
     * @private
     */
    _opening(params) {
        // Can be overridden
    }

    /**
     * @param {ModalRendering} rendering
     * @private
     */
    _renderModal(rendering) {
        throw new Error("Not implemented");
    }

    /**
     * @param {string|null} icon
     * @param {string|null} label
     * @param {string} style
     * @param {*|null} params
     * @returns {jQuery}
     */
    openButton(icon, label, style = 'default', params = null) {
        let button = $('<button>', {
            type: 'button',
            class: 'btn btn-' + style
        }).click(() => {
            this.open(params);
        });

        appendIcon(button, icon, label);

        return button;
    }

    /**
     * @returns {jQuery}
     * @private
     */
    get _modalNode() {
        return $('#' + this._id);
    }

    /**
     * @param {*|null} params
     * @returns {Modal}
     */
    open(params = null) {
        this._opening(params);
        this._modalNode.modal('show');
        return this;
    }

    /**
     * @returns {Modal}
     */
    close() {
        this._modalNode.modal('hide');
        return this;
    }
}

class ModalRendering extends Rendering {
    /**
     * @param {Context} parentContext
     * @param {jQuery} node
     */
    constructor(parentContext, node) {
        super(parentContext, node);
    }

    /**
     * @param {string} label
     * @param {string|null} style
     * @param {Function|null} onClick
     * @param {boolean} dismiss
     * @returns {ModalRendering}
     */
    addButton(label, style = null, onClick = null, dismiss = true) {
        let button = $('<button>', {
            type: 'button',
            class: 'btn btn-' + (style || 'default'),
            text: label
        });

        if (dismiss) {
            button.attr('data-dismiss', 'modal');
        }

        if (onClick) {
            button.click(onClick);
        }

        this.push('buttons', button);
        return this;
    }

    /**
     * @param {Form} form
     * @param {string} label
     * @param {string|null} style
     * @param {boolean} dismiss
     */
    submitButton(form, label, style = null, dismiss = true) {
        return this.addButton(label, style, () => {
            form.node.submit();
        }, dismiss);
    }
}