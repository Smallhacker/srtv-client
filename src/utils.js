'use strict';
import {Contextual} from "./context";

export function isString(o) {
    return $.type(o) === 'string';
}

export function isNumber(o) {
    return $.type(o) === 'number';
}

export function isFunction(o) {
    return $.type(o) === 'function';
}

export const NBSP = '\xa0';

/**
 * @param {T|T[]|null|undefined} o
 * @returns {T[]}
 * @template {T}
 */
export function ensureArray(o) {
    if (Array.isArray(o)) {
        return o;
    }
    if (o === null || o === undefined) {
        return [];
    }
    return [o];
}

export function padLeft(str, char, minLen) {
    str = "" + str;
    let missing = minLen - str.length;
    while (missing-- > 0) {
        str = char + str;
    }
    return str;
}

function randomString() {
    let s = '';
    for (let i = 0; i < 32; i++) {
        s += (Math.random() * 16 | 0).toString(16);
    }
    return s;
}

export function jsonp(url, callback) {
    let funcName = 'jsonp_' + randomString();

    if (url.indexOf('?') === -1) {
        url += '?';
    } else {
        url += '&';
    }
    url += 'callback=' + funcName;

    let script = $('<script>').attr('src', url).appendTo(document.body);
    window[funcName] = function (data) {
        delete window[funcName];
        callback(data);
        script.remove();
    };
}

/**
 * @typedef {jQuery|HTMLElement|HTMLElement[]|string|number} NodeContent
 */

/**
 * @param {NodeContent} nodeOrText
 * @param {string|null} textTag
 * @return {jQuery}
 */
export function toNode(nodeOrText, textTag = null) {
    if (nodeOrText instanceof jQuery) {
        return nodeOrText;
    }
    if (Array.isArray(nodeOrText) || nodeOrText instanceof Element) {
        return $(nodeOrText);
    }

    if (textTag) {
        return $('<' + textTag + '>').text(nodeOrText);
    }

    return textNode(nodeOrText);
}

/**
 * @param {string} text
 * @returns {jQuery}
 */
export function splitLines(text) {
    if (!text) {
        return $();
    }

    let split = (text || "").split(/\r?\n/);
    let elems = [];
    for (let i = 0; i < split.length; i++) {
        if (i !== 0) {
            elems.push(document.createElement('br'));
        }
        elems.push(document.createTextNode(split[i]));
    }
    return $(elems);
}

/**
 * @param {string} text
 * @return {jQuery}
 */
export function textNode(text) {
    return $(document.createTextNode(text));
}

export class Handlers {
    constructor() {
        this._handlers = [];
    }

    /**
     * @param {Function} callback
     * @returns {Handlers}
     */
    listen(callback) {
        this._handlers.push(callback);
        return this;
    }

    /**
     * @returns {Promise}
     */
    promise() {
        return new Promise(resolve => this.listen(resolve));
    }

    /**
     * @returns {Handlers}
     */
    clear() {
        this._handlers = [];
        return this;
    }

    /**
     * @param {*} value
     * @returns {Handlers}
     */
    invoke(value = null) {
        for (let handler of this._handlers) {
            handler(value);
        }
        return this;
    }
}

export class Timer {
    constructor(callback, delay) {
        this._callback = callback;
        this._interval = null;
        this._delay = delay;
    }

    isRunning() {
        return this._interval !== null;
    }

    start(invoke = false) {
        if (!this.isRunning()) {
            this._interval = window.setInterval(this._callback, this._delay);
        }

        if (invoke) {
            window.setTimeout(this._callback);
        }

        return this;
    }

    stop() {
        if (this.isRunning()) {
            window.clearInterval(this._interval);
            this._interval = null;
        }
        return this;
    }

    reset(invoke = false) {
        if (this.isRunning()) {
            this.stop().start(invoke);
        }
    }
}

export class DateTime {
    /**
     * @param {Stamp} stamp
     */
    constructor(stamp) {
        /**
         * @type {Stamp}
         */
        this.stamp = stamp;

        /**
         * @type {Date}
         */
        this.date = new Date(stamp * 1000);
    }

    dateHash() {
        let d = this.date;
        return (((d.getFullYear()
            * 12) + d.getMonth())
            * 31) + d.getDate();
    }
}

