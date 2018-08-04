'use strict';
import {PanelWidget} from "./widget";
import {Matrix} from "../bootstrap";
import {formatDuration, isFunction} from "../utils";

const ENTRY_GROUPS = {
    'DONE': {order: 0, statusText: "Done", showPlace: true},
    'READY': {order: 1, statusText: s => s ? "Racing" : "Ready", hideTime: true},
    'JOINED': {order: 2, statusText: "Joined", hideTime: true},
    'DNF': {order: 4, statusText: "DNF"},
    'DQ': {order: 5, statusText: "DQ"},
    'DROPPED': {order: 4, hide: true},
    'REMOVED': {order: 4, hide: true},
    '': {order: 1, hideTime: true}
};

function shortenName(s) {
    /*
     * Heuristic:
     * We allow up to 18 characters in a name.
     * Upper case characters are typically wider,
     * so they cost slightly more.
     */

    const LIMIT = 18;
    const UPPER_CASE = 1.25;
    const LOWER_CASE = 1;

    let sum = 0;
    for (let i = 0; i < s.length; i++) {
        let c = s.charAt(i);
        if (c === c.toUpperCase()) {
            sum += UPPER_CASE;
        } else {
            sum += LOWER_CASE;
        }
        if (sum >= LIMIT) {
            return s.substring(0, i - 1) + "…";
        }
    }

    return s;
}

export default class EntriesWidget extends PanelWidget {
    /**
     * @param {System} system
     * @param {Context} parentContext
     * @param {HydraVideo} video
     * @param {LiveRace} liveRace
     * @param {StreamList} streams
     * @param {FlagModal|null} modal
     */
    constructor(system, parentContext, video, liveRace, streams, modal) {
        super(system, parentContext, "Runners");

        this._liveRace = liveRace;
        this._video = video;

        this._streamMap = {};
        for (let runnerStream of streams.runner) {
            let player = runnerStream.player;
            this._streamMap[player.guid] = player.twitch;
        }

        this._modal = modal;
    }

    /**
     * @param panel
     * @param {Rendering} rendering
     * @private
     */
    _panel(panel, rendering) {
        let matrix = new Matrix()
            .col("Placement")
            .col("Runner")
            .col("Time")
            .col("Watch");

        if (this._modal !== null) {
            matrix.col("Flag");
        }


        let entryId = 0;
        let prevStamp = -Infinity;
        let prevPlace = 0;
        let nextPlace = 1;
        let started = this._liveRace.isStarted;
        let entries = this._liveRace.entries
            .map(entry => {
                let group = ENTRY_GROUPS[entry.status] || ENTRY_GROUPS[''];

                return $.extend({}, entry, group, {
                    order: [group.order, entry.stamp, entryId++]
                });
            })
            .filter(entry => !entry.hide)
            .sort((a, b) => {
                for (let i = 0; i < a.order.length; i++) {
                    let c = a.order[i] - b.order[i];
                    if (c !== 0) {
                        return c;
                    }
                }
                return 0;
            })
            .map(entry => {
                if (entry.showPlace) {
                    if (entry.stamp === prevStamp) {
                        entry.place = prevPlace;
                    } else {
                        entry.place = nextPlace;
                        prevPlace = nextPlace;
                    }
                    nextPlace++;
                } else {
                    if (entry.statusText) {
                        if (isFunction(entry.statusText)) {
                            entry.place = entry.statusText(started);
                        } else {
                            entry.place = entry.statusText;
                        }
                    } else {
                        entry.place = entry.status;
                    }
                }

                if (entry.hideTime || !this._liveRace.isStarted) {
                    entry.time = "--:--:--";
                } else {
                    let duration = entry.stamp - this._liveRace.serverStarted + this._liveRace.startupOffset;
                    entry.time = formatDuration(duration, true);
                }

                return entry;
            });

        for (let entry of entries) {
            let player = entry.player;
            let twitchHandle = this._streamMap[player.guid];

            let watch = "";
            if (twitchHandle && this._video) {
                watch = this._video.remote.button(twitchHandle, player.guid);
            }

            let name = player.name;
            let shortName = shortenName(name);
            let tooltip = null;

            if (name !== shortName) {
                tooltip = name;
            }

            let playerLink = this.system.link(shortName, 'users', player.slug || player.guid);

            if (tooltip) {
                playerLink.attr('title', tooltip);
            }

            matrix.row(entry.place, playerLink, entry.time, watch);
            if (this._modal !== null) {
                matrix.cell(this._modal.entryButton('flag-o', null, this._liveRace.blurb, entry));
            }
        }

        return panel.body().append(matrix.toTable());
    }
}