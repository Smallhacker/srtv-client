'use strict';

import Page from '../page.js';
import {panel} from '../bootstrap.js';
import {formGroup} from "../bootstrap";
import {formatDuration, textNode, timerSpan} from "../utils";
import PageService from "../pageService";

const TYPES = [
    {id: 'all', label: "All Races", flags: []},
    {id: 'upcoming', label: "Upcoming Races", flags: ['SCHEDULED', 'CREATED'], default: true},
    {id: 'ongoing', label: "Ongoing Races", flags: ['STARTED', 'POSTJOIN']},
    {id: 'finished', label: "Finished Races", flags: ['ENDED', 'RECORDED']},
    {id: 'canceled', label: "Canceled Races", flags: ['CANCELED']},
];

const TYPE_MAP = Object.create(null);
for (let type of TYPES) {
    TYPE_MAP[type.id] = type;
}
const DEFAULT_TYPE_ID = TYPES.filter(type => type.default).map(type => type.id)[0] || null;


Page.register(
    class RacesPage extends Page {
        get urlPattern() {
            return [
                'races',
                'races/type/text:type',
                'games/guid:gameGuid/races',
                'games/guid:gameGuid/races/type/text:type',
                'games/slug:gameSlug/races',
                'games/slug:gameSlug/races/type/text:type',
                'categories/guid:categoryGuid/races',
                'categories/guid:categoryGuid/races/type/text:type',
            ];
        }

        /**
         * @param {RaceData} race
         * @private
         */
        _getRaceTime(race) {
            if (!race.canceled) {
                if (race.started) {
                    if (race.ended) {
                        return {
                            start: race.started,
                            end: race.ended
                        };
                    }

                    return {
                        start: race.started,
                        end: race.ended
                    };
                }
            }

            return {hide: true};
        }

        _init() {
            this._pageService = new PageService(
                this.system,
                (p, n) => this.api.getRaces(p, this.arg('categoryGuid'), this.arg('gameGuid') || this.arg('gameSlug'), n && n.filters),
                [["", "game-thumbnail-column"], ["Race"], ["Game"], ["Category"], ["Status"], ["Runners"], ["Time"]],
                raceSummary => {
                    let imgUrl = this.api.getGameImageUrl(raceSummary.game.guid);
                    let img = $('<img>').attr('src', imgUrl).addClass('search-thumbnail');

                    return this.api.getRaceWithEntries(raceSummary.guid)
                        .then(race => {
                            let game = race.game;
                            let category = race.category;

                            let time = this._getRaceTime(race);
                            let timer;
                            if (time.hide) {
                                timer = textNode("--:--:--");
                            } else {
                                const SHOW_DAYS = true;
                                if (time.end) {
                                    timer = textNode(formatDuration(time.end - time.start, SHOW_DAYS));
                                } else {
                                    // TODO: This is a temporary memory leak. They're GC'd when you go elsewhere on the
                                    // site, but not when switching between search result pages or applying filters
                                    timer = timerSpan(this.context, race.started || race.scheduledStart, SHOW_DAYS);
                                }
                            }

                            let entryCount = race.entries
                                .map(entry => entry.status)
                                .filter(status => status !== 'DROPPED' && status !== 'REMOVED')
                                .length;

                            return [
                                img,
                                this.system.link(race.name, 'races', race.guid),
                                this.system.link(game.name, 'games', game.slug || game.guid),
                                this.system.link(category.name, 'categories', category.guid),
                                this._describeRace(race),
                                entryCount,
                                timer
                            ];
                        });
                }
            );
        }

        /**
         * @param {RaceData} race
         * @return {string}
         * @private
         */
        _describeRace(race) {
            if (race.canceled) {
                return "Canceled";
            }
            if (race.recorded) {
                return "Recorded";
            }
            if (race.ended) {
                return "Ended";
            }
            if (race.started) {
                return "Running";
            }
            if (race.scheduledStart) {
                return "Scheduled";
            }
            return "Upcoming";
        }

        _search(filters = []) {
            return this._pageService.params({filters});
        }

        render() {
            let pan = panel('primary')
                .title("Races");
            let p = pan.body();

            let form = $('<form class="form-inline">').appendTo(p);

            let filter = $('<select>');

            function option(text, value, selected = false) {
                $('<option>', {text, value})
                    .prop('selected', selected)
                    .appendTo(filter);
            }

            let defaultType = this.arg('type');
            if (!defaultType || !TYPE_MAP[defaultType]) {
                defaultType = DEFAULT_TYPE_ID;
            }

            for (let type of TYPES) {
                option(type.label, type.id, type.id === defaultType);
            }

            formGroup(filter, "Race Filter", null, true).appendTo(form);

            filter.change(() => {
                let type = TYPE_MAP[filter.val()];
                this._search(type.flags);


                let category = this.arg('categoryGuid');
                let game = this.arg('gameGuid') || this.arg('gameSlug');

                let url = [];

                if (game) {
                    url.push("games", game);
                } else if (category) {
                    url.push("categories", category);
                }
                url.push("races", "type", type.id);

                this.system.updateState(this, url);
            });

            this._pageService.node.appendTo(p);

            return this._search(TYPE_MAP[filter.val()].flags)
                .then(() => pan);
        }
    }
);