export class TimeFormatter {
    /**
     * @param {DateTime} dateTime
     * @return {string}
     */
    longTime(dateTime) {
        let d = dateTime.date;
        let hh = padLeft(d.getHours(), "0", 2);
        let mm = padLeft(d.getMinutes(), "0", 2);
        let ss = padLeft(d.getSeconds(), "0", 2);
        return hh + ":" + mm + ":" + ss;
    }

    /**
     * @param {DateTime} dateTime
     * @return {string}
     */
    longDate(dateTime) {
        let d = dateTime.date;
        let month = this._formatMonth(d.getMonth());
        let date = d.getDate();
        let year = d.getFullYear();
        return month + " " + date + " " + year;
    }

    _formatMonth(month) {
        return [
            "Jan", "Feb", "Mar", "Apr",
            "May", "Jun", "Jul", "Aug",
            "Sep", "Oct", "Nov", "Dec"
        ][month];
    }
}

export class TimeFormatter12h extends TimeFormatter {
    /**
     * @param {DateTime} dateTime
     * @return {string}
     */
    longTime(dateTime) {
        let d = dateTime.date;
        let hh = padLeft(d.getHours(), "0", 2);
        let mm = padLeft(d.getMinutes(), "0", 2);
        let ss = padLeft(d.getSeconds(), "0", 2);
        return hh + ":" + mm + ":" + ss;
    }
}

let nextUniqueId = 1;

/**
 * @returns {string}
 */
export function uniqueId() {
    return "unique-id-" + nextUniqueId++;
}

/**
 * @param {jQuery} node
 * @returns {string}
 */
export function getOrCreateId(node) {
    let id = node.attr('id');
    if (!id) {
        id = uniqueId();
        node.attr('id', id);
    }
    return id;
}

/**
 * @returns {jQuery}
 */
export function uniqueDiv(cssClass = null) {
    return $('<div>')
        .attr('id', System.uniqueId())
        .addClass(cssClass);
}

/**
 * @param {number} duration
 * @param {boolean} showDays
 * @returns {string}
 */
export function formatDuration(duration, showDays = false) {
    let output = "";

    if (duration < 0) {
        output = "-";
        duration = -duration;
    }

    let seconds = Math.floor(duration);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    let days = Math.floor(hours / 24);

    seconds = padLeft(seconds % 60, '0', 2);
    minutes = padLeft(minutes % 60, '0', 2);
    if (showDays) {
        hours = padLeft(hours % 24, '0', 2);
    } else {
        hours = padLeft(hours, '0', 2);
        days = 0;
    }

    if (days) {
        output = days + "d ";
    }
    output += hours + ":" + minutes + ":" + seconds;
    return output;
}

/**
 * @param {ClientStamp} stamp
 * @return {string}
 */
export function toInputFormat(stamp) {
    let d = new Date(stamp * 1000);
    let year = d.getFullYear();
    let month = padLeft(d.getMonth() + 1, '0', 2);
    let day = padLeft(d.getDay(), '0', 2);
    let hour = padLeft(d.getHours(), '0', 2);
    let minute = padLeft(d.getMinutes() + 1, '0', 2);
    return year + '-' + month + '-' + day + 'T' + hour + ':' + minute;
}

/**
 * @param {string} value
 * @return {ClientStamp|null}
 */
export function fromInputFormat(value) {
    let parsed = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
        .exec(value);

    if (!parsed) {
        return null;
    }
    let d = new Date(+parsed[1], +parsed[2] - 1, +parsed[3], +parsed[4], +parsed[5]);
    return Math.floor(d / 1000);
}

/**
 * @param {Context} context
 * @param {Stamp|null} startStamp
 * @param {boolean} showDays
 * @returns {jQuery}
 */
export function timerSpan(context, startStamp, showDays = false) {
    let span = $('<span>');

    let lastDuration = null;

    function tick() {
        let now = Math.floor(Date.now() / 1000);
        let duration;
        if (startStamp === null) {
            duration = 0;
        } else {
            duration = now - startStamp;
        }
        if (lastDuration === null || duration !== lastDuration) {
            lastDuration = duration;
            span.text(formatDuration(duration, showDays));
        }
    }

    tick();
    context.interval(200, tick);

    /**
     * @param {Stamp} stamp
     */
    span.setStart = function (stamp) {
        startStamp = stamp;
        tick();
    };

    return span;
}

