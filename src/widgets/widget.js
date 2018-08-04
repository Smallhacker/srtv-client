'use strict';
import {panel} from "../bootstrap";
import Rendering, {Renderable} from "../rendering";

export class Widget extends Renderable {
    /**
     * @param {System} system
     * @param {Context} parentContext
     */
    constructor(system, parentContext) {
        super(parentContext);

        /**
         * @type {System}
         */
        this.system = system;
        /**
         * @type {HydraApi}
         */
        this.api = system.api;
    }
}

export class PanelWidget extends Widget {
    /**
     * @param {System} system
     * @param {Context} parentContext
     * @param {string|null} title
     */
    constructor(system, parentContext, title = null) {
        super(system, parentContext);

        /**
         * @type {string|null}
         * @private
         */
        this._title = title;

        /**
         * @type {string|null}
         * @private
         */
        this._type = null;
    }

    /**
     * @param {string} title
     * @returns {PanelWidget}
     */
    setTitle(title) {
        this._title = title;
        return this;
    }

    /**
     * @param {string} type
     * @returns {PanelWidget}
     */
    setType(type) {
        this._type = type;
        return this;
    }

    /**
     * @returns {Rendering}
     */
    render() {
        let p = panel(this._type || 'default');

        if (this._title) {
            p.title(this._title);
        }

        let rendering = new Rendering(this.context, p);

        this._panel(p, rendering);
        rendering['panel'] = p;

        return rendering;
    }

    /**
     * @param panel
     * @param {Rendering} rendering
     * @private
     */
    _panel(panel, rendering) {
        throw new Error("Not implemented.");
    }
}