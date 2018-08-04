'use strict';

export const Role = {
    Banned: 'BANNED',
    LoggedOut: 'LOGGED_OUT',
    Normal: 'NORMAL',
    Gatekeeper: 'GATEKEEPER',
    Owner: 'OWNER',
    Moderator: 'MODERATOR',
    Admin: 'ADMIN'
};

export const RaceType = {
    ReadyUp: 'READY_UP',
    Scheduled: 'SCHEDULED',
    Gatekeeper: 'GATEKEEPER'
};

/**
 * @param {string} errorMsg
 * @returns {Function}
 */
function join(errorMsg) {
    /**
     * @param {RaceState} raceState
     * @returns {Promise<Guid>}
     */
    function f(raceState) {
        return raceState.api.joinRace(raceState.raceGuid)
            .then(entry => entry.guid)
            .catch(() => Promise.reject(errorMsg))
    }

    return f;
}

/**
 * @param {string} status
 * @param {string} errorMsg
 * @returns {Function}
 */
function setStatus(status, errorMsg) {
    /**
     * @param {RaceState} raceState
     * @returns {Promise<Guid>}
     */
    function f(raceState) {
        let entryGuid = raceState.entryGuid;
        return raceState.api.setEntryStatus(entryGuid, status)
            .then(() => entryGuid)
            .catch(() => Promise.reject(errorMsg))
    }

    return f;
}

const ACTIONS = {
    join: {
        text: "Join",
        handler: join("Failed to join race.")
    },
    quit: {
        text: "Quit",
        handler: setStatus("DROPPED", "Failed to quit race.")
    },
    unquitToJoined: {
        text: "Rejoin",
        handler: setStatus("JOINED", "Failed to rejoin race.")
    },
    unquitToReady: {
        text: "Rejoin",
        handler: setStatus("READY", "Failed to rejoin race.")
    },
    ready: {
        text: "Ready",
        handler: setStatus("READY", "Failed to ready up.")
    },
    unready: {
        text: "Unready",
        handler: setStatus("JOINED", "Failed to unready.")
    },
    forfeit: {
        text: "Forfeit",
        handler: setStatus("DNF", "Failed to forfeit race.")
    },
    resume: {
        text: "Resume",
        handler: setStatus("READY", "Failed to resume race.")
    },
    done: {
        text: "Done",
        handler: setStatus("DONE", "Failed to mark as done.")
    },
    undone: {
        text: "Undone",
        handler: setStatus("READY", "Failed to unmark as done.")
    }
};

export default class RaceState {
    /**
     * @param {HydraApi} api
     * @param {Function|null} onAction
     * @param {RaceDataWithRole} race
     * @param {EntryData|null} entry
     */
    constructor(api, onAction, race, entry = null) {
        this.api = api;
        this.onAction = onAction || (() => {});

        this.race = race;
        this.raceGuid = race.guid;

        if (entry) {
            this.entry = entry;
        } else {
            if (this.race.entry) {
                this.entry = this.race.entry;
            } else if (this.race.entries) {
                let userGuid = api.currentUserGuid;
                if (userGuid) {
                    this.entry = this.race.entries
                        .filter(entry => entry.player.guid === userGuid)
                        [0] || null;
                } else {
                    this.entry = null;
                }
            }


        }

        this.entryGuid = entry && entry.guid;



        this.joinButton = $('<button class="btn btn-success runner-view-button">');
        this.dnfButton = $('<button class="btn btn-warning runner-view-button">');
        this.quitButton = $('<button class="btn btn-danger runner-view-button">');

        this.buttons = [
            this.joinButton, this.dnfButton, this.quitButton
        ];

        this._waiting = false;

        this.apply();
    }

    /**
     * @param {Guid} entryGuid
     * @returns {Promise}
     */
    refresh(entryGuid = this.entryGuid) {
        if (!entryGuid) {
            return this.api.getRace(this.raceGuid)
                .then(race => {
                    this.race = race;
                    this.apply();
                });
        }
        return this.api.getEntryWithRace(entryGuid)
            .then(entry => {
                this.race = entry.race;
                this.entry = entry;

                this.entryGuid = entry.guid;
                this.raceGuid = entry.race.guid;

                this.apply();
            });
    }

