'use strict';

import {Handlers, oneOf, RunningAverage} from "../utils";
import {HydraVideo} from "../video";
import RtApi from "./rtApi";
import UserRole from "./userRole";

const LOGIN_TOKEN_KEY = 'srtv/user/loginToken';


const debug = (method, url) => {
    //if (window.HydraDebug) {
    //    window.HydraDebug.apiCall(method, url)
    //}
};

export default class HydraApi {
    constructor(baseUrl, rtUrl) {
        this._baseUrl = baseUrl;
        this._rtApi = new RtApi(rtUrl);
        this._onLogIn = new Handlers();
        this._onLogOut = new Handlers();

        this._loginToken = null;

        this._subscriptions = [];
        this._currentUser = null;

        this._timeOffset = new RunningAverage(10, 0);

        // Measure time offset once every 10 seconds for the first minute, then lower it to once per minute
        this.updateTimeOffset();
        let initialTimer = setInterval(() => this.updateTimeOffset(), 10000);
        setTimeout(() => {
            clearInterval(initialTimer);
            setInterval(() => this.updateTimeOffset(), 60000);
        }, 60000);
    }

    _ajaxError(reject, url) {
        return function (x, textStatus, errorThrown) {
            let message = "AJAX call failed. URL: \"" + url + "\" Result: " + JSON.stringify({textStatus, errorThrown});
            reject(new Error(message));
        }
    }

    /**
     * @param {string} url
     * @param {{}} params
     * @return {Promise<*>}
     * @private
     */
    _get(url, params = {}) {
        let fullUrl = this._baseUrl + url;
        let paramArray = [];
        for (let key in params) {
            if (params.hasOwnProperty(key)) {
                let value = params[key];
                paramArray.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
            }
        }
        let paramString = paramArray.join("&");
        if (paramString) {
            fullUrl += '?' + paramString;
        }

        debug('GET', fullUrl);
        return new Promise((resolve, reject) => {
            $.get({
                url: fullUrl,
                dataType: 'json',
                success: data => resolve(data),
                error: this._ajaxError(reject, fullUrl),
                headers: this._headers()
            });
        });
    }

    /**
     * @param {string} url
     * @param {{}} data
     * @return {Promise<*>}
     * @private
     */
    _post(url, data) {
        return new Promise((resolve, reject) => {
            let fullUrl = this._baseUrl + url;
            debug('POST', fullUrl);

            let json = JSON.stringify(data);
            return $.post({
                url: fullUrl,
                data: json,
                contentType: 'application/json',
                dataType: 'json',
                success: data => resolve(data),
                error: this._ajaxError(reject, fullUrl),
                headers: this._headers()
            });
        });
    }

    /**
     * @param {string} url
     * @param {{}} data
     * @return {Promise<*>}
     * @private
     */
    _put(url, data) {
        return new Promise((resolve, reject) => {
            let fullUrl = this._baseUrl + url;

            debug('PUT', fullUrl);

            let json = JSON.stringify(data);
            return $.ajax({
                method: 'PUT',
                url: fullUrl,
                data: json,
                contentType: 'application/json',
                dataType: 'json',
                success: data => resolve(data),
                error: this._ajaxError(reject, fullUrl),
                headers: this._headers()
            });
        });
    }

    _headers() {
        let headers = {};
        if (this._loginToken) {
            headers['Hydra-User'] = this._loginToken;
        }
        return headers;
    }

    /**
     * @param {string} username
     * @param {string} password
     * @param {boolean} persist
     * @return {Promise<UserData>}
     */
    logIn(username, password, persist) {
        if (this._loginToken) {
            this.logOut();
        }

        return this._post('sessions/login', {username, password})
            .then(response => {
                this._loginToken = response.token;
                if (persist) {
                    try {
                        localStorage.setItem(LOGIN_TOKEN_KEY, this._loginToken);
                    } catch (e) {
                        // Failed to persist token, for instance due to being in private mode or localStorage being full
                        // Either way, let's just silently ignore it.
                    }
                }

                this._setUserData(response.user);
                this._onLogIn.invoke(response.user);
                return response.user;
            });
    }

    /**
     * @return {Promise<UserData|boolean>}
     */
    autoLogIn() {
        let token = localStorage.getItem(LOGIN_TOKEN_KEY);
        if (!token) {
            return Promise.resolve(false);
        }

        this._loginToken = token;
        return this.getCurrentUser()
            .then(user => {
                if (user.guid) {
                    this._setUserData(user);
                    this._onLogIn.invoke(user);
                    return user;
                }

                this._loginToken = null;
                localStorage.removeItem(LOGIN_TOKEN_KEY);
                return false;
            });
    }

