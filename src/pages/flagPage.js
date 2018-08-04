'use strict';

import Page from '../page.js';
import {panel} from '../bootstrap.js';
import {buttonGroup, ButtonGroup, Grid} from "../bootstrap";
import {categoryLink, gameLink, raceLink, userLink} from "../model";
import ChatWidget from "../api/chatWidget";
import ConfirmModal from "../modals/confirmModal";
import UserModal from "../modals/userModal";
import SelectModal from "../modals/selectModal";
import FlagType from "../flagType";

Page.register(
    class FlagPage extends Page {
        get urlPattern() {
            return [
                'flags/guid:flagGuid'
            ];
        }

        render() {
            let flagGuid = this.arg('flagGuid');

            return this.api.getFlag(flagGuid)
                .then(flag => this.api.getRace(flag.race)
                    .then(race => [flag, race]))
                .then(([flag, race]) => {
                    let mainRow = new Grid().row();

                    let p = panel('primary')
                        .title("Moderation Flag");
                    mainRow.cell(6).append(p);

                    let game = flag.game;
                    let category = flag.category;

                    let kv = new Grid(p.body()).keyValue();
                    kv.row("Game", gameLink(game));
                    kv.row("Category", categoryLink(category));
                    kv.row("Race", raceLink(race));
                    if (flag.entrant) {
                        kv.row("Runner", userLink(flag.entrant));
                    }
                    if (flag.reporter) {
                        kv.row("Reporter", userLink(flag.reporter));
                    }
                    if (flag.assignee) {
                        kv.row("Assignee", userLink(flag.assignee));
                    }
                    kv.row("Type", FlagType.parseFlagType(flag.type).toHintNode());
                    kv.row("Comment", flag.comment);

                    let resolutionModal = new ConfirmModal(this.context,
                        "Confirm Resolution", "Are you sure that you want to resolve this flag?", "Resolve", 'danger',
                        () => this.api.updateFlag(flagGuid, null, null, true)
                            .catch(() => Promise.reject("Failed to resolve flag."))
                    ).renderModalInPage(this);

                    let reassign = username =>
                        this.api.findUser(username)
                            .then(
                                user => {
                                    if (!user) {
                                        return Promise.reject("Could not find user \"" + username + "\"")
                                    }
                                    return this.api.updateFlag(flagGuid, user.guid)
                                        .catch(() => Promise.reject("Failed to assign flag."));
                                },
                                () => Promise.reject("Failed to look up user.")
                            );

                    let reclassify = value => this.api.updateFlag(flagGuid, null, value)
                        .catch(() => Promise.reject("Failed to reclassify flag."));

                    let assigneeModal = new UserModal(this.context, this.api, reassign,
                        "Assign Flag", "Assign", 'success', "Assignee"
                    ).renderModalInPage(this);

                    let typeModal = new SelectModal(this.context, this.api,
                        FlagType.all.map(f => f.toSelectValue()), reclassify,
                        "Reclassify Flag", "Reclassify", 'success', "Flag Type"
                    ).renderModalInPage(this);

                    let footer = p.footer();
                    let buttons = new ButtonGroup('Actions');
                    buttons.addButton("Assign").node.click(() => assigneeModal.open(flag.assignee && flag.assignee.name));
                    buttons.addButton("Reclassify").node.click(() => typeModal.open(flag.type));
                    buttons.addButton("Resolve", 'danger').node.click(() => resolutionModal.open());
                    footer.append(buttons.node);

                    let rightHalf = mainRow.cell(6);

                    let chatPanel = ChatWidget.chatPanel(this.context, this.system, [flag.chat], flag.chat)
                        .title("Flag Discussion");
                    rightHalf.append(chatPanel);

                    return mainRow.node;
                });
        }
    }
);