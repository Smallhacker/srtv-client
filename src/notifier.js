import {Persistent} from "./utils";
import {blinkOverlay} from "./blinker";

const SETTINGS = Persistent.object('srtv/user/notifications');
const SOUND_ROOT = '/_resources/sfx/';
const ENABLED_BY_DEFAULT = true;

/**
 * @type {NotifierEffect[]}
 */
const EFFECTS = [];
/**
 * @type {NotifierEvent[]}
 */
const EVENTS = [];

function toKey(event, effect) {
    return event.id + '/' + effect.id;
}

export class Notifier {
    /**
     * @param {NotifierEvent} event
     * @param {NotifierEffect} effect
     * @param {boolean} enabled
     */
    static setEnabled(event, effect, enabled) {
        let key = toKey(event, effect);
        SETTINGS.get()[key] = enabled;
        SETTINGS.resave();
    }

    /**
     * @param {NotifierEvent} event
     * @param {NotifierEffect} effect
     * @returns {boolean}
     */
    static isEnabled(event, effect) {
        let key = toKey(event, effect);

        let enabled = SETTINGS.get()[key];
        if (enabled === true || enabled === false) {
            return enabled;
        }

        // Setting has never been set before; use default value

        return event.isEnabledByDefault(effect);
    }

    /**
     * @param {NotifierEvent} event
     */
    static trigger(event) {
        for (let effect of EFFECTS) {
            if (Notifier.isEnabled(event, effect)) {
                effect.run(event);
            }
        }
    }

    /**
     * @returns {NotifierEffect[]}
     */
    static getEffects() {
        return EFFECTS;
    }

    /**
     * @returns {NotifierEvent[]}
     */
    static getEvents() {
        return EVENTS;
    }

    static init() {
        for (let effect of EFFECTS) {
            for (let event of EVENTS) {
                effect.init(event);
            }
        }
    }
}


export class NotifierEffect {
    /**
     * @param {string} title
     * @param {string} id
     * @param {Function} action
     * @param {Function} init
     */
    constructor(title, id, action, init = null) {
        /**
         * @type {string}
         */
        this.title = title;

        /**
         * @type {string}
         */
        this.id = id;

        this._action = action;
        this._init = init;
        EFFECTS.push(this);
    }

    /**
     * @param {NotifierEvent} event
     */
    run(event) {
        if (event.supports(this)) {
            try {
                let data = event.get(this);
                this._action(data);
            } catch (e) {
                console.error(e);
            }
        }
    }

    init(event) {
        if (this._init && event.supports(this)) {
            try {
                let data = event.get(this);
                this._init(data);
            } catch (e) {
                console.error(e);
            }
        }
    }
}

export class NotifierEvent {
    /**
     * @param {string} title
     * @param {string} id
     */
    constructor(title, id) {
        /**
         * @type {string}
         */
        this.title = title;

        /**
         *
         * @type {string}
         */
        this.id = id;

        this._data = Object.create(null);
        this._enabledByDefault = Object.create(null);

        EVENTS.push(this);
    }

    /**
     * @param {NotifierEffect} effect
     * @param {*} value
     * @param {boolean} enabledByDefault
     * @returns {NotifierEvent}
     */
    set(effect, value, enabledByDefault = false) {
        this._data[effect.id] = value;
        this._enabledByDefault[effect.id] = enabledByDefault;
        return this;
    }

    /**
     * @param {NotifierEffect} effect
     * @returns {boolean}
     */
    supports(effect) {
        return this.get(effect) !== undefined;
    }

    /**
     * @param {NotifierEffect} effect
     * @returns {boolean}
     */
    isEnabledByDefault(effect) {
        return this._enabledByDefault[effect.id] || false;
    }

    /**
     * @param {NotifierEffect} effect
     * @returns {*}
     */
    get(effect) {
        return this._data[effect.id];
    }

    trigger() {
        Notifier.trigger(this);
    }
}

let soundCache = {};
let requestedDesktop = false;

Notifier.DESKTOP = new NotifierEffect("Show Notification", 'desktop',
    text => {
        // TODO: Send notifications
    },
    () => {
        if (requestedDesktop) {
            return;
        }
        requestedDesktop = true;

        // TODO: Request notifications
    }
);

Notifier.SOUND = new NotifierEffect("Play Sound Effect", 'sound',
    fileName => {
        let audio = soundCache[fileName];
        if (audio) {
            audio.play();
        }
    },
    fileName => {
        // TODO: We need proper error handling here
        soundCache[fileName] = new Audio(SOUND_ROOT + fileName);
    }
);

Notifier.BLINK = new NotifierEffect("Blink Screen", 'blink',
    color => {
        blinkOverlay(color, 3);
    }
);

Notifier.RACE_STARTING = new NotifierEvent("Race Start", 'race.start')
    .set(Notifier.SOUND, 'raceStart.mp3')
    .set(Notifier.BLINK, '#1F1', ENABLED_BY_DEFAULT);
;