    _setUserData(user) {
        this._currentUser = {
            name: user.name,
            guid: user.guid,
            slug: user.slug || null
        }
    }

    get isLoggedIn() {
        return !!this.currentUserGuid;
    }

    get currentUserGuid() {
        return this._currentUser && this._currentUser.guid;
    }

    get currentUserName() {
        return this._currentUser && this._currentUser.name;
    }

    get currentUserSlug() {
        return this._currentUser && this._currentUser.slug;
    }

    logOut() {
        if (!this._loginToken) {
            return Promise.reject();
        }

        localStorage.removeItem(LOGIN_TOKEN_KEY);
        this._loginToken = null;
        this._currentUser = null;
        this._onLogOut.invoke();
        return Promise.resolve();
    }

    updateTimeOffset() {
        let beforeTimestamp = this.getClientTime();
        this._get('time')
            .then(/**@type {TimeData}*/response => {
                let afterTimestamp = this.getClientTime();
                let averageTimestamp = (beforeTimestamp + afterTimestamp) / 2;
                let offset = response.stamp - (averageTimestamp);

                this._timeOffset.add(offset);
            })
            .catch(() => {
                // Ignore since we hopefully have other data points
            });
    }

    /**
     * @return {number}
     */
    getTimeOffset() {
        return this._timeOffset.value;
    }

    /**
     * @return {ClientStamp}
     */
    getClientTime() {
        return new Date() / 1000;
    }

    /**
     * @return {Stamp}
     */
    getApproximateServerTime() {
        let clientTime = this.getClientTime();
        return this.clientTimeToApproximateServerTime(clientTime);
    }

    /**
     * @param {ClientStamp} clientTime
     * @returns {Stamp}
     */
    clientTimeToApproximateServerTime(clientTime) {
        return clientTime + this.getTimeOffset();
    }

    /**
     * @param {GuidOrSlug} guidOrSlug
     * @return {Promise<GameData>}
     */
    getGame(guidOrSlug) {
        return this._get('games/' + guidOrSlug);
    }

    /**
     * @param {number} page
     * @param {?string} name
     * @return {Promise<GameSearch>}
     */
    getGames(page = 0, name = null) {
        let params = {page};
        if (name) {
            params.name = name;
        }
        return this._get('games', params);
    }

    /**
     * @param {string} name
     * @returns {Promise<GameData|null>}
     */
    findGame(name) {
        return this._find(p => this.getGames(p, name), game => game.name === name);
    }

    /**
     * @param {function(number):Promise<SearchResult>} pageGetter
     * @param {function(*):boolean} condition
     * @param {number} startingPage
     * @returns {Promise<*|null>}
     * @private
     */
    _find(pageGetter, condition, startingPage = 0) {
        return pageGetter(startingPage)
            .then(p => {
                for (let result of p.results) {
                    if (condition(result)) {
                        return Promise.resolve(result);
                    }
                }

                // Okay, it's late and I'm tired, so this condition isn't 100% optimized. This will technically make an
                // extra, unnecessary call in the event that 1) the thing doesn't exist, and 2) the amount of matches
                // is a multiple of the results per page.

                if (p.results.length < p.resultsPerPage) {
                    return Promise.resolve(null);
                }

                return this._find(pageGetter, condition, startingPage + 1);
            })
    }

    /**
     * @param {Guid} guid
     * @param {?Stamp} afterTime
     * @return {Promise<ChatData>}
     */
    getChat(guid, afterTime = null) {
        let params = {};

        if (afterTime !== null) {
            params['after'] = afterTime;
        }

        return this._get('chats/' + guid, params);
    }

    /**
     * @param {Guid} guid
     * @param {string} message
     * @return {Promise<CreatedMessage>}
     */
    sendChatMessage(guid, message) {
        return this._post('chats/' + guid + '/message', {message});
    }

    /**
     * @param {GuidOrSlug} guidOrSlug
     * @return {Promise<jQuery>}
     */
    getGameImage(guidOrSlug) {
        return new Promise((resolve, reject) => {
            let img = new Image;
            img.onload = function () {
                resolve($(img));
            };
            img.onerror = function (e) {
                reject(e);
            };
            img.src = this.getGameImageUrl(guidOrSlug);
        });
    }

    /**
     * @param {GuidOrSlug} guidOrSlug
     * @return {String}
     */
    getGameImageUrl(guidOrSlug) {
        return this._baseUrl + 'games/' + guidOrSlug + '/image';
    }

