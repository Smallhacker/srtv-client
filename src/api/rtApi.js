'use strict';
import {Handlers} from "../utils";

const EVERYTHING = '*';

export class RtSubscription {
    /**
     * @param {RtApi} rtApi
     * @param {Guid} channelGuid
     */
    constructor(rtApi, channelGuid) {
        this._rtApi = rtApi;
        this.channelGuid = channelGuid;

        this._handlers = {};
        this._closed = false;
        this.connectionLost = new Handlers();
        this.connectionReestablished = new Handlers();
    }

    /**
     * @param {string} type
     * @returns {Function[]}
     * @private
     */
    _handlersFor(type) {
        return this._handlers[type] || [];
    }

    /**
     * @param {*} data
     */
    process(data) {
        let type = data.type;
        if (type) {
            let specificHandlers = this._handlersFor(type);
            for (let handler of specificHandlers) {
                handler(data);
            }
        }
        let genericHandlers = this._handlersFor(EVERYTHING);
        for (let handler of genericHandlers) {
            handler(data);
        }
    }

    /**
     * @param {string|null} [type]
     * @param {Function} handler
     * @return {RtSubscription}
     */
    listen(type, handler) {
        if (this._closed) {
            throw new Error("RtSubscription already closed.");
        }

        if (!handler) {
            // noinspection JSValidateTypes
            handler = type;
            type = null;
        }

        type = type || EVERYTHING;
        this._handlers[type] = this._handlers[type] || [];
        this._handlers[type].push(handler);
        return this;
    }

    unsubscribe() {
        if (this._closed) {
            throw new Error("RtSubscription already closed.");
        }

        this._rtApi.unsubscribe(this);
        this._closed = true;
        this._handlers = null;
        this.connectionLost = null;
        this.connectionReestablished = null;
    }
}

export default class RtApi {
    constructor(url, messageTimeout = 10000) {
        this._url = url;
        this._subscriptions = {};
        this._requests = {};
        this._nextId = 1;
        this._connectionHandlers = new Handlers();
        this._reconnecting = false;
        this._reconnectionAttempts = 0;
        this._messageTimeout = messageTimeout;
        this._statusUpdate = new Handlers();

        /**
         * @type {WebSocket|null}
         * @private
         */
        this._socket = null;
    }

    /**
     * @param {Guid} channelGuid
     * @return {Promise<RtSubscription>}
     */
    subscribe(channelGuid) {
        let sub = new RtSubscription(this, channelGuid);
        let subs = this._subscriptions[channelGuid];
        if (!subs) {
            subs = [];
            this._subscriptions[channelGuid] = subs;
        }
        subs.push(sub);

        return this.send({subscribe: [channelGuid]})
            .then(() => {
                return sub;
            });
    }

    /**
     * @param {RtSubscription} subscription
     */
    unsubscribe(subscription) {
        let guid = subscription.channelGuid;
        let subs = this._subscriptions[guid];
        if (subs) {
            let count = 0;
            let index = -1;
            for (let i = 0; i < subs.length; i++) {
                let sub = subs[i];
                if (sub === subscription) {
                    index = i;
                } else {
                    count++;
                }
            }
            if (index !== -1) {
                subs.splice(index, 1);
            }
            if (count === 0) {
                this.send({unsubscribe: [guid]});
                delete this._subscriptions[guid];
            }
        }
    }

    /**
     * @param {*} data
     * @return {Promise<*>}
     */
    send(data) {
        return this._getSocket()
            .then(() => new Promise((resolve, reject) => {
                let id = this._nextId++;
                data.requestId = id;
                let json = JSON.stringify(data);
                this._socket.send(json);
                let timer = setTimeout(() => {
                    delete this._requests[id];
                    reject(new Error("Response Timeout (" + id + ")"));
                }, this._messageTimeout);
                this._requests[id] = function (data) {
                    clearTimeout(timer);
                    if (data.status === 'SUCCESS') {
                        resolve(data);
                    }
                    return reject(new Error("Response Error: " + JSON.stringify(data)));
                };
            }));
    }

