'use strict';
import {Widget} from "./widget";
import Context from "../context";
import {formatDuration} from "../utils";
import Rendering from "../rendering";

const BLANK = "--:--:--";

export class TimerWidget extends Widget {
    /**
     * @param {System} system
     * @param {Context} parentContext
     */
    constructor(system, parentContext) {
        super(system, parentContext);

        this._offset = 0;
        this._span = $('<span>');
        this._interval = null;
        this._lastDuration = null;
        this.hideTime();
    }

    /**
     * @param {number} offset
     * @returns {TimerWidget}
     */
    withOffset(offset) {
        if ($.type(offset) !== 'number') {
            offset = 0;
        }

        this._offset = offset;
        return this;
    }

    _stopInterval() {
        if (this._interval) {
            this._interval.cancel();
            this._interval = null;
        }
    }

    _show(text) {
        this._span.empty().text(text);
    }

    _showDuration(duration) {
        if (duration < 0) {
            this._show(BLANK);
        } else {
            let adjustedDuration = duration + this._offset;
            this._show(formatDuration(adjustedDuration));
        }
    }

    hideTime() {
        this._stopInterval();
        this._show(BLANK);
    }

    /**
     * @param {number} duration
     */
    setAbsoluteTime(duration) {
        this._stopInterval();
        this._showDuration(duration);
    }

    /**
     * @param {Stamp} startTime
     * @param {Stamp} endTime
     */
    setRelativeTime(startTime, endTime) {
        this._stopInterval();
        this._showDuration(endTime - startTime);
    }

    /**
     * @param {ClientStamp|null} startTime
     */
    tickTime(startTime = null) {
        this._stopInterval();

        if (startTime === null) {
            startTime = this.api.getClientTime();
        }

        this._lastDuration = null;
        this._interval = this.context.interval(200, () => this._tick(startTime));
        this._tick(startTime);
    }

    _tick(startTime) {
        let now = this.api.getClientTime();
        let duration = now - startTime;
        if (this._lastDuration === null || duration !== this._lastDuration) {
            this._lastDuration = duration;
            this._showDuration(duration);
        }
    }

    render() {
        return new Rendering(this.context, this._span);
    }
}