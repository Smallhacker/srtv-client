import {Spinner} from "./libs/spin.js";
import {Contextual} from "./context";

const opts = {
    lines: 6,
    length: 0,
    width: 15,
    radius: 16,
    scale: 1.25,
    corners: 1,
    color: '#fff',
    opacity: 0,
    rotate: 0,
    direction: 1,
    speed: 1.4,
    trail: 100,
    fps: 20,
    zIndex: 2e9,
    className: 'spinner',
    top: '50%',
    left: '50%',
    shadow: true,
    position: 'absolute'
};

export default class Loader extends Contextual {
    /**
     * @param {Context} parentContext
     */
    constructor(parentContext) {
        super(parentContext);

        this._started = false;
        this._spinner = new Spinner(opts);
        this.context.onDestroy(() => {
            if (this._started && this._spinner !== null) {
                this._spinner.stop();
                this._spinner = null;
            }
        });

    }

    /**
     * @param {jQuery|Element} target
     * @returns {Loader}
     */
    appendTo(target) {
        if (!this._started && this._spinner !== null) {
            target = $(target)[0];
            this._spinner.spin(target);
            this._started = true;
        }
        return this;
    }

    /**
     * @returns {Loader}
     */
    stop() {
        this.context.destroy();
        return this;
    }
}