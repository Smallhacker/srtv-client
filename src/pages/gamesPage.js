'use strict';

import Page from '../page.js';
import {panel} from '../bootstrap.js';
import {formGroup, link} from "../bootstrap";
import PageService from "../pageService";
import UserRole from "../api/userRole";

Page.register(
    class GamesPage extends Page {
        get urlPattern() {
            return [
                'games',
                'games/search/text:term'
            ];
        }

        _init() {
            this._pageService = new PageService(
                this.system,
                (p, n) => this.api.getGames(p, n && n.name),
                [["", "game-thumbnail-column"], ["Game"]],
                game => {
                    let url = this.api.getGameImageUrl(game.guid);
                    let img = $('<img>').attr('src', url).addClass('search-thumbnail');
                    return [img, this.system.link(game.name, 'games', game.slug || game.guid)];
                }
            );
        }

        _search(name = null) {
            return this._pageService.params({name: name});
        }

        render() {
            return this.api.getGlobalRole()
                .then(role => {
                    let term = this.arg('term');

                    let pan = panel('primary')
                        .title("Games");
                    let p = pan.body();

                    let form = $('<form class="form-inline">').appendTo(p);
                    let name = $('<input type="text" placeholder="Game Name">')
                        .val(term);
                    formGroup(name, "Game Name", null, true).appendTo(form);
                    form.append(document.createTextNode(" "));
                    $('<button type="submit" class="btn btn-default">').text("Search").appendTo(form);
                    if (role.isAtLeast(UserRole.ADMIN)) {
                        $('<button type="button" class="btn btn-default">').text("Create Game").appendTo(form)
                            .click(() => {
                                this.system.viewPage('games', ['create']);
                            });
                    } else if (role.isAtLeast(UserRole.NORMAL)) {
                        $('<button type="button" class="btn btn-default">').text("Suggest Game").appendTo(form)
                            .click(() => {
                                this.system.viewPage('games', ['suggest']);
                            });
                    }

                    form.submit(e => {
                        e.preventDefault();
                        let nameVal = name.val();
                        this._search(nameVal);
                        this.system.updateState(this, ['games', 'search', nameVal]);
                    });

                    this._pageService.node.appendTo(p);

                    return this._search(term)
                        .then(() => pan);
                });
        }
    }
);