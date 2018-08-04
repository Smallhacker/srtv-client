'use strict';
import {hint} from "./bootstrap";

export default class FlagType {
    /**
     * @param {string|null} id
     * @param {string} name
     * @param {string} description
     * @param {boolean} internal
     */
    constructor(id, name, description, internal = false) {
        /**
         * @type {string|null}
         */
        this.id = id;

        /**
         * @type {string}
         */
        this.name = name;

        /**
         * @type {string}
         */
        this.description = description;

        /**
         * @type {boolean}
         */
        this.internal = internal;
    }

    /**
     * @returns {{value: string, label: string}}
     */
    toSelectValue() {
        return {value: this.id, label: this.description};
    }

    /**
     * @returns {jQuery}
     */
    toHintNode() {
        return hint(this.name, this.description);
    }

    /**
     * @returns {FlagType[]}
     */
    static get all() {
        return ALL.slice();
    }

    /**
     * @returns {FlagType[]}
     */
    static get external() {
        return ALL.filter(f => !f.internal);
    }

    /**
     * @returns {FlagType[]}
     */
    static get internal() {
        return ALL.filter(f => f.internal);
    }

    /**
     * @param {string} id
     * @returns {FlagType}
     */
    static parseFlagType(id) {
        return ALL.filter(f => f.id === id)[0] || UNKNOWN;
    }
}

export const OTHER_MISC = new FlagType('OTHER_MISC', "Other", "Other reason (please specify)");
export const EMULATOR_FEATURES = new FlagType('EMULATOR_FEATURES', "Emulator Features", "Use of emulator features (savestates, rewinds, fast forward, etc.)");
export const DISALLOWED_CONSOLE = new FlagType('DISALLOWED_CONSOLE', "Disallowed Platform", "Use of a disallowed console or emulator");
export const DISALLOWED_PERIPHERAL = new FlagType('DISALLOWED_PERIPHERAL', "Disallowed peripheral", "Use of disallowed peripherals (turbo buttons, cheating devices, etc.)");
export const DISALLOWED_TOOL = new FlagType('DISALLOWED_TOOL', "Disallowed Tool", "Use of disallowed tools (RAM viewers, ROM analyzers, etc.)");
export const COLLABORATION = new FlagType('COLLABORATION', "Collaboration", "Disallowed collaboration with other people");
export const CATEGORY_VIOLATION = new FlagType('CATEGORY_VIOLATION', "Category Violation", "Violation of category rules");
export const STREAM_THRESHOLD = new FlagType('STREAM_THRESHOLD', "Stream Threshold", "Not enough of the run was streamed to Twitch", true);
export const CANT_RECORD = new FlagType('CANT_RECORD', "Can't Record", "Unable to record race", true);
export const UNKNOWN = new FlagType(null, "(Unknown)", "Flag is not recognized by client.", true);

/**
 * @type {FlagType[]}
 */
const ALL = [OTHER_MISC, EMULATOR_FEATURES, DISALLOWED_CONSOLE, DISALLOWED_PERIPHERAL, DISALLOWED_TOOL, COLLABORATION, CATEGORY_VIOLATION, STREAM_THRESHOLD, CANT_RECORD];
