'use strict';
import {Contextual} from "./context";

export default class Rendering extends Contextual {
    /**
     * @param {Context} parentContext
     * @param {jQuery|string} node
     */
    constructor(parentContext, node = 'div') {
        super(parentContext);

        if (!node instanceof jQuery) {
            node = $('<' + node + '>');
        }

        /**
         * @type {{}}
         * @private
         */
        this._meta = {};

        /**
         * @type {jQuery}
         * @private
         */
        this._node = node;

        /**
         * @type {ContextHandlers}
         * @private
         */
        this._postRender = this.context.handlers();

        this.context.onDestroy(() => {
            this._node.remove();
        })
    }

    /**
     * @returns {jQuery}
     */
    get node() {
        return this._node;
    }

    /**
     * @param {Page} page
     * @returns {jQuery}
     */
    nodeInPage(page) {
        // TODO: This method should be deprecated once Page becomes a subclass of Renderable
        page.onPostRender(() => this.postRender());
        return this.node;
    }

    /**
     * @returns {Rendering}
     */
    postRender() {
        if (this._postRender) {
            this._postRender.invokeAndDestroy();
            this._postRender = null;
        }
        return this;
    }

    /**
     * @param {Function} callback
     * @returns {Rendering}
     */
    onPostRender(callback) {
        if (this._postRender) {
            this._postRender.listen(callback);
        } else {
            callback();
        }
        return this;
    }

    /**
     * @param {jQuery|Element|Rendering|(jQuery|Element|Rendering)[]} nodes
     * @returns {Rendering}
     */
    append(...nodes) {
        for (let node of nodes) {
            let actualNode = node;
            if (node instanceof Rendering) {
                actualNode = node._node;
                this.onPostRender(() => node.postRender());
            }
            this._node.append(actualNode);
        }
        return this;
    }

    /**
     * @param {jQuery|Rendering} node
     * @returns {Rendering}
     */
    appendTo(node) {
        node.append(this._node);
        return this;
    }

    /**
     * @param {string} key
     * @param {T|null} defaultValue
     * @returns {T|null}
     * @template {T}
     */
    get(key, defaultValue = null) {
        if (!this._meta.hasOwnProperty(key)) {
            return defaultValue;
        }
        return this._meta[key];
    }

    /**
     * @param {string} key
     * @param {*} value
     * @returns {Rendering}
     */
    set(key, value) {
        this._meta[key] = value;
        return this;
    }

    /**
     * @param {string} key
     * @param {*} value
     * @returns {Rendering}
     */
    push(key, value) {
        let array = this._meta[key];
        if (!array || !Array.isArray(array)) {
            array = [];
            this._meta[key] = array;
        }
        array.push(value);
        return this;
    }


    /**
     * @param {string} tag
     * @returns {Rendering}
     */
    static ofTag(tag = 'div') {
        return new Rendering($('<' + tag + '>'));
    }

    /**
     * @param {jQuery} node
     * @returns {Rendering}
     */
    static ofNode(node) {
        return new Rendering(node);
    }
}

export class Renderable extends Contextual {
    /**
     * @param {Context|null} parentContext
     */
    constructor(parentContext = null) {
        super(parentContext);
    }

    /**
     * @returns {Rendering}
     */
    render() {
        throw new Error("Not implemented");
    }

    /**
     * @param {Page} page
     * @param {jQuery} container
     * @returns {Renderable}
     */
    renderInPage(page, container) {
        // TODO: This method should be deprecated once Page becomes a subclass of Renderable
        let node = this.render().nodeInPage(page);
        container.append(node);
        return this;
    }
}