'use strict';
import {Handlers} from "./utils";

export default class Context {
    /**
     * @param {Context|null} parentContext
     */
    constructor(parentContext = null) {
        /**
         * @type {Context|null}
         * @private
         */
        this._parent = parentContext;

        /**
         * @type {Context[]}
         * @private
         */
        this._children = [];

        /**
         * @type {boolean}
         * @private
         */
        this._destroyed = false;

        /**
         * @type {Handlers}
         * @private
         */
        this._handlers = new Handlers();

        if (parentContext) {
            parentContext._add(this);
        }

        if (window.HydraDebug) {
            window.HydraDebug.registerContext(this);
        }
    }

    get isDestroyed() {
        return this._destroyed;
    }

    _ensureNotDestroyed() {
        if (this._destroyed) {
            throw new Error("Context has already been destroyed.");
        }
    }

    /**
     * @param {Context} childContext
     * @private
     */
    _add(childContext) {
        this._ensureNotDestroyed();

        let index = this._children.indexOf(childContext);
        if (index === -1) {
            this._children.push(childContext);
        }
    }

    /**
     * @param {Context} childContext
     * @returns {Context}
     * @private
     */
    _remove(childContext) {
        let index = this._children.indexOf(childContext);
        if (index !== -1) {
            this._children.splice(index, 1);
        }

        return this;
    }

    /**
     * @param {Function} callback
     * @returns {Context}
     */
    onDestroy(callback) {
        this._ensureNotDestroyed();

        this._handlers.listen(callback);
        return this;
    }

    /**
     * @param {boolean} fromParent
     * @private
     */
    _destroy(fromParent) {
        if (this._destroyed) {
            return;
        }

        this._destroyed = true;

        if (this._parent && !fromParent) {
            this._parent._remove(this);
        }
        this._parent = null;

        this._handlers.invoke().clear();
        this._handlers = null;

        for (let child of this._children) {
            child._destroy(true);
        }
        this._children = null;
    }

    destroy() {
        this._destroy(false);
    }

    /**
     * @param {number} delay
     * @param {Function} callback
     * @returns {ContextTimeout}
     */
    timeout(delay, callback) {
        return new ContextTimeout(this, delay, callback);
    }

    /**
     * @param {number} delay
     * @param {Function} callback
     * @returns {ContextInterval}
     */
    interval(delay, callback) {
        return new ContextInterval(this, delay, callback);
    }

    /**
     * @returns {ContextHandlers}
     */
    handlers() {
        return new ContextHandlers(this);
    }
}

export class Contextual {
    /**
     * @param {Context|null} parentContext
     */
    constructor(parentContext = null) {
        /**
         * @type {Context}
         * @private
         */
        this._context = new Context(parentContext);

        if (window.HydraDebug) {
            window.HydraDebug.registerContextual(this);
        }
    }

    /**
     * @returns {Context}
     */
    get context() {
        return this._context;
    }
}

export class ContextTimeout extends Contextual {
    /**
     * @param {Context} parentContext
     * @param {number} delay
     * @param {Function} callback
     */
    constructor(parentContext, delay, callback) {
        super(parentContext);
        this.context.onDestroy(() => this.cancel());

        this._timeout = setTimeout(() => {
            this._timeout = null;
            this.context.destroy();
            callback();
        }, delay);
    }

    cancel() {
        if (this._timeout) {
            clearTimeout(this._timeout);
            this._timeout = null;
            this.context.destroy();
        }
    }
}

export class ContextInterval extends Contextual {
    /**
     * @param {Context} parentContext
     * @param {number} delay
     * @param {Function} callback
     */
    constructor(parentContext, delay, callback) {
        super(parentContext);
        this.context.onDestroy(() => this.cancel());

        this._interval = setInterval(callback, delay);
    }

    cancel() {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
            this.context.destroy();
        }
    }
}

export class ContextHandlers extends Contextual {
    /**
     * @param {Context} parentContext
     */
    constructor(parentContext = null) {
        super(parentContext);

        /**
         * @type {Handlers}
         * @private
         */
        this._handlers = new Handlers();

        this.context.onDestroy(() => this._handlers.clear())
    }

    /**
     * @param {Function} callback
     * @returns {ContextHandlers}
     */
    listen(callback) {
        if (!this.context.isDestroyed) {
            this._handlers.listen(callback);
        }
        return this;
    }

    /**
     * @returns {Promise}
     */
    promise() {
        return this._handlers.promise();
    }

    /**
     * @returns {ContextHandlers}
     */
    clear() {
        this._handlers.clear();
        return this;
    }

    /**
     * @param {*} value
     * @returns {ContextHandlers}
     */
    invoke(value = null) {
        this._handlers.invoke(value);
        return this;
    }

    /**
     * @param {*} value
     */
    invokeAndDestroy(value = null) {
        this.invoke(value);
        this.context.destroy();
    }
}