    /**
     * @param {GuidOrSlug} guidOrSlug
     * @returns {Promise<UserRole>}
     */
    getGameRole(guidOrSlug) {
        return this._get('games/' + guidOrSlug + '/role')
            .then(role => UserRole.parse(role.role));
    }

    /**
     * @param {GuidOrSlug} guidOrSlug
     * @returns {Promise<GameRoles>}
     */
    getGameRoles(guidOrSlug) {
        return this._get('games/' + guidOrSlug + '/roles');
    }

    /**
     * @param {GuidOrSlug} guidOrSlug
     * @param {GameData} gameData
     * @return {Promise}
     */
    editGame(guidOrSlug, gameData) {
        return this._put('games/' + guidOrSlug, gameData);
    }

    /**
     * @param {GameData} gameData
     * @return {Promise<GameBlurb>}
     */
    createGame(gameData) {
        return this._post('games', gameData);
    }

    /**
     * @param {Guid} guid
     * @return {Promise<RaceDataWithRole>}
     */
    getRace(guid) {
        return Promise.all([
            this._get('races/' + guid),
            this._get('races/' + guid + '/role')
        ])
            .then(([race, roleData]) => {
                let role = roleData.role;
                if (role === 'NORMAL') {
                    let guid = this.currentUserGuid;
                    if (race.owner && race.owner.guid === guid) {
                        role = 'OWNER';
                    } else if (race.gatekeeper && race.gatekeeper.guid === guid) {
                        role = 'GATEKEEPER';
                    }
                }
                race.role = role;
                return race;
            });
    }

    /**
     * @param {Guid} guid
     * @return {Promise<RaceDataWithEntries>}
     */
    getRaceWithEntries(guid) {
        return Promise.all([
            this.getRace(guid),
            this._get('races/' + guid + "/entries")
        ])
            .then(([race, entries]) => {
                race.entries = entries.entries;

                return race;
            });
    }

    /* *
     * @param {Guid} guid
     * @return {Promise<RaceData>}
     */

    /*getRaceWithStreams(guid) {
        return this.getRaceWithEntries(guid)
            .then(race => {
                let playerCalls = race.entries
                    .map(entry => this.getUser(entry.player.guid));

                return Promise.all(playerCalls)
                    .then(players => {
                        for (let i = 0; i < race.entries.length; i++) {
                            race.entries[i].player.twitch = players[i].twitch;
                        }
                        return race;
                    });
            });
    }*/

    /**
     * @param {number} page
     * @param {?Guid} category
     * @param {?Guid} game
     * @param {string[]} filters
     * @return {Promise<RaceSearch>}
     */
    getRaces(page = 0, category = null, game = null, filters = []) {
        let gameSlug = HydraApi.parseSlug(game);
        if (gameSlug) {
            return this.getGame(gameSlug)
                .then(game => this.getRaces(page, null, game.guid));
        }

        let params = {page};
        if (category) {
            params.category = category;
        }
        if (game) {
            params.game = game;
        }
        if (filters && filters.length) {
            params.filter = filters.join(',');
        }

        return this._get('races', params);
    }

    /**
     * @param {Guid} entryGuid
     * @returns {Promise<EntryData>}
     */
    getEntry(entryGuid) {
        return this._get("entries/" + entryGuid);
    };

    /**
     * @param {Guid} entryGuid
     * @returns {Promise<EntryData>}
     */
    getEntryWithRace(entryGuid) {
        return this.getEntry(entryGuid)
            .then(entry => {
                return this.getRace(entry.race.guid)
                    .then(race => {
                        entry.race = race;
                        return entry;
                    });
            });
    };

    /**
     * @param {Guid} guid
     * @return {Promise<CategoryData>}
     */
    getCategory(guid) {
        return this._get('categories/' + guid);
    }

    /**
     * @param {Guid} guid
     * @return {Promise<CategoryRanksData>}
     */
    getCategoryRanks(guid) {
        return this._get('categories/' + guid + '/ranks');
    }

    /**
     * @param {Guid} guid
     * @return {Promise<UserRole>}
     */
    getCategoryRole(guid) {
        return this._get('categories/' + guid + '/role')
            .then(role => UserRole.parse(role.role));
    }

    /**
     * @param {Guid} guid
     * @returns {Promise<CategoryRoles>}
     */
    getCategoryRoles(guid) {
        return this._get('categories/' + guid + '/roles');
    }

    /**
     * @param {GuidOrSlug} guidOrSlug
     * @param {CategoryData} categoryData
     * @return {Promise}
     */
    editCategory(guidOrSlug, categoryData) {
        return this._put('categories/' + guidOrSlug, categoryData);
    }

