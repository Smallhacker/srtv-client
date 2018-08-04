'use strict';
import HydraApi from "./api/api";
import {Handlers} from "./utils";
import Context, {Contextual} from "./context";

const pages = {};

export default class Page extends Contextual {
    constructor(system, args) {
        super(null);
        if (system !== false) {
            this.system = system;
            /**
             * @type {HydraApi}
             */
            this.api = system.api;
            this._args = args || {};
            this._postRender = new Handlers();

            this._init();
        }
    }

    arg(key) {
        if (this._args.hasOwnProperty(key)) {
            return this._args[key];
        }
        return null;
    }

    /**
     * @return {jQuery|Promise<jQuery>|{}|Promise<{}>}
     */
    render(meta = null) {
        throw new Error("Not implemented");
    }

    reload(meta = null) {
        this.system.renderPage(this, meta);
    }

    postRender() {
        if (this._postRender !== null) {
            this._postRender.invoke();
            this._postRender.clear();
            this._postRender = null;
        }
    }

    onPostRender(callback) {
        if (this._postRender === null) {
            callback();
        } else {
            this._postRender.listen(callback);
        }
    }

    /**
     * @returns {string|null}
     */
    get title() {
        return null;
    }

    _init() {
        // Can be overridden
    }

    /**
     * @param {string} page
     * @param {...string} args
     * @returns {{redirect: boolean, page: string, args: string[]}}
     */
    static redirection(page = '', ...args) {
        return {
            redirect: true, page, args
        }
    }

    static create(system, id, args) {
        let page = Page.resolve(id, args);
        if (page) {
            return new page.pageClass(system, page.pageArgs);
        }
        return null;
    }

    static register(pageClass) {
        let instance = new pageClass(false);

        if (instance.urlPattern) {
            for (let pattern of instance.urlPattern) {
                let signature = Page._toSignature(pattern, pageClass);
                pages[signature.id] = pages[signature.id] || [];
                pages[signature.id].push(signature);
            }
        }

        return pageClass;
    }

    static resolvePath(path) {
        if (path.charAt(0) === '/') {
            path = path.substr(1);
        }

        if (path.charAt(path.length - 1) === '/') {
            path = path.substr(0, path.length - 1);
        }

        let id = '';
        let args = [];
        if (path) {
            args = path.split('/');
            id = args.shift();
        }

        return Page.resolve(id, args);
    }

    static resolve(id, args) {
        id = id + ':' + args.length;

        /**
         * @type {PageSignature[]}
         */
        let possibilities = (pages[id] || []);
        possibilities = possibilities
            .sort((a, b) => a.complexity - b.complexity)
            .map(signature => {
                    let pageArgs = {};
                    for (let i = 0; i < args.length; i++) {
                        let arg = args[i];
                        let type = signature.argTypes[i];
                        let name = signature.argNames[i];
                        let value = null;

                        if (type) {
                            switch (type) {
                                case 'guid':
                                    value = HydraApi.parseGuid(arg);
                                    break;
                                case 'slug':
                                    value = HydraApi.parseSlug(arg);
                                    break;
                                case 'text':
                                    value = arg;
                                    break;
                            }
                            if (value === null) {
                                return null;
                            }
                            pageArgs[name] = value;
                        } else {
                            if (arg !== name) {
                                return null;
                            }
                        }
                    }
                    return {
                        pageClass: signature.pageClass,
                        pageArgs
                    };
                }
            )
            .filter(x => x !== null);

        if (possibilities.length) {
            return possibilities[0];
        }

        return null;
    }

    /**
     * @typedef {{}} PageSignature
     * @property {string} id
     * @property {(string|null)[]} argTypes
     * @property {string[]} argNames
     * @property {*} pageClass
     * @property {number} complexity
     */

    /**
     * @param {string} path
     * @param {*} pageClass
     * @returns {PageSignature}
     * @private
     */
    static _toSignature(path, pageClass) {
        if (path.charAt(0) === '/') {
            path = path.substr(1);
        }

        if (path.charAt(path.length - 1) === '/') {
            path = path.substr(0, path.length - 1);
        }

        if (!path) {
            return {
                id: ':0',
                argTypes: [],
                argNames: [],
                pageClass,
                complexity: 0
            };
        }

        let parts = path.split('/');
        let firstPart = parts.shift();
        let id = firstPart + ':' + parts.length;

        let argTypes = [];
        let argNames = [];
        let complexity = 0;

        for (let part of parts) {
            if (part.indexOf(':') === -1) {
                argTypes.push(null);
                argNames.push(part);
            } else {
                let typeAndArg = part.split(':');
                argTypes.push(typeAndArg[0]);
                argNames.push(typeAndArg[1]);
                complexity++;
            }
        }

        return {
            id, argTypes, argNames, pageClass, complexity
        };

    }
}