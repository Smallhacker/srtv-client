'use strict';
import {Grid, panel} from "../bootstrap";
import {coerceToNumber, DateTime, formatDuration, Handlers, oneOf, scrollAtBottom, scrollToBottom} from "../utils";

/**
 * If set to true, messages sent by the user will immediately show up on their own screen instead of waiting for the server to process it and send it back.
 * @type {boolean}
 */
const FAKE_CHAT_RESPONSIVITY = true;

const IS_LOCAL = '@@local';
const IS_HISTORICAL = '@@historical';

// TODO: Transition into using PanelWidget
export default class ChatWidget {
    /**
     * @param {System} system
     * @param {Guid[]} chatsToView
     * @param {Guid|null} chatToSend
     * @param {{}} hooks
     */
    constructor(system, chatsToView, chatToSend = null, hooks = {}) {
        this._system = system;
        this._api = system.api;
        this.logNode = $('<ol class="chat-widget-log">');
        this._sendNode = null;
        this._chatToSend = chatToSend;
        this._prevDate = null;
        this._rtApi = system.api.getRealTimeApi();
        this._messageQueue = [];
        this._stopHandlers = new Handlers();
        this._hooks = hooks;

        let promises = chatsToView
            .map(chatGuid =>
                system.api.getChat(chatGuid)
                    .then(chatData => chatData.messages)
                    .catch(() => [{
                        message: "(Failed to load chat history)",
                        type: "CLIENT_ERROR"
                    }])
            );

        for (let chatGuid of chatsToView) {
            this._rtApi.subscribe(chatGuid)
                .then(sub => {
                    sub.listen(m => this._receiveMessage(m));
                    this._stopHandlers.listen(() => sub.unsubscribe());
                })
                .catch(() => {
                    this._receiveMessage({
                        message: "(Failed to connect to a chat channel)",
                        type: "CLIENT_ERROR"
                    });
                });
        }

        Promise.all(promises)
            .then(messageArrays => messageArrays
                .reduce((a, b) => a.concat(b))
                .sort((a, b) => (a.stamp || 0) - (b.stamp || 0))
            )
            .then(messages => {
                for (let message of messages) {
                    message[IS_HISTORICAL] = true;
                    this._addMessage(message);
                }
                this._emptyQueue();
            });
    }

    /**
     * @param {Context} parentContext
     * @param {System} system
     * @param {Guid[]} chatsToView
     * @param {Guid|null} chatToSend
     * @param {{}} hooks
     * @returns {*}
     */
    static chatPanel(parentContext, system, chatsToView, chatToSend = null, hooks = {}) {
        let p = panel();
        p.addClass('widget-chat-panel');
        let widget = new ChatWidget(system, chatsToView, chatToSend, hooks);
        p.widget = widget;

        widget.logNode.appendTo(p.body());
        if (chatToSend) {
            let footer = p.footer()
                .addClass('chat-widget-send')
                .append(widget.sendNode);
        }

        parentContext.onDestroy(() => widget.stop());

        return p;
    }

    stop() {
        this._stopHandlers.invoke().clear();
    }

    get sendNode() {
        if (!this._sendNode) {
            let text = $('<input type="text" class="form-control" placeholder="Message...">');
            let form = $('<form>').submit(e => {
                e.preventDefault();
                this.send(text.val());
                text.val("");
            });

            this._sendNode = new Grid(form)
                .row().cell().append(text)
                .node;
        }
        return this._sendNode;
    }

    send(message) {
        if (this._chatToSend) {
            this._api.sendChatMessage(this._chatToSend, message)
                .then(() => {
                    if (FAKE_CHAT_RESPONSIVITY && this._api.currentUserGuid) {
                        this._receiveMessage({
                            channel: this._chatToSend,
                            sender: {
                                guid: this._api.currentUserGuid,
                                slug: this._api.currentUserSlug,
                                name: this._api.currentUserName,
                            },
                            stamp: Math.floor(this._api.getClientTime()),
                            type: 'CHAT',
                            message: message,
                            [IS_LOCAL]: true
                        });
                    }
                })
                .catch(() => alert("Failed to send chat message"));
        }
    }

    _receiveMessage(data) {
        if (this._messageQueue) {
            this._messageQueue.push(data)
        } else {
            this._addMessage(data);
        }
    }