    /**
     * @param {CategoryData} categoryData
     * @return {Promise<GuidObject>}
     */
    createCategory(categoryData) {
        return this._post('categories', categoryData);
    }

    /**
     * @param {GuidOrSlug} guidOrSlug
     * @return {Promise<UserData>}
     */
    getUser(guidOrSlug) {
        return this._get('users/' + guidOrSlug);
    }

    /**
     * @return {Promise<UserData>}
     */
    getCurrentUser() {
        return this._get('sessions/user');
    }

    /**
     * @param {*} userData
     * @returns {Promise}
     */
    editCurrentUser(userData) {
        return this._put('users/' + this.currentUserGuid, userData);
    }

    onLogIn(callback) {
        this._onLogIn.listen(callback);
    }

    onLogOut(callback) {
        this._onLogOut.listen(callback);
    }

    /**
     * @param {Guid} userGuid
     * @returns {HydraVideo}
     */
    getUserVideo(userGuid) {
        let video = new HydraVideo(this);
        video.userChannel(userGuid);
        return video;
    }

    /**
     * @param {{}} raceData
     * @returns {Promise<RaceData>}
     */
    createRace(raceData) {
        return this._post('races', raceData);
    }

    signupFrame(cssFile, redirectUrl) {
        return $('<iframe>')
            .attr('src', this._baseUrl + 'signup?style=' + encodeURIComponent(cssFile) + '&redirect=' + encodeURIComponent(redirectUrl));
    }

    /**
     * @returns {Promise<StreamData>}
     */
    getHomePageStream() {
        return this._get('streams')
            .then(streams => this.pickStream(streams));
    }

    /**
     * @param {Guid} raceGuid
     * @returns {Promise<StreamList>}
     */
    getRaceStreams(raceGuid) {
        return this._get('races/' + raceGuid + '/streams');
    }

    /**
     * @returns {RtApi}
     */
    getRealTimeApi() {
        return this._rtApi;
    }

    /**
     * @param {StreamList} streams
     * @returns {StreamData|null}
     */
    pickStream(streams) {
        let stream = this._pickStreamFrom(streams.official)
            || this._pickStreamFrom(streams.followed)
            || this._pickStreamFrom(streams.runner)
            || this._pickStreamFrom(streams.fallback);

        if (!stream) {
            return null;
        }

        if (stream.player.twitch === null) {
            return null;
        }

        stream.video = new HydraVideo(this);
        stream.video.channel(stream.player.twitch, stream.player.guid || null);

        return stream;
    }

    /**
     * @param {StreamData[]} streams
     * @returns {StreamData|null}
     * @private
     */
    _pickStreamFrom(streams) {
        if (!streams) {
            return null;
        }

        streams = streams
            .filter(stream => stream.guid !== this.currentUserGuid)
            .filter(stream => stream.lastSampleStatus === 'STREAM_UP');

        if (streams.length) {
            // TODO: Even fancier heuristic
            return oneOf(...streams);
        }

        return null;
    }

    /**
     * @param {Guid} raceGuid
     * @returns {Promise<EntryBlurb>}
     */
    joinRace(raceGuid) {
        return this._post("entries", {
            race: raceGuid
        });
    }

    /**
     * @param {Guid} entryGuid
     * @param {string} status
     * @returns {Promise}
     */
    setEntryStatus(entryGuid, status) {
        return this._put("entries/" + entryGuid, {status});
    }

    /**
     * @param {Guid} raceGuid
     * @param {ClientStamp} stamp
     * @return {Promise}
     */
    startRaceAt(raceGuid, stamp) {
        return this._put('races/' + raceGuid + '/gate', {
            stampType: 'ABSOLUTE',
            stamp: Math.floor(stamp)
        });
    }

    /**
     * @param {Guid} raceGuid
     * @param {number} seconds
     * @return {Promise}
     */
    startRaceIn(raceGuid, seconds) {
        return this._put('races/' + raceGuid + '/gate', {
            stampType: 'RELATIVE',
            stamp: seconds
        });
    }

    /**
     * @param {Guid} raceGuid
     * @return {Promise}
     */
    cancelRace(raceGuid) {
        return this._put('races/' + raceGuid + '/cancel', {});
    }

    /**
     * @param {Guid} entryGuid
     * @param {string} comment
     * @returns {Promise}
     */
    setRaceComment(entryGuid, comment) {
        return this._put('entries/' + entryGuid, {comment});
    }

    /**
     * @param {Guid} flagGuid
     * @returns {Promise<FlagData>}
     */
    getFlag(flagGuid) {
        return this._get('flags/' + flagGuid);
    }

