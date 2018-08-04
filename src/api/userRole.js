'use strict';

const ROLES = Object.create(null);

export default class UserRole {
    /**
     * @param {string} label
     * @param {string} code
     * @param {number} level
     */
    constructor(label, code, level) {
        /**
         * @type {string}
         */
        this.label = label;

        /**
         * @type {string}
         */
        this.code = code;

        /**
         * @type {number}
         * @private
         */
        this._level = level;

        if (code) {
            ROLES[code] = this;
        }
    }

    /**
     * @param {UserRole} userRole
     * @returns {boolean}
     */
    is(userRole) {
        return this._level === userRole._level;
    }

    /**
     * @param {UserRole} userRole
     * @returns {boolean}
     */
    isAtLeast(userRole) {
        return this._level >= userRole._level;
    }

    /**
     * @param {string} code
     * @returns {UserRole}
     */
    static parse(code) {
        return ROLES[code] || UserRole.UNKNOWN;
    }
}

UserRole.UNKNOWN = new UserRole("Unknown Role", '', -Infinity);
UserRole.BANNED = new UserRole("Banned", 'BANNED', -1);
UserRole.LOGGED_OUT = new UserRole("Logged Out", 'LOGGED_OUT', 0);
UserRole.NORMAL = new UserRole("Normal User", 'NORMAL', 1);
UserRole.GATEKEEPER = new UserRole("Race Gatekeeper", 'GATEKEEPER', 1.1);
UserRole.OWNER = new UserRole("Race Owner", 'OWNER', 1.2);
UserRole.MODERATOR = new UserRole("Moderator", 'MODERATOR', 2);
UserRole.ADMIN = new UserRole("Admin", 'ADMIN', 3);