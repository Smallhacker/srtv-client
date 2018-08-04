import {Contextual} from "../context";
import {coerceToNumber} from "../utils";

export default class LiveRace extends Contextual {
    /**
     * @param {Context} parentContext
     * @param {RaceDataWithEntries} raceData
     * @param {CategoryData} categoryData
     * @param {RtSubscription} sub
     * @param {HydraApi} api
     */
    constructor(parentContext, raceData, categoryData, sub, api) {
        super(parentContext);

        /**
         * @type {RaceDataWithEntries}
         * @private
         */
        this._raceData = raceData;

        this._categoryData = categoryData;

        this._onStarting = this.context.handlers();
        this._onStarted = this.context.handlers();
        this._onEnded = this.context.handlers();
        this._onCanceled = this.context.handlers();
        this._onStatusChange = this.context.handlers();
        this._suppressStarted = false;

        /**
         * @type {HydraApi}
         * @private
         */

        this._api = api;

        this.context.onDestroy(() => sub.unsubscribe());

        sub.listen('RACE_UPDATE', data => {
            let status = data && data.message && data.message.status;
            switch (status) {
                case '10SEC':
                    this._suppressStarted = true;
                    this.context.timeout(10000, () => {
                        if (!this._raceData.started) {
                            this._raceData.started = data.message.stamp + 10;
                        }
                        this._onStarted.invokeAndDestroy(data);
                        this._onStatusChange.invoke(data);
                    });
                    this._onStarting.invokeAndDestroy(data);
                    break;
                case 'STARTED':
                    this._raceData.started = data.message.stamp;
                    if (this._suppressStarted) {
                        this._onStarted.invokeAndDestroy(data);
                        this._onStatusChange.invoke(data);
                    }
                    break;
                case 'ENDED':
                    this._raceData.ended = data.message.stamp;
                    this._onEnded.invokeAndDestroy(data);
                    this._onStatusChange.invoke(data);
                    break;
                case 'CANCELED':
                    this._raceData.canceled = data.message.stamp;
                    this._onCanceled.invokeAndDestroy(data);
                    this._onStatusChange.invoke(data);
                    break;
            }
        });
    }

    /**
     * @returns {RaceStatus}
     */
    get status() {
        return RaceStatus.getStatus(this._raceData);
    }

    /**
     * @returns {boolean}
     */
    get isStarted() {
        return !!this._raceData.started;
    }

    /**
     * @returns {boolean}
     */
    get isEnded() {
        return !!this._raceData.ended;
    }

    /**
     * @returns {boolean}
     */
    get isCanceled() {
        return !!this._raceData.canceled;
    }

    /**
     * @returns {number|null}
     */
    get finalDuration() {
        let started = this._raceData.started;
        let ended = this._raceData.ended;
        if (started && ended) {
            return ended - started;
        }
        return null;
    }

    get entries() {
        // TODO: Auto-update this data and fire "onEntryChange" whenever any entry changes in any way
        return this._raceData.entries;
    }

    /**
     * @param {function} handler
     * @returns {LiveRace}
     */
    onStarting(handler) {
        this._onStarting.listen(handler);
        return this;
    }

    /**
     * @param {function} handler
     * @returns {LiveRace}
     */
    onStarted(handler) {
        this._onStarted.listen(handler);
        return this;
    }

    /**
     * @param {function} handler
     * @returns {LiveRace}
     */
    onEnded(handler) {
        this._onEnded.listen(handler);
        return this;
    }

    /**
     * @param {function} handler
     * @returns {LiveRace}
     */
    onCanceled(handler) {
        this._onCanceled.listen(handler);
        return this;
    }

    /**
     * @param {function} handler
     * @returns {LiveRace}
     */
    onStatusChange(handler) {
        this._onStatusChange.listen(handler);
        return this;
    }

    /**
     * @returns {RaceBlurb}
     */
    get blurb() {
        return {
            guid: this._raceData.guid,
            name: this._raceData.name
        };
    }

    /**
     * @returns {number}
     */
    get startupOffset() {
        return coerceToNumber(this._categoryData.startup.offset, 0);
    }

    /**
     * @returns {Stamp}
     */
    get serverStarted() {
        return this._raceData.started || 0;
    }

    /**
     * @returns {Promise<ClientStamp>}
     */
    getApproximateStarted() {
        let serverStamp = this._raceData.started;
        if (!serverStamp) {
            return Promise.resolve(0);
        }
        return this._api.convertServerTimeToApproximateClientTime(serverStamp);
    }

    /**
     * @param {Context} parentContext
     * @param {HydraApi} api
     * @param {Guid} raceGuid
     * @returns {Promise<LiveRace>}
     */
    static load(parentContext, api, raceGuid) {
        return api.getRaceWithEntries(raceGuid)
            .then(raceData => {
                return Promise.all([
                    api.getCategory(raceData.category.guid),
                    api.getRealTimeApi()
                        .subscribe(raceData.announcements)
                ]).then(([categoryData, sub]) => {
                    return new LiveRace(parentContext, raceData, categoryData, sub, api)
                });
            });
    }
}

export class RaceStatus {
    /**
     * @param {string} label
     */
    constructor(label) {
        /**
         * @type {string}
         */
        this.label = label;
    }

    /**
     * @param {RaceData} race
     * @returns {RaceStatus}
     */
    static getStatus(race) {
        if (race.canceled) {
            return RaceStatus.CANCELED;
        }
        if (race.recorded) {
            return RaceStatus.RECORDED;
        }
        if (race.ended) {
            return RaceStatus.ENDED;
        }
        if (race.started) {
            return RaceStatus.STARTED;
        }
        if (race.scheduledStart) {
            return RaceStatus.SCHEDULED;
        }
        return RaceStatus.UPCOMING;
    }
}

RaceStatus.UPCOMING = new RaceStatus("Upcoming");
RaceStatus.SCHEDULED = new RaceStatus("Scheduled");
RaceStatus.STARTED = new RaceStatus("Started");
RaceStatus.ENDED = new RaceStatus("Ended");
RaceStatus.CANCELED = new RaceStatus("Canceled");
RaceStatus.RECORDED = new RaceStatus("Recorded");