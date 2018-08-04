'use strict';

import Page from '../page.js';
import {panel} from '../bootstrap.js';
import {Form} from "../bootstrap";
import Theme from "../theme";
import {uniqueId} from "../utils";
import {Notifier} from "../notifier";

Page.register(
    class SettingsPage extends Page {
        get urlPattern() {
            return ['settings'];
        }

        render(meta) {
            if (!this.api.isLoggedIn) {
                return {redirect: true};
            }

            return this.api.getUser(this.api.currentUserGuid)
                .then(user => {
                    let p = panel('primary')
                        .title("User Settings");

                    if (meta && meta.message) {
                        let message = meta.message;
                        let messageType = meta.messageType || 'default';
                        $('<div class="alert alert-' + messageType + '" role="alert">')
                            .text(meta.message)
                            .appendTo(p.body());
                    }

                    let themeValues = [];
                    let themes = Theme.getThemes();
                    for (let t of themes) {
                        themeValues.push({
                            label: t.name,
                            value: t.id
                        });
                    }

                    if (meta && meta.oldData) {
                        $.extend(true, user, meta.oldData);
                    }

                    let collapseId = uniqueId();

                    let form = new Form();
                    form.text("Username", user.name, {disabled: true});
                    form.button("Change Password", false, {
                        style: 'danger',
                        collapse: collapseId
                    });
                    let collapse = form.collapse(collapseId);
                    let currentPassword = form.password("Current Password");
                    let newPassword = form.password("New Password", null, {
                        validate: v => {
                            if (!collapse.isOpen()) {
                                return null;
                            }
                            return v ? null : "Password cannot be empty.";
                        }
                    });
                    let repeatPassword = form.password("Repeat New Password", null, {
                        validate: v => {
                            if (!collapse.isOpen()) {
                                return null;
                            }
                            return newPassword.val() === v ? null : "Passwords must match.";
                        }
                    });
                    collapse.onHidden(() => {
                        currentPassword.val('');
                        newPassword.val('');
                        repeatPassword.val('');
                    });
                    form.endCollapse();
                    let email = form.text("Email Address", user.email);
                    let publicEmail = form.checkbox("Allow Others to See Email Address", user.publicEmail);
                    let twitch = form.text("Twitch Name", user.twitch || "");
                    let srcom = form.text("speedrun.com Name", user.srcom || "");
                    let showFinishes = form.checkbox("Show Competitors Finishing", !user.hideFinishes);
                    let theme = form.select("Website Theme", themeValues, Theme.getUserThemeId());

                    let notifications = [];
                    for (let event of Notifier.getEvents()) {
                        for (let effect of Notifier.getEffects()) {
                            if (event.supports(effect)) {
                                let enabled = Notifier.isEnabled(event, effect);
                                let checkbox = form.checkbox(event.title + ": " + effect.title, enabled);
                                notifications.push({checkbox, event, effect});
                            }
                        }
                    }

                    form.button("Save");
                    form.onSubmit(() => {
                        let changes = {
                            email: email.val(),
                            publicEmail: publicEmail.prop('checked'),
                            twitch: twitch.val(),
                            srcom: srcom.val(),
                            hideFinishes: !showFinishes.prop('checked')
                        };

                        if (collapse.isOpen()) {
                            changes.oldPassword = currentPassword.val();
                            changes.password = newPassword.val();
                        }

                        this.api.editCurrentUser(changes)
                            .then(() => {
                                Theme.getTheme(theme.val()).switchTo();

                                for (let n of notifications) {
                                    let enabled = n.checkbox.prop('checked');
                                    Notifier.setEnabled(n.event, n.effect, enabled);
                                }

                                this.reload({
                                    message: "Settings have been saved",
                                    messageType: 'success'
                                });
                            })
                            .catch(() => {
                                this.reload({
                                    message: "Failed to save settings",
                                    messageType: 'danger',
                                    oldData: changes
                                });
                            });
                    });

                    form.node.appendTo(p.body());
                    return p;
                });
        }
    }
);