    /**
     * @param {RTMessage} message
     * @private
     */
    _addMessage(message) {
        if (!message.type) {
            return;
        }

        console.debug(`[${Date.now() / 1000}] Processing message: ${JSON.stringify(message)}`);

        let parent = this.logNode.parent();
        let atBottom = scrollAtBottom(parent);

        let time = "";
        let date = null;
        if (message.stamp) {
            time = new DateTime(message.stamp);
            if (this._prevDate !== time.dateHash()) {
                this._prevDate = time.dateHash();
                date = time;
            }

            time = this._system.timeFormatter.longTime(time);
        }

        let senderName = message.sender && message.sender.name || null;

        let sentBySelf = message.sender && message.sender.guid === this._api.currentUserGuid;
        if (FAKE_CHAT_RESPONSIVITY && sentBySelf && !message[IS_HISTORICAL] && !message[IS_LOCAL]) {
            return;
        }

        let text = ChatWidget._getText(message);
        if (!text) {
            return;
        }

        if (date) {
            this._addDate(date);
        }

        let styleClass = null;
        if (text.style) {
            styleClass = "chat-widget-message-" + text.style;
        }

        let li = $('<li class="chat-widget-message">').addClass(styleClass).appendTo(this.logNode);
        $('<span class="chat-widget-time">').text(time).appendTo(li);
        $('<span class="chat-widget-sender">').text(senderName).appendTo(li);
        $('<span class="chat-widget-text">').text(text.text).appendTo(li);

        if (atBottom) {
            scrollToBottom(parent);
        }

        let hook = this._hooks[message.type];
        if (hook) {
            hook(message);
        }
    };

    _addDate(time) {
        let date = this._system.timeFormatter.longDate(time);
        let li = $('<li class="chat-widget-separator">').appendTo(this.logNode);
        $('<span class="chat-widget-date">').text(date).appendTo(li);
    };

    _emptyQueue() {
        for (let message of this._messageQueue) {
            this._addMessage(message);
        }
        this._messageQueue = null;
    }

    /**
     * @param {RTMessage} message
     * @returns {*}
     * @private
     */
    static _getText(message) {
        /**
         * @type {RTPayload}
         */
        let payload = message.message;

        switch (message.type) {
            case 'CHAT':
                return {
                    text: payload
                };
            case 'CLIENT_ERROR':
                return {
                    text: payload,
                    style: 'critical'
                };
            case 'CRITICAL':
                return {
                    text: payload,
                    style: 'critical'
                };
            case 'RACE_UPDATE':
                return ChatWidget._getRaceText(payload);
            case 'ENTRY_UPDATE':
                return ChatWidget._getEntryText(payload);
            default:
                return null;
        }
    }

    /**
     *
     * @param {RTPayload} payload
     * @returns {{} | null}
     * @private
     */
    static _getRaceText(payload) {
        let status = payload.status;
        switch (status) {
            case 'CANCELED':
                return {
                    text: "The race has been canceled.",
                    style: 'info'
                };
            case 'ENDED':
                return {
                    text: "The race has ended.",
                    style: 'info'
                };
            case 'COUNTDOWN':
                let secondsLeft = payload.parameter;
                switch (secondsLeft) {
                    case 10:
                    case 5:
                        return {
                            text: `The race will start in ${secondsLeft} seconds.`,
                            style: 'critical',
                        };
                    case 4:
                    case 3:
                    case 2:
                    case 1:
                        return {
                            text: `${secondsLeft}...`,
                            style: 'critical',
                        };
                    default:
                        return null;
                }
            case '10SEC':
                return null; // Ignore.
            case 'STARTED':
                return {
                    text: "The race has started!",
                    style: 'critical'
                };
            case 'LATECUTOFF':
                return {
                    text: "The race is now closed to late entrants.",
                    style: 'info'
                };
            case 'QUITCUTOFF':
                return {
                    text: "The penalty-free quit period has ended.",
                    style: 'info'
                };
            default:
                return {
                    text: "The race status has been set to " + status,
                    style: 'info'
                };
        }
    }

    /**
     * @param {RTEntryUpdate} payload
     * @returns {{text: string, style: string}}
     * @private
     */
    static _getEntryText(payload) {
        let entry = payload.entry;
        let name = entry.player.name;

        switch (payload.status) {
            case 'JOINED':
                return {
                    text: `${name} has joined the race.`,
                    style: 'info'
                };
            case 'READY':
                return {
                    text: `${name} is ready.`,
                    style: 'info'
                };
            case 'DONE':
                let offset = payload.offset + coerceToNumber(payload.startupOffset, 0);
                let duration = formatDuration(offset, true);
                return {
                    text: `${name} just finished with a time of ${duration}.`,
                    style: 'info'
                };
            case 'DNF':
                return {
                    text: `${name} has forfeited.`,
                    style: 'info'
                };
            case 'DQ':
                return {
                    text: `${name} has been disqualified.`,
                    style: 'info'
                };
            case 'DROPPED':
                return {
                    text: `${name} has quit.`,
                    style: 'info'
                };
            case 'REMOVED':
                return {
                    text: `${name} has been removed from the race.`,
                    style: 'info'
                };
            default:
                return {
                    text: `${name}'s status has changed to ${payload.status}`,
                    style: 'info'
                };
        }
    }
}