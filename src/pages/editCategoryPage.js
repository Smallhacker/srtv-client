'use strict';

import Page from '../page.js';
import {panel} from '../bootstrap.js';
import {Form} from "../bootstrap";
import UserRole from "../api/userRole";
import {parseBoolean} from "./createRacePage";

/**
 * @param {CategoryData} category
 * @returns {Array}
 */
function possibleStartupValues(category) {
    let values = [];
    let valueMap = {};

    function addValue(value, label = value) {
        let option = valueMap[value];
        if (!option) {
            option = {value, label};
            values.push(option);
            valueMap[value] = option;
        }
        return option;
    }

    addValue('READY_UP', "Ready Up");
    addValue('SCHEDULED', "Scheduled");
    addValue('GATEKEEPER', "Gatekeeper");

    if (category.startup.default) {
        addValue(category.startup.default);
    }
    for (let option of category.startup.allowed) {
        addValue(option);
    }
    for (let option of category.startup.allowedAlways) {
        addValue(option).lock = true;
    }

    return values;
}

Page.register(
    class EditCategoryPage extends Page {
        get urlPattern() {
            return [
                'games/guid:gameGuid/createCategory',
                'games/slug:gameSlug/createCategory',
                'categories/guid:categoryGuid/edit'
            ];
        }

        /**
         * @param {CategoryData} category
         * @param {GameData} game
         * @param {boolean} newCategory
         * @returns {jQuery}
         * @private
         */
        _showPage(category, game, newCategory = false) {
            const DEFAULT_TRUE = 'defaultTrue';
            const DEFAULT_FALSE = 'defaultFalse';
            const ALWAYS_TRUE = 'alwaysTrue';
            const ALWAYS_FALSE = 'alwaysFalse';

            let allowOptions = [
                {value: DEFAULT_TRUE, label: "Optional (Default to Yes)"},
                {value: DEFAULT_FALSE, label: "Optional (Default to No)"},
                {value: ALWAYS_TRUE, label: "Always"},
                {value: ALWAYS_FALSE, label: "Never"}
            ];

            function fromAllowString(value) {
                const allowMap = {};
                allowMap[DEFAULT_TRUE] = {
                    default: true,
                    locked: false
                };
                allowMap[DEFAULT_FALSE] = {
                    default: false,
                    locked: false
                };
                allowMap[ALWAYS_TRUE] = {
                    default: true,
                    locked: true
                };
                allowMap[ALWAYS_FALSE] = {
                    default: false,
                    locked: true
                };
                return allowMap[value] || null;
            }

            function toAllowString(value) {
                value = value || {};
                if (parseBoolean(value.default)) {
                    return parseBoolean(value.locked) ? ALWAYS_TRUE : DEFAULT_TRUE;
                }
                return parseBoolean(value.locked) ? ALWAYS_FALSE : DEFAULT_FALSE;
            }

            let startupValues = possibleStartupValues(category);

            let p = panel('primary')
                .title("Create Category");

            let form = new Form(8);
            form.node.appendTo(p.body());

            form.text("Game", game.name, {disabled: true});

            let name = form.text("Name", category.name, {
                required: true
            });

            let description = form.textArea("Description", category.description);

            let rules = form.textArea("Rules", category.rules);

            let allowedStartup = form.multiSelect("Allowed Startup Types", startupValues, category.startup.allowed, {});

            let defaultStartup = form.select("Default Startup Type", startupValues, category.startup.default, {});

            let startupOffset = form.duration("Startup Offset", category.startup.offset, null, null, {
                hint: "Initial timer value at race start.",
                required: true
            });

            let volatility = form.decimal("Rating Stability", category.volatility, '0.1', '2', null, {
                hint: "(0.1-2.0) Lower values will cause more chaotic rating fluctuations while higher values will cause ratings to change more slowly.",
                required: true
            });

            let challengePeriod = form.duration("Challenge Period", category.challengePeriod, 30 * 60, 24 * 60 * 60, {
                hint: "(30 minutes-24 hours) Minimum period after race completion where users can flag the race or its runners.",
                required: true
            });

            let streamSamplingInterval = form.duration("Stream Sampling Interval", category.streamSamplingInterval, 5 * 60, 30 * 60, {
                hint: "(5-30 minutes) How frequently the runners' Twitch streaming status will be checked.",
                required: true
            });

            let streamUptimeRequirement = form.decimal("Stream Uptime Requirement", category.streamUptimeRequirement, '0', '1', null, {
                hint: "(0-1) Determines what fraction of the run must be streamed so as not to be auto-flagged.",
                required: true
            });

            let maxLateCutoff = form.duration("Max Late Cutoff", category.lateCutoff.max, 0, null, {
                hint: "Maximum window of time to join a race after it has started.",
                required: true
            });

            let defaultLateCutoff = form.duration("Default Late Cutoff", category.lateCutoff.default, 0, null, {
                hint: "Default window of time to join a race after it has started.",
                required: true
            });

            let maxQuitCutoff = form.duration("Max Quit Cutoff", category.quitCutoff.max, 0, null, {
                hint: "Maximum window of time to quit a race without penalty after it has started.",
                required: true
            });

            let defaultQuitCutoff = form.duration("Default Quit Cutoff", category.quitCutoff.default, 0, null, {
                hint: "Default window of time to quit a race without penalty after it has started.",
                required: true
            });

            let rankedRaces = form.select("Ranked Races", allowOptions, toAllowString(category.rankedRaces));

            let unlistedRaces = form.select("Unlisted Races", allowOptions, toAllowString(category.unlistedRaces));

            let mutedRaces = form.select("Muted Races", allowOptions, toAllowString(category.mutedRaces));

            let streamedRaces = form.select("Streamed Races", allowOptions, toAllowString(category.streamedRaces));

            form.button("Save", true, {
                style: 'success'
            });

            form.onSubmit(() => {
                let data = {
                    game: game.guid,
                    name: name.val(),
                    description: description.val(),
                    rules: rules.val(),
                    volatility: parseFloat(volatility.val()),
                    challengePeriod: parseInt(challengePeriod.val()),
                    streamSamplingInterval: parseInt(streamSamplingInterval.val()),
                    streamUptimeRequirement: parseFloat(streamUptimeRequirement.val()),
                    startup: {
                        default: defaultStartup.val(),
                        allowed: allowedStartup.val(),
                        offset: parseInt(startupOffset.val())
                    },
                    lateCutoff: {
                        default: parseInt(defaultLateCutoff.val()),
                        max: parseInt(maxLateCutoff.val())
                    },
                    quitCutoff: {
                        default: parseInt(defaultQuitCutoff.val()),
                        max: parseInt(maxQuitCutoff.val())
                    },
                    rankedRaces: fromAllowString(rankedRaces.val()),
                    unlistedRaces: fromAllowString(unlistedRaces.val()),
                    mutedRaces: fromAllowString(mutedRaces.val()),
                    streamedRaces: fromAllowString(streamedRaces.val())
                };

                if (newCategory) {
                    return this.api.createCategory(data)
                        .then(guidObject => {
                            this.system.viewPage('categories', [guidObject.guid]);
                        })
                        .catch(c => {
                            alert("Failed to create category.");
                            return Promise.reject(c);
                        });
                } else {
                    return this.api.editCategory(category.guid, data)
                        .then(() => {
                            this.system.viewPage('categories', [category.slug || category.guid]);
                        })
                        .catch(c => {
                            alert("Failed to edit category.");
                            return Promise.reject(c);
                        });
                }
            });

            return p;
        }

        render() {
            let gameGuidOrSlug = this.arg('gameGuid') || this.arg('gameSlug');

            if (gameGuidOrSlug) {
                return Promise.all([
                    this.api.getGame(gameGuidOrSlug),
                    this.api.getGameRole(gameGuidOrSlug)
                ])
                    .then(([game, /**UserRole*/ role]) => {
                        if (!role.isAtLeast(UserRole.ADMIN)) {
                            return Page.redirection('games', gameGuidOrSlug);
                        }

                        /**
                         * @type {CategoryData}
                         */
                        let category = {
                            challengePeriod: 7200,
                            description: "",
                            game: game,
                            lateCutoff: {default: 0, max: 600},
                            moderated: true,
                            mutedRaces: {default: false, locked: false},
                            quitCutoff: {default: 0, max: 600},
                            ranked: true,
                            rankedRaces: {default: true, locked: false},
                            rules: "",
                            startup: {
                                default: "READY_UP",
                                allowed: [
                                    "READY_UP",
                                    "SCHEDULED",
                                    "GATEKEEPER"
                                ],
                                allowedAlways: [
                                    "READY_UP"
                                ],
                                offset: 0
                            },
                            streamSamplingInterval: 300,
                            streamUptimeRequirement: 0.95,
                            streamedRaces: {default: true, locked: true},
                            unlistedRaces: {default: false, locked: false},
                            volatility: 0.6
                        };

                        return this._showPage(category, game, true);
                    });

            } else {
                let categoryGuid = this.arg('categoryGuid');

                return Promise.all([
                    this.api.getCategory(categoryGuid),
                    this.api.getCategoryRole(categoryGuid)
                ])
                    .then(([category, role]) => {
                        return this.api.getGame(category.game.guid)
                            .then(game => [category, role, game])
                    })
                    .then(([category, /**UserRole*/ role, game]) => {
                        if (!role.isAtLeast(UserRole.ADMIN)) {
                            return Page.redirection('categories', categoryGuid);
                        }

                        return this._showPage(category, game);
                    });
            }
        }
    }
);