/**
 *
 * @param {Promise<T>} promise
 * @param {Function} onDone
 * @returns {Promise<T>}
 * @template {T}
 */
export function interceptPromise(promise, onDone) {
    return promise.then(
        success => {
            onDone();
            return success;
        },
        failure => {
            onDone();
            return Promise.reject(failure);
        }
    );
}

/**
 * @param {function} callback
 * @returns {[function,function]}
 */
export function intercept(callback) {
    return [
        success => {
            callback(success);
            return success;
        },
        failure => {
            callback(undefined, failure);
            return Promise.reject(failure);
        }
    ];
}

export function requestMutex(requestSender, requestHandler) {
    let locked = false;
    return function () {
        if (locked) {
            return new Promise();
        }

        locked = true;

        let promise = interceptPromise(
            requestSender(),
            () => {
                locked = false;
            }
        );
        requestHandler(promise);
    }
}

/**
 * @param {jQuery} node
 * @returns {boolean}
 */
export function scrollAtBottom(node) {
    let element = node[0];
    if (!element) {
        return true;
    }
    return element.scrollHeight - element.scrollTop === element.clientHeight;
}

/**
 * @param {jQuery} node
 */
export function scrollToBottom(node) {
    let element = node[0];
    if (element) {
        element.scrollTop = element.scrollHeight - element.clientHeight;
    }
}

export class RunningAverage {
    /**
     * @param {number} maxLength
     * @param {number} initialValue
     */
    constructor(maxLength, initialValue) {
        this._values = new Array(maxLength);
        this._length = 0;
        this._nextIndex = 0;
        this._maxLength = maxLength;
        this.value = initialValue;
    }

    add(value) {
        this._values[this._nextIndex] = value;
        this._nextIndex = (this._nextIndex + 1) % this._maxLength;
        if (this._length < this._maxLength) {
            this._length++;
        }
        let sum = 0;
        for (let i = 0; i < this._length; i++) {
            sum += this._values[i];
        }
        this.value = roundAway(sum / this._length);

        //console.debug("Measured: " + value + "; running average is " + this.value + " with " + this._length + " data points");
    }
}

/**
 * @param {number} number
 * @returns {number}
 */
export function roundAway(number) {
    let sign = number < 0 ? -1 : 1;
    return sign * Math.round(Math.abs(number));
}

/**
 * @param {...T} options
 * @return {T}
 * @template {T}
 */
export function oneOf(...options) {
    let index = Math.floor(Math.random() * options.length);
    return options[index];
}

/**
 * @param {string} icon
 * @returns {jQuery}
 */
export function icon(icon) {
    return $('<i>', {
        'aria-hidden': 'true',
        'class': 'fa fa-' + icon
    });
}

/**
 * @param {jQuery} target
 * @param {string|null} iconName
 * @param {string|null} label
 * @returns {jQuery}
 */
export function appendIcon(target, iconName = null, label = null) {
    if (iconName) {
        icon(iconName).appendTo(target);
    }

    if (label) {
        $(document.createTextNode(" " + label))
            .appendTo(target);
    }

    return target;
}

export function delayPromise(promise, millis) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            promise.then(resolve, reject);
        }, millis);
    });
}

/**
 * @param {jQuery[]} nodes
 * @param {jQuery} separator
 * @param {jQuery} targetNode
 * @returns {jQuery}
 */
export function joinNodes(nodes, separator, targetNode) {
    let first = true;
    for (let node of nodes) {
        if (first) {
            first = false;
        } else {
            targetNode.append(separator.clone());
        }
        targetNode.append(node);
    }
    return targetNode;
}

/**
 * @param {*} t
 * @returns {boolean}
 */
export function isThenable(t) {
    return !!(t && t.then);
}

export class Mutex {
    constructor() {
        this._locked = false;
    }

    attempt(func) {
        if (this._locked) {
            return false;
        }

        this._locked = true;

        const release = promise => {
            if (isThenable(promise)) {
                promise.then(
                    () => release(),
                    () => release()
                );
            } else {
                this._locked = false;
            }
        };

        let ret = func(release);
        if (isThenable(ret)) {
            release(ret);
        }

        return true;
    }
}

