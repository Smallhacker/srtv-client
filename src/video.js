'use strict';
import {Handlers} from "./utils";
import {Contextual} from "./context";

const WATCH = "Watch";
const WATCHING = "Watching";

export class ChannelRemote {
    constructor(video) {
        this._video = video;
        this._buttons = [];
        this._currentGuid = video._userGuid;
        this._video.onChannel(({userGuid}) => {
            this._currentGuid = userGuid;
            let buttons = $(this._buttons);
            buttons.prop('disabled', false)
                .removeClass('btn-primary')
                .addClass('btn-default')
                .text(WATCH);
            buttons.filter('[data-user-guid="' + userGuid +'"]')
                .prop('disabled', true)
                .addClass('btn-primary')
                .removeClass('btn-default')
                .text(WATCHING);
        });
    }

    _isMarked(userGuid) {
        return userGuid === this._currentGuid;
    }

    button(channelName, userGuid) {
        let button = $('<button>')
            .attr('data-user-guid', userGuid);
        if (this._isMarked(userGuid)) {
            button.addClass('btn btn-primary video-remote-button')
                .prop('disabled', true)
                .text(WATCHING);
        } else {
            button.addClass('btn btn-default video-remote-button')
                .text(WATCH);
        }

        this._buttons.push(button[0]);
        button.click(() => {
            if (!this._isMarked(userGuid)) {
                this._video.channel(channelName, userGuid);
            }
        });
        return button;
    }
}

const BUILDING = 0;
const STARTING = 1;
const RUNNING = 2;
const DESTROYED = 3;

export class HydraVideo extends Contextual {
    /**
     * @param {HydraApi} api
     */
    constructor(api) {
        super(null);
        this._player = null;
        this._target = null;
        this._options = {};
        this._api = api;
        this._status = BUILDING;
        this._userGuid = null;
        this._onChannel = new Handlers();
        this._onRun = new Handlers();
        this._remote = null;
        this._mostRecentChannel = null;

        this.context.onDestroy(() => {
            this._status = DESTROYED;

            if (this._player !== null) {
                this._player.pause();
                this._player = null;
            }
            if (this._target !== null) {
                this._target.empty();
                this._target = null;
            }

            this._options = null;
            this._onChannel = null;
            this._onRun = null;
        })
    }

    /**
     * @returns {ChannelRemote}
     */
    get remote() {
        if (this._remote === null) {
            this._remote = new ChannelRemote(this);
        }
        return this._remote;
    }

    /**
     * @returns {string|null}
     */
    getChannel() {
        return ((this._player && this._player.getChannel()) || this._mostRecentChannel) || null;
    }

    /**
     * @param {Function} callback
     * @returns {HydraVideo}
     */
    onRun(callback) {
        this._onRun.listen(callback);
        return this;
    }

    /**
     * @param {Function} callback
     * @returns {HydraVideo}
     */
    onChannel(callback) {
        this._onChannel.listen(callback);
        return this;
    }

    /**
     * @param {jQuery} target
     * @returns {HydraVideo}
     */
    showIn(target) {
        if (this._status === BUILDING) {
            this._target = target;
        }
        return this;
    }

    /**
     * @returns {HydraVideo}
     */
    init(muted = false) {
        if (this._status === BUILDING) {
            this._player = new Twitch.Player(this._target[0], this._options);

            if (muted) {
                this._player.setMuted(true);
            }

            this._target.find('iframe');
            this._status = RUNNING;
            this._onRun.invoke({channelName: this._options.channel, userGuid: this._userGuid});
            this._onRun.clear();
        }
        return this;
    }

    /**
     * @param {string} channelName
     * @param {Guid|null} userGuid
     * @return {Promise}
     */
    channel(channelName, userGuid = null) {
        switch (this._status) {
            case BUILDING:
                this._mostRecentChannel = channelName;
                this._options.channel = channelName;
                break;
            case STARTING:
                return this._onRun.promise()
                    .then(() => this.channel(channelName, userGuid));
            case RUNNING:
                this._mostRecentChannel = channelName;
                this._player.setChannel(channelName);
                break;
            default:
                return Promise.reject();
        }
        this._userGuid = userGuid;
        this._onChannel.invoke({channelName, userGuid});
        return Promise.resolve();
    }

    /**
     * @param {Guid} userGuid
     * @return {Promise<boolean>}
     */
    userChannel(userGuid) {
            if (this._status === DESTROYED) {
                return Promise.reject();
            }

            return this._api.getUser(userGuid)
                .then(user => {
                    if (user.twitch) {
                        return this.channel(user.twitch, userGuid);
                    }
                    return Promise.reject("User " + user.name + " has no associated Twitch account.");
                });
    }

    static embedChat(channelName) {
        return $('<iframe frameborder="0" scrolling="yes" src="https://www.twitch.tv/' + channelName + '/chat">');
    }
}
