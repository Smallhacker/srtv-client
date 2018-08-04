'use strict';

import Page from '../page.js';
import {panel} from '../bootstrap.js';
import {buttonGroup, ButtonGroup, Grid} from "../bootstrap";
import CategoryWidget from "../widgets/categoryWidget";
import {joinNodes, splitLines, textNode} from "../utils";
import {linkArray, userLink} from "../model";
import UserRole from "../api/userRole";

/**
 * @param {function} callback
 * @param {RolesList} roles
 * @param {string} roleFilter
 * @param {{}} roleNames
 * @param {boolean} category
 */
export function modList(callback, roles, roleFilter, roleNames, category = false) {
    let grouped = {
        GAME: [],
        CATEGORY: [],
        GLOBAL: []
    };

    for (let role of roles.roles) {
        if (role.role === roleFilter) {
            let scope = role.scope;
            if (scope && grouped.hasOwnProperty(scope)) {
                grouped[scope].push(role.user);
            }
        }
    }

    function collapseNode(title, nodes) {
        if (!nodes.length) {
            return [];
        }

        let members = joinNodes(nodes, textNode(", "), $('<span>'))
            .prepend(textNode(" ("))
            .append(textNode(")"))
            .hide();
        let group = $('<span>')
            .addClass('role-expandable')
            .text(title)
            .click(() => members.toggle());
        return [
            $('<span>')
                .append(group)
                .append(members)
        ];
    }

    let forCategory;
    let forGame;
    let forGlobal;

    if (category) {
        forCategory = grouped.CATEGORY.map(userLink);
        forGame = collapseNode(roleNames.GAME, grouped.GAME.map(userLink));
        forGlobal = collapseNode(roleNames.GLOBAL, grouped.GLOBAL.map(userLink));
    } else {
        forCategory = [];
        forGame = grouped.GAME.map(userLink);
        forGlobal = collapseNode(roleNames.GLOBAL, grouped.GLOBAL.map(userLink));
    }

    let all = [].concat(forCategory, forGame, forGlobal);

    if (all.length) {
        callback(joinNodes(all, textNode(", "), $('<span>')));
    }
}

Page.register(
    class GamePage extends Page {
        get urlPattern() {
            return [
                'games/guid:gameGuid',
                'games/slug:gameSlug'
            ];
        }

        render() {
            let gameGuidOrSlug = this.arg('gameGuid') || this.arg('gameSlug');
            return Promise.all([
                this.api.getGame(gameGuidOrSlug),
                this.api.getGameRole(gameGuidOrSlug),
                this.api.getGameRoles(gameGuidOrSlug)
            ])
                .then(([/**GameData*/ game, /**UserRole*/ role, /**GameRoles*/ roles]) => {
                    let p = panel('primary')
                        .title(game.name);

                    let nav = new ButtonGroup("Game Links", false, 'nav');

                    let thumbnail = $('<div class="thumbnail">');

                    this.api.getGameImage(gameGuidOrSlug)
                        .then(img => thumbnail.append(img));

                    let partOf = null;
                    let parent = game.parent;
                    if (parent && parent.guid) {
                        let parentSlugOrGuid = parent.slug || parent.guid;
                        partOf = this.system.link(parent.name, 'games', parentSlugOrGuid);
                    }

                    let outerGrid = new Grid(p.body());

                    let innerCell = outerGrid
                        .row()
                        .cell(4).append(thumbnail)
                        .cell(8)
                        .cellNode;

                    let grid = new Grid(innerCell)
                        .row()
                        .cell(12).append(nav.node);

                    let kv = grid.keyValue();
                    kv.row("Part of", partOf)
                        .row("Description", splitLines(game.description))
                        .row("Rules", splitLines(game.rules));

                    modList(n => kv.row("Administered by", n), roles, 'ADMIN', {
                        GLOBAL: "Global Admins",
                    });

                    modList(n => kv.row("Moderated by", n), roles, 'MODERATOR', {
                        GLOBAL: "Global Mods",
                    });

                    let slugOrGuid = game.slug || game.guid;

                    if (role.isAtLeast(UserRole.NORMAL)) {
                        nav.addLink(['games', slugOrGuid, 'races', 'create'], "Create Race", null, 'primary');
                    }
                    nav.addLink(['games', slugOrGuid, 'races'], "Races");

                    const LINKS = [
                        {id: 'discord', label: "Discord"},
                        {id: 'twitch', label: "Twitch"},
                        {id: 'srcom', label: "speedrun.com"},
                    ];


                    for (let i = 0; i < LINKS.length; i++) {
                        let link = LINKS[i];
                        let url = game[link.id];
                        if (url) {
                            nav.addLink(url, link.label, '_blank');
                        }
                    }

                    if (role.isAtLeast(UserRole.ADMIN)) {
                        nav.addLink(['games', slugOrGuid, 'edit'], "Edit Game");
                        nav.addLink(['games', slugOrGuid, 'createCategory'], "Create Category");
                        nav.addLink(['games', slugOrGuid, 'roles'], "Edit Roles");
                    }

                    let categoryWidget = new CategoryWidget(this.system, this.context, game)
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