export class KeyBind {
    /**
     * @param {jQuery} node
     */
    constructor(node) {
        /**
         * @type {Object}
         * @private
         */
        this._keys = Object.create(null);

        node.keydown(e => {
            let handler = this._keys[e.key];
            if (handler) {
                let res = handler();
                if (res !== false) {
                    e.preventDefault();
                }
            }
        });
    }

    /**
     * @param {string} key
     * @param {function} handler
     * @returns {KeyBind}
     */
    onKey(key, handler) {
        this._keys[key] = handler;
        return this;
    }
}

/**
 * @typedef {{value: *, next: LinkedNode|null}} LinkedNode
 */

export class Queue {
    constructor() {
        /**
         * @type {LinkedNode|null}
         * @private
         */
        this._head = null;

        /**
         * @type {LinkedNode|null}
         * @private
         */
        this._tail = null;

        /**
         * @type {number}
         * @private
         */
        this._length = 0;
    }

    get length() {
        return this._length;
    }

    /**
     * @param {*} value
     * @returns {Queue}
     */
    push(value) {
        let node = {value, next: null};
        if (this._tail) {
            this._tail.next = node;
        }
        this._tail = node;
        if (!this._head) {
            this._head = node;
        }

        this._length++;

        return this;
    }

    /**
     * @returns {*|null}
     */
    peek() {
        let node = this._head;
        if (!node) {
            return null;
        }
        return node.value;
    }

    /**
     * @returns {*|null}
     */
    pop() {
        let node = this._head;
        if (!node) {
            return null;
        }
        this._head = node.next;

        this._length--;

        return node.value;
    }

    /**
     * @param {*} value
     * @returns {boolean}
     */
    removeValue(value) {
        let prev = null;
        let node = this._head;
        while (node !== null) {
            if (node.value === value) {
                if (prev) {
                    prev.next = node.next;
                } else {
                    this._head = node.next;
                }

                this._length--;
                return true;
            }
            prev = node;
            node = node.next;
        }
        return false;
    }
}

/**
 * @param {*} o
 * @param {number} fallback
 * @returns {number}
 */
export function coerceToNumber(o, fallback = NaN) {
    switch ($.type(o)) {
        case 'number':
            return o;
        case 'string':
            o = o.trim();
            if (o && o.match(/[+\-]?[0-9]+(\.[0-9]+)?/)) {
                return parseFloat(o);
            }
    }
    return fallback;
}

/**
 * @template T
 */
export class Persistent {
    /**
     * @param {string} key
     * @param {object|null} fallbackValue
     * @returns {Persistent<object>}
     */
    static object(key, fallbackValue = {}) {
        return new Persistent(key, fallbackValue, false);
    }

    /**
     * @param {string} key
     * @param {string|null} fallbackValue
     * @returns {Persistent<string>}
     */
    static string(key, fallbackValue = null) {
        return new Persistent(key, fallbackValue, true);
    }

    constructor(key, fallbackValue = null, string = false) {
        this._key = key;
        this._fallbackValue = fallbackValue;
        this._string = string;
        this._loaded = false;
        this._value = null;
    }

    _load() {
        let value = localStorage.getItem(this._key);
        if (value == null) {
            return this._fallbackValue;
        }

        if (this._string) {
            return value;
        }

        if (value) {
            try {
                return JSON.parse(value);
            } catch (e) {
                return this._fallbackValue;
            }
        }

        return this._fallbackValue;
    }

    /**
     * @returns {T|null}
     */
    get() {
        if (!this._loaded) {
            this._value = this._load();
            this._loaded = true;
        }
        return this._value;
    }

    /**
     * @param {T} value
     */
    set(value) {
        this._loaded = true;
        this._value = value;
        try {
            let serialized = this._string ? value : JSON.stringify(value);
            localStorage.setItem(this._key, serialized);
        } catch (e) {
            // Failed to persist, for instance due to being in private mode or localStorage being full
            // Either way, let's just silently ignore it.
        }
    }

    resave() {
        this.set(this.get());
    }
}