    pickActions() {
        if (!this.ended) {
            let join = this.canJoin ? ACTIONS.join : null;
            let ready = ACTIONS.ready;
            let unready = !this.started ? ACTIONS.unready : null;
            let done = this.started ? ACTIONS.done : null;
            let undone = this.started ? ACTIONS.resume : null;
            let forfeit = this.started ? ACTIONS.forfeit : null;
            let resume = this.started ? ACTIONS.resume : null;
            let quit = this.canQuit ? ACTIONS.quit : null;
            let rejoin = null;
            if (this.canQuit) {
                rejoin = this.started ? ACTIONS.unquitToReady : ACTIONS.unquitToJoined;
            }

            switch (this.status) {
                case 'NONE':
                    return [join, null, null];
                case 'JOINED':
                    return [ready, null, quit];
                case 'READY':
                    return [unready || done, forfeit, quit];
                case 'DONE':
                    return [undone, null, null];
                case 'DNF':
                    return [null, resume, null];
                case 'DROPPED':
                    return [null, null, rejoin];
            }
        }
        return [null, null, null];
    }

    get started() {
        return this.race.started !== null;
    }

    get ended() {
        return this.race.ended !== null;
    }

    get canceled() {
        return this.race.canceled !== null;
    }

    get recorded() {
        return this.race.recorded !== null;
    }

    get over() {
        return this.ended || this.canceled || this.recorded;
    }

    get canJoin() {
        if (this.over || this.bannedOrLoggedOut) {
            return false;
        }
        return !this.started
            || this.approximateRaceTime < this.race.lateCutoff;
    }

    get canQuit() {
        if (this.over || this.bannedOrLoggedOut) {
            return false;
        }
        return !this.started
            || this.approximateRaceTime < this.race.quitCutoff;
    }

    get isModerator() {
        return this.roleIs(Role.Gatekeeper, Role.Owner, Role.Moderator, Role.Admin);
    }

    get canStartRace() {
        if (this.started || this.over) {
            return false;
        }
        return (this.raceIs(RaceType.Gatekeeper) && this.roleIs(Role.Gatekeeper, Role.Owner))
            || (this.roleIs(Role.Moderator, Role.Admin));
    }

    get canScheduleRace() {
        if (this.started || this.over) {
            return false;
        }
        return (this.raceIs(RaceType.Gatekeeper) && this.roleIs(Role.Gatekeeper, Role.Owner))
            || (this.raceIs(RaceType.Scheduled) && this.roleIs(Role.Owner))
            || (this.roleIs(Role.Moderator, Role.Admin));
    }

    get canEditRaceInfo() {
        if (this.over) {
            return false;
        }

        return this.roleIs(Role.Gatekeeper, Role.Owner, Role.Moderator, Role.Admin);
    }

    get canCancelRace() {
        if (this.over) {
            return false;
        }

        return this.roleIs(Role.Moderator, Role.Admin);
    }

    get canRecordRace() {
        if (this.canceled || this.recorded) {
            return false;
        }

        return this.ended && this.roleIs(Role.Moderator, Role.Admin);
    }

    // TODO: Flag permissions

    get canMod() {
        return this.canStartRace || this.canScheduleRace || this.canEditRaceInfo || this.canCancelRace;
    }

    get status() {
        return (this.entry && this.entry.status) || 'NONE';
    }

    apply() {
        let actions = this.pickActions();

        for (let i = 0; i < this.buttons.length; i++) {
            let button = this.buttons[i];
            let action = actions[i];
            if (action) {
                button
                    .text(action.text)
                    .prop('disabled', false)
                    .off('click')
                    .click(() => {
                        if (!this._waiting) {
                            this._waiting = true;
                            action.handler(this)
                                .then(guid => {
                                    return this.onAction(guid);
                                }, error => {
                                    alert(error);
                                    return Promise.reject();
                                })
                                .then(() => {
                                    this._waiting = false;
                                }, () => {
                                    this._waiting = false;
                                });
                        }
                    });

            } else {
                button
                    .text("")
                    .prop('disabled', true)
                    .off('click');
            }
        }
    }

    /**
     * @returns {number}
     */
    get approximateRaceTime() {
        let started = this.race.started;
        if (!started) {
            return 0;
        }
        return this.api.getApproximateServerTime() - started;
    }

    raceIs(...raceTypes) {
        return raceTypes.includes(this.race.startupType);
    }

    roleIs(...roles) {
        return roles.includes(this.race.role);
    }

    get normalOrHigher() {
        return this.roleIs(Role.Normal, Role.Gatekeeper, Role.Owner, Role.Moderator, Role.Admin);
    }

    get bannedOrLoggedOut() {
        return !this.normalOrHigher;
    }
}
