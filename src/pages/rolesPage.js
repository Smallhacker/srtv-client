'use strict';

import Page from '../page.js';
import {panel} from '../bootstrap.js';
import {Form, Grid, Matrix, Panel} from "../bootstrap";
import UserRole from "../api/userRole";
import {parseBoolean} from "./createRacePage";

Page.register(
    class RolesPage extends Page {
        get urlPattern() {
            return [
                'games/guid:gameGuid/roles',
                'games/slug:gameSlug/roles',
                'categories/guid:categoryGuid/roles',
                'roles',
            ];
        }

        /**
         * @param {RolesList} roles
         * @param {string} name
         * @param {function} submitter
         * @param {string|undefined} scope
         * @private
         */
        _gui(roles, name, submitter, scope = undefined) {
            let grid = new Grid().row();
            let nextId = 0;

            const table = (title, level, mutable = true) => {
                let panel = new Panel('primary')
                    .title(name + ": " + title);

                let table = $('<table>').addClass('table');

                let userName = $('<input class="form-control" type="text" placeholder="Username">');
                let add = $('<button class="btn btn-success">').append('<i class="fa fa-plus">')
                    .click(() => {
                        let user = userName.val();
                        this.api.findUser(user)
                            .then(u => {
                                if (!u) {
                                    alert("User not found.");
                                    return;
                                }

                                if (!confirm(`Are you sure you want to add ${u.name} to ${title}?\nThis will take immediate effect.`)) {
                                    return;
                                }

                                if (level === 'BANNED' && u.guid === this.api.currentUserGuid) {
                                    alert("Banning yourself is a bad idea.");
                                    return;
                                }

                                submitter(u.guid, level)
                                    .then(() => {
                                        addRow({user: u});
                                    })
                                    .catch(() => {
                                        alert("Failed to set role.");
                                    });
                            })
                            .catch(() => {
                                alert("Failed to look up user.");
                            });
                    });

                if (!mutable) {
                    userName.prop("disabled", true);
                    add.prop("disabled", true);
                }

                let lastRow = $('<tr>')
                    .appendTo(table);
                $('<td>').append(userName)
                    .appendTo(lastRow);
                $('<td>').append(add)
                    .appendTo(lastRow);

                /**
                 * @param {RoleData} role
                 */
                const addRow = (role) => {
                    let row = $('<tr>').insertBefore(lastRow);
                    let button = $('<button class="btn btn-danger">').append('<i class="fa fa-trash-o">')
                        .click(() => {
                            if (!confirm(`Are you sure you want to remove ${role.user.name} from ${title}?\nThis will take immediate effect.`)) {
                                return;
                            }

                            if (this.api.currentUserGuid === role.user.guid) {
                                if (!confirm(`You are removing yourself from ${title}. Are you absolutely sure?`)) {
                                    return;
                                }
                            }

                            submitter(role.user.guid, 'NORMAL')
                                .then(() => {
                                    row.remove();
                                })
                                .catch(() => {
                                    alert("Failed to set role.");
                                });

                        });

                    if (!mutable) {
                        button.prop("disabled", true);
                    }

                    row.append($('<td>').append(role.user.name));
                    row.append($('<td>').append(button));
                };

                for (let role of roles.roles.filter(role => role.role === level && role.scope === scope)) {
                    addRow(role);
                }

                panel.body().append(table);
                grid.cell(4).append(panel.node);
            };

            table("Admins", 'ADMIN', false);
            table("Mods", 'MODERATOR');
            table("Banned", 'BANNED');

            return grid.node;
        }


        _forGame(gameGuidOrSlug) {
            return Promise.all([
                this.api.getGame(gameGuidOrSlug),
                this.api.getGameRole(gameGuidOrSlug),
                this.api.getGameRoles(gameGuidOrSlug)
            ])
                .then(([/**GameData*/game, /**UserRole*/role, /**GameRoles*/roles]) => {
                    if (!role.isAtLeast(UserRole.ADMIN)) {
                        return Page.redirection('games', gameGuidOrSlug);
                    }

                    return this._gui(roles, game.name, (userGuid, role) => {
                        return this.api.setGameRole(game.guid, userGuid, role);
                    }, 'GAME');
                });
        }

        _forCategory(categoryGuid) {
            return Promise.all([
                this.api.getCategory(categoryGuid),
                this.api.getCategoryRole(categoryGuid),
                this.api.getCategoryRoles(categoryGuid)
            ])
                .then(([/**CategoryData*/category, /**UserRole*/role, /**CategoryRoles*/roles]) => {
                    if (!role.isAtLeast(UserRole.ADMIN)) {
                        return Page.redirection('categories', categoryGuid);
                    }

                    return this._gui(roles, category.name, (userGuid, role) => {
                        return this.api.setCategoryRole(category.guid, userGuid, role);
                    }, 'CATEGORY');
                });
        }

        _forGlobal() {
            return Promise.all([
                this.api.getGlobalRole(),
                this.api.getGlobalRoles()
            ])
                .then(([/**UserRole*/role, /**RolesList*/roles]) => {
                    if (!role.isAtLeast(UserRole.ADMIN)) {
                        return Page.redirection();
                    }

                    return this._gui(roles, "SpeedRacing TV", () => {
                        alert("Not implemented");
                        return Promise.reject();
                    });
                });
        }

        render() {
            let gameGuidOrSlug = this.arg('gameGuid') || this.arg('gameSlug');
            if (gameGuidOrSlug) {
                return this._forGame(gameGuidOrSlug);
            }

            let categoryGuid = this.arg('categoryGuid');
            if (categoryGuid) {
                return this._forCategory(categoryGuid);
            }

            return this._forGlobal();
        }
    }
);