    /**
     * @param {Guid} categoryGuid
     * @returns {Promise<FlagData[]>}
     */
    getCategoryFlags(categoryGuid) {
        return this._get('categories/' + categoryGuid + '/modQueue');
    }

    /**
     * @returns {Promise<FlagData[]>}
     */
    getAllowedFlags() {
        throw new Error("No API support for getting all flags.");
    }

    /**
     * @param {string} query
     * @returns {Promise<UserBlurb[]>}
     */
    searchUser(query) {
        return this._get('users', {name: query});
    }

    /**
     * @param {string} userName
     * @returns {Promise<UserBlurb|null>}
     */
    findUser(userName) {
        userName = userName.toLowerCase().trim();
        return this.searchUser(userName)
            .then(users => users
                .filter(
                    user => user.name.toLowerCase() === userName
                )[0] || null
            );
    }

    /**
     * @param {Guid} raceGuid
     * @param {string} comment
     * @param {string} type
     * @param {Guid|null} entryGuid
     * @returns {Promise}
     */
    reportFlag(raceGuid, comment, type, entryGuid = null) {
        let flag = {comment, type};
        if (entryGuid) {
            flag.entry = entryGuid;
        }
        return this._post('flags/' + raceGuid, flag);
    }

    /**
     * @param {Guid} flagGuid
     * @param {Guid|null} assigneeGuid
     * @param {string|null} type
     * @param {boolean|null} resolve
     * @returns {Promise}
     */
    updateFlag(flagGuid, assigneeGuid = null, type = null, resolve = null) {
        let changes = {};
        if (assigneeGuid !== null) {
            changes.assignee = assigneeGuid;
        }
        if (type !== null) {
            changes.type = type;
        }
        if (resolve !== null) {
            changes.resolved = resolve;
        }

        return this._put('flags/' + flagGuid, changes);
    }

    /**
     * @return {Promise<UserRole>}
     */
    getGlobalRole() {
        return this._get('global/role')
            .then(role => UserRole.parse(role.role));
    }

    /**
     * @returns {Promise<RolesList>}
     */
    getGlobalRoles() {
        return this._get('global/roles');
    }

    /**
     * @returns {Promise<number>}
     */
    fetchApproximateServerOffset() {
        let beforeTimestamp = this.getClientTime();
        return this._get('time')
            .then(/**@type {TimeData}*/response => {
                let afterTimestamp = this.getClientTime();
                let averageTimestamp = (beforeTimestamp + afterTimestamp) / 2;
                return response.stamp - (averageTimestamp);
            });
    }

    /**
     * @returns {Promise<Stamp>}
     */
    fetchApproximateServerTime() {
        return this.fetchApproximateServerOffset()
            .then(offset => offset + this.getClientTime());
    }

    /**
     * @param {Stamp} serverStamp
     * @returns {Promise<ClientStamp>}
     */
    convertServerTimeToApproximateClientTime(serverStamp) {
        return this.fetchApproximateServerOffset()
            .then(offset => serverStamp - offset);
    }

    /**
     * @param {ClientStamp} clientStamp
     * @returns {Promise<Stamp>}
     */
    convertClientTimeToApproximateServerTime(clientStamp) {
        return this.fetchApproximateServerOffset()
            .then(offset => clientStamp + offset);
    }

    /**
     * @param {Guid} gameGuid
     * @param {Guid} userGuid
     * @param {string} role
     * @returns {Promise}
     */
    setGameRole(gameGuid, userGuid, role) {
        return this._put('games/' + gameGuid + '/roles', [
            {user: userGuid, role: role}
        ]);
    }

    /**
     * @param {Guid} categoryGuid
     * @param {Guid} userGuid
     * @param {string} role
     * @returns {Promise}
     */
    setCategoryRole(categoryGuid, userGuid, role) {
        return this._put('categories/' + categoryGuid + '/roles', [
            {user: userGuid, role: role}
        ]);
    }

    /**
     * @returns {Promise<jQuery>}
     */
    getRules() {
        return this._get('rules')
            .then(rules => $.parseHTML(rules.body));
    }

    /**
     * @param {(string|null)} guid
     * @returns {(Guid|null)}
     */
    static parseGuid(guid) {
        if (guid) {
            guid = guid.toLowerCase();
            if (guid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
                return guid;
            }
        }
        return null;
    }

    /**
     * @param {(string|null)} slug
     * @returns {(Slug|null)}
     */
    static parseSlug(slug) {
        if (slug && slug.match(/^[0-9a-z_]+$/)) {
            return slug;
        }
        return null;
    }
}