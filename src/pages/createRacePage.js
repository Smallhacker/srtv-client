'use strict';

import Page from "../page.js";
import {panel} from "../bootstrap.js";
import {Form} from "../bootstrap";
import {fromInputFormat, Mutex} from "../utils";

const STARTUP_LABELS = {
    'READY_UP': "Ready Up",
    'SCHEDULED': "Scheduled",
    'GATEKEEPER': "Gatekeeper"
};

export function parseBoolean(b) {
    // TODO: Temporary fix for server-side issue. (iss80) Remove when it starts returning proper booleans.

    if (b === true || b === 'TRUE') {
        return true;
    } else if (b === false || b === 'FALSE') {
        return false;
    }
    throw new Error("Unknown value: \"" + b + "\"");
}

function disable(...nodes) {
    for (let node of nodes) {
        $(node).prop('disabled', true);
    }
}

function enable(...nodes) {
    for (let node of nodes) {
        $(node).prop('disabled', false);
    }
}

function enableIf(node, condition) {
    if (condition) {
        enable(node);
    }
}

function set(node, value, disabled = false) {
    node.val(value).prop('disabled', disabled);
}

let mutex = new Mutex();

Page.register(
    class CreateRacePage extends Page {
        get urlPattern() {
            return [
                'races/create',
                'games/guid:gameGuid/races/create',
                'games/slug:gameSlug/races/create',
                'categories/guid:categoryGuid/races/create',
                'categories/guid:categoryGuid/createRace' // Legacy
            ];
        }

        /**
         * @param {CategoryData|null} category
         * @param {GameBlurb|GameData|null} game
         * @returns {jQuery}
         * @private
         */
        _showForm(category, game) {
            let p = panel('primary')
                .title("Create Race");


            let form = new Form();
            form.node.appendTo(p.body());

            let categorySelect;
            let gameSelect;

            /**
             * @returns {Promise<GameData|null>}
             */
            let findGame = () => {
                if (!gameSelect) {
                    return Promise.resolve(null);
                }
                return this.api.findGame(gameSelect.val())
                    .then(game => {
                        if (!game) {
                            return Promise.resolve(null);
                        }
                        return this.api.getGame(game.guid);
                    });
            };

            let activateCategories = (game) => {
                let categoryOptions = game.categories.map(cat => ({
                    value: cat.guid,
                    label: cat.name
                }));

                categorySelect.val(null).empty();
                form.setOptions(categorySelect, categoryOptions);
                categorySelect.change(() => {
                    let guid = categorySelect.val();
                    if (guid) {
                        mutex.attempt(() => {
                            return this.api.getCategory(guid)
                                .then(
                                    cat => {
                                        activate(cat);
                                    },
                                    () => {
                                        alert("Failed to load category details.");
                                    });
                        });
                    }
                });

                enable(categorySelect);
                categorySelect.change();
            };

            if (game) {
                form.text("Game", game.name, {disabled: true});

                if (category) {
                    form.text("Category", category.name, {disabled: true});
                } else {
                    categorySelect = form.select("Category", [], null);
                    activateCategories(game);
                }
            } else {
                gameSelect = form.game("Game", this.api);
                gameSelect.change(() => {
                    enable(categorySelect);
                    findGame().then(game => {
                        if (game) {
                            activateCategories(game);
                        } else {
                            categorySelect.val(null).empty();
                            disable(categorySelect);
                            category = null;
                        }
                    });
                });
                categorySelect = form.select("Category", [], null, {disabled: true});
            }

            let raceName = form.text("Race Name");
            let raceDescription = form.textArea("Description");
            let startup = form.select("Startup Type", [], null, {disabled: true});
            let gatekeeperCollapse = form.collapse();
            let gatekeeper = form.username(this.api, "Gatekeeper");
            form.endCollapse();
            let scheduledCollapse = form.collapse();
            let scheduledStart = form.dateTime("Scheduled Start");
            form.endCollapse();
            let ranked = form.checkbox("Ranked Race", false, {
                disabled: true,
                hint: "Participating in a ranked race will affect the runner's ranking and leaderboard position."
            });

            let unlisted = form.checkbox("Unlisted Race", false, {
                disabled: true,
                hint: "Unlisted races don't show up when searching for races; they can only be accessed through their URLs."
            });
            let muted = form.checkbox("Muted Race", false, {
                disabled: true,
                hint: "Muted races disallow chatting between runners."
            });
            let streamed = form.checkbox("Streamed Race", false, {
                disabled: true,
                hint: "All participants in a streamed race are required to stream their runs to their Twitch accounts."
            });
            let lateCutoff = form.duration("Late Entry Period", null, 0, null, {disabled: true});
            let quitCutoff = form.duration("Quit Cutoff Period", null, 0, null, {disabled: true});
            form.button("Create Race");

            let updateCollapse = () => {
                let value = startup.val();
                switch (value) {
                    case 'SCHEDULED':
                        scheduledCollapse.setShown();
                        gatekeeperCollapse.setHidden();
                        break;
                    case 'GATEKEEPER':
                        scheduledCollapse.setHidden();
                        gatekeeperCollapse.setShown();
                        break;
                    default:
                        scheduledCollapse.setHidden();
                        gatekeeperCollapse.setHidden();
                        break;
                }
            };
            startup.change(updateCollapse);

            /**
             * @param {CategoryData} cat
             */
            const activate = (cat) => {
                category = cat;
                if (categorySelect) {
                    categorySelect.val(cat.guid);
                }

                let startups = [];
                for (let id of cat.startup.allowed) {
                    startups.push({
                        value: id,
                        label: STARTUP_LABELS[id]
                    });
                }

                startup.val(null).empty();
                form.setOptions(startup, startups);
                set(startup, cat.startup.default, false);
                set(ranked, cat.rankedRaces.default, cat.rankedRaces.locked);
                set(unlisted, cat.unlistedRaces.default, cat.rankedRaces.locked);
                set(muted, cat.mutedRaces.default, cat.mutedRaces.locked);
                set(streamed, cat.streamedRaces.default, cat.streamedRaces.locked);
                set(lateCutoff, cat.lateCutoff.default, false);
                lateCutoff.attr('max', cat.lateCutoff.max);
                set(quitCutoff, cat.quitCutoff.default, false);
                quitCutoff.attr('max', cat.quitCutoff.max);
                updateCollapse();
            };

            if (category) {
                activate(category);
            }


            let gatherData = () => {
                let data = {
                    category: category.guid,
                    name: raceName.val(),
                    description: raceDescription.val(),
                    startupMode: startup.val(),
                    ranked: ranked.prop('checked'),
                    unlisted: unlisted.prop('checked'),
                    muted: muted.prop('checked'),
                    streamed: streamed.prop('checked'),
                    lateCutoff: +lateCutoff.val(),
                    quitCutoff: +quitCutoff.val()
                };

                if (scheduledCollapse.isOpen()) {
                    let ss = fromInputFormat(scheduledStart.val());
                    if (ss) {
                        data.scheduledStart = ss;
                    }
                }

                if (gatekeeperCollapse.isOpen()) {
                    let userName = gatekeeper.val();
                    if (userName) {
                        return this.api.findUser(userName)
                            .then(user => {
                                if (!user) {
                                    return {error: `Username "${userName}" not found.`};
                                }
                                data.gatekeeper = user.guid;
                                return data;
                            });
                    }
                } else {
                    return Promise.resolve(data);
                }
            };

            form.onSubmit(() => {
                if (!category) {
                    alert("Select a category first.");
                    return Promise.reject();
                }

                return gatherData()
                    .then(data => {
                        if (data.error) {
                            alert(data.error);
                            return Promise.resolve();
                        }

                        return this.api.createRace(data)
                            .then(race => {
                                this.system.viewPage('races', [race.guid]);
                            })
                            .catch(c => {
                                alert("Failed to create race.");
                                return Promise.reject(c);
                            })
                    });

            });


            return p;
        }

        render() {
            let categoryGuid = this.arg('categoryGuid');
            if (categoryGuid) {
                return this.api.getCategory(categoryGuid).then(category => {
                    return this._showForm(category, category.game);
                });
            }
            let gameGuidOrSlug = this.arg('gameGuid') || this.arg('gameSlug');
            if (gameGuidOrSlug) {
                return this.api.getGame(gameGuidOrSlug).then(game => {
                    return this._showForm(null, game);
                });
            }
            return this._showForm(null, null);
        }
    }
);