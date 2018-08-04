'use strict';

import Page from '../page.js';
import {panel} from '../bootstrap.js';
import {ButtonGroup, Grid} from "../bootstrap";
import CategoryWidget from "../widgets/categoryWidget";
import {splitLines} from "../utils";
import {linkArray, userLink} from "../model";
import UserRole from "../api/userRole";
import {modList} from "./gamePage";

Page.register(
    class CategoryPage extends Page {
        get urlPattern() {
            return [
                'categories/guid:categoryGuid'
            ];
        }

        render() {
            let categoryGuid = this.arg('categoryGuid');

            return Promise.all([
                this.api.getCategory(categoryGuid),
                this.api.getCategoryRole(categoryGuid),
                this.api.getCategoryRoles(categoryGuid)
            ])
                .then(([category, role, roles]) => {
                    return this.api.getGame(category.game.guid)
                        .then(game => [category, role, roles, game])
                })
                .then(([/**CategoryData*/ category, /**UserRole*/ role, /**CategoryRoles*/ roles, /**GameData*/ game]) => {
                    let p = panel('primary')
                        .title(category.name);

                    let grid = new Grid(p.body());

                    let nav = new ButtonGroup("Category Links", false, 'nav');
                    if (role.isAtLeast(UserRole.NORMAL)) {
                        nav.addLink(['categories', category.guid, 'races', 'create'], "Create Race", null, 'primary');
                    }
                    nav.addLink(['categories', category.guid, 'races'], "Races");
                    nav.addLink(['categories', category.guid, 'ranks'], "Leaderboard");
                    if (role.isAtLeast(UserRole.MODERATOR)) {
                        let modButton = nav.addLink(['categories', category.guid, 'flags'], "Moderation Queue");
                        this.api.getCategoryFlags(category.guid)
                            .then(flags => {
                                if (flags.length) {
                                    modButton.addBadge(flags.length);
                                }
                            });
                    }
                    if (role.isAtLeast(UserRole.ADMIN)) {
                        nav.addLink(['categories', category.guid, 'edit'], "Edit Category");
                        nav.addLink(['categories', category.guid, 'roles'], "Edit Roles");
                    }


                    grid.row().cell().append(nav.node);
                    let kv = grid.keyValue();
                    kv.row("Game", this.system.link(game.name, 'games', game.slug || game.guid))
                        .row("Description", splitLines(category.description))
                        .row("Rules", splitLines(category.rules));

                    modList(n => kv.row("Administered by", n), roles, 'ADMIN', {
                        GLOBAL: "Global Admins",
                        GAME: "Game Admins",
                    }, true);

                    modList(n => kv.row("Moderated by", n), roles, 'MODERATOR', {
                        GLOBAL: "Global Mods",
                        GAME: "Game Mods",
                    }, true);

                    let categoryWidget = new CategoryWidget(this.system, this.context, game, category.guid)
                        .render();

                    let layout = new Grid()
                        .row()
                        .cell(3).append(categoryWidget.nodeInPage(this))
                        .cell(9).append(p);

                    return layout.node;
                });
        }
    }
);