'use strict';

import Page from '../page.js';
import {panel} from '../bootstrap.js';
import {Form} from "../bootstrap";
import UserRole from "../api/userRole";

Page.register(
    class EditGamePage extends Page {
        get urlPattern() {
            return [
                'games/create',
                'games/suggest',
                'games/guid:gameGuid/edit',
                'games/slug:gameSlug/edit'
            ];
        }

        /**
         * @param {GameData|null} game
         * @param {boolean} suggest
         * @returns {jQuery}
         * @private
         */
        _gui(game = null, suggest = false) {
            let edit = !!game;
            if (!edit) {
                game = {};
            }

            let title = edit ? game.name : (suggest ? "Suggest Game" : "Create Game");

            let p = panel('primary')
                .title(title);

            let parentName = (game.parent && game.parent.name) || "(none)";

            let form = new Form();
            form.node.appendTo(p.body());

            let titleScreen;
            if (!edit) {
                titleScreen = form.imageUpload("Title Screen", {
                    hint: "PNG and JPEG images are allowed."
                });
            }

            let gameName = form.text("Name", game.name, {disabled: edit});
            if (!suggest) {
                form.text("Parent Game", parentName, {disabled: true});
            }
            let slug;
            if (!edit && !suggest) {
                slug = form.text("Game URL", null, {prefix: "speedracing.tv/games/"});
            }
            let description;
            let rules;
            let discord;
            if (!suggest) {
                description = form.textArea("Description", game.description);
                rules = form.textArea("Rules", game.rules);
                discord = form.text("Discord Link", game.discord);
            }
            //let twitch = form.text("Twitch Link", game.twitch);
            //let srcom = form.text("speedrun.com Link", game.srcom);
            form.button("Save", true, {style: 'success'});
            form.onSubmit(() => {
                let data = {};

                if (description) {
                    data.description = description.val();
                }
                if (rules) {
                    data.rules = rules.val();
                }
                if (discord) {
                    data.discord = discord.val();
                }
                if (edit) {
                    return this.api.editGame(game.guid, data)
                        .then(() => {
                            this.system.viewPage('games', [game.slug || game.guid]);
                        })
                        .catch(c => {
                            alert("Failed to edit game.");
                            return Promise.reject(c);
                        });
                } else {
                    data.name = gameName.val();
                    data.parent = null;
                    data.titleScreen = titleScreen.val();
                    if (slug) {
                        data.slug = slug.val();
                    }
                    return this.api.createGame(data)
                        .then(game => {
                            if (suggest) {
                                alert("Suggestion has been sent.");
                                this.system.viewPage('games');
                            } else {
                                this.system.viewPage('games', [game.slug || game.guid]);
                            }
                        })
                        .catch(c => {
                            let err = suggest ? "Failed to suggest game." : "Failed to create game.";
                            alert(err);
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
                    .then(([/**GameData*/ game, /**UserRole*/ role]) => {
                        if (!role.isAtLeast(UserRole.ADMIN)) {
                            return Page.redirection('games', gameGuidOrSlug);
                        }

                        return this._gui(game);
                    });
            }

            return this.api.getGlobalRole()
                .then(role => {
                    let suggest;

                    if (role.isAtLeast(UserRole.ADMIN)) {
                        suggest = false;
                    } else if (role.isAtLeast(UserRole.NORMAL)) {
                        suggest = true;
                    } else {
                        return Page.redirection('games');
                    }

                    return this._gui(null, suggest);
                });
        }
    }
);