    /**
     * @param {function} callback
     */
    onStatusUpdate(callback) {
        this._statusUpdate.listen(callback);
    }

    /**
     * @returns {number}
     * @private
     */
    _retryRate() {
        let a = this._reconnectionAttempts;
        if (a <= 1) {
            // Attempt 1: Try reconnecting immediately
            return 0;
        } else if (a <= 5) {
            // Attempts 2-5: Try once a second
            return 1000;
        } else if (a <= 15) {
            // Attempts 6-15: Try once every five seconds
            return 5000;
        } else {
            // Attempts 16-Infinity: Try once every ten seconds
            return 10000;
        }
    }

    /**
     * @private
     */
    _reconnect() {
        if (!this._reconnecting) {
            this._reconnecting = true;
            this._reconnectionAttempts = 0;
            this._socket = null;
            this._everySub(sub =>
                sub.connectionLost.invoke()
            );
            this._connectionHandlers.listen(() => {
                console.log("The WebSocket connection was reestablished.");
                this._statusUpdate.invoke(true);
                this._everySub(sub =>
                    sub.connectionReestablished.invoke()
                );
            });
            this._everyChannel(channelGuid =>
                this.send({subscribe: [channelGuid]})
            );
        }

        this._reconnectionAttempts++;
        let delay = this._retryRate();
        setTimeout(() => this._getSocket(), delay)
    }

    /**
     * @param {WebSocket} socket
     * @private
     */
    _socketClosed(socket) {
        if (socket === this._socket) {
            console.error("The WebSocket was closed. Will attempt to reconnect.");
            this._statusUpdate.invoke(false);
            this._reconnect();
        }
    }

    /**
     * @param {WebSocket} socket
     * @private
     */
    _socketError(socket) {
        socket.close();

        if (socket === this._socket) {
            console.error("A WebSocket error occurred. Will attempt to reconnect.");
            this._statusUpdate.invoke(false);
            this._reconnect();
        }
    }

    /**
     * @param {WebSocket} socket
     * @param {string} json
     * @private
     */
    _socketMessage(socket, json) {
        if (socket !== this._socket) {
            socket.close();
            return;
        }

        let data = JSON.parse(json);

        let id = data.requestId;
        if (id) {
            let handler = this._requests[id];
            if (handler) {
                delete this._requests[id];
                handler(data);
            }
            return;
        }

        let channel = data.channel;
        if (channel) {
            let subs = this._subscriptions[channel] || [];
            for (let sub of subs) {
                sub.process(data);
            }
        }
    }

    /**
     * @param {Function} callback
     * @private
     */
    _everyChannel(callback) {
        for (let channelGuid in this._subscriptions) {
            if (this._subscriptions.hasOwnProperty(channelGuid)) {
                callback(channelGuid);
            }
        }
    }

    /**
     * @param {Function} callback
     * @private
     */
    _everySub(callback) {
        this._everyChannel(channelGuid => {
            let subscriptions = this._subscriptions[channelGuid] || [];
            for (let sub of subscriptions) {
                callback(sub);
            }
        });
    }

    /**
     * @returns {Promise<WebSocket>}
     * @private
     */
    _getSocket() {
        return new Promise(resolve => {
            let socket = this._socket;

            if (socket) {
                let state = socket.readyState;
                switch (state) {
                    case WebSocket.CONNECTING:
                        this._connectionHandlers.listen(() => resolve(socket));
                        return;
                    case WebSocket.OPEN:
                        resolve(socket);
                        return;
                    case WebSocket.CLOSING:
                    case WebSocket.CLOSED:
                        // Fall through
                        break;
                    default:
                        throw new Error("Unknown readyState: " + state);
                }
            }

            let s = this._socket = new WebSocket(this._url);
            s.onopen = () => {
                s.onopen = null;
                this._reconnecting = false;
                this._reconnectionAttempts = 0;
                this._connectionHandlers.invoke().clear();
                resolve(s);
            };
            s.onmessage = e => this._socketMessage(s, e.data);
            s.onerror = () => this._socketError(s);
            s.onclose = () => this._socketClosed(s);
        })
    }
}