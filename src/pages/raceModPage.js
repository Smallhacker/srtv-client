'use strict';

import Page from "../page.js";
import {panel} from "../bootstrap.js";
import {Grid, Matrix} from "../bootstrap";
import {fromInputFormat, toInputFormat, toNode} from "../utils";
import RaceState from "../raceState";
import ChatWidget from "../api/chatWidget";
import {userLink} from "../model";
import {getStatus} from "../modals/entryStatusModal";
import EntryStatusModal from "../modals/entryStatusModal";
import LiveRace from "../api/liveRace";
import {raceNav} from "./racePage";

Page.register(
    class RaceModPage extends Page {
        get urlPattern() {
            return ['races/guid:raceGuid/mod'];
        }

        /**
         * @param {RaceRolesData} raceRoles
         * @return {string|null}
         * @private
         */
        _getRole(raceRoles) {
            let guid = this.api.currentUserGuid();
            return raceRoles.roles
                .filter(role => role.user && role.user.guid && role.user.guid === guid)
                .map(role => role.role)
                [0] || null;
        }

        render() {
            let runAndReload = (promise, error) => {
                promise.then(
                    () => this.reload(),
                    () => alert(error)
                )
            };

            let raceGuid = this.arg('raceGuid');

            return Promise.all([
                this.api.getRaceWithEntries(raceGuid),
                LiveRace.load(this.context, this.api, raceGuid)
            ])
                .then(([race, /**LiveRace*/liveRace]) => {
                    let raceState = new RaceState(this.api, (() => {
                    }), race);
                    if (!raceState.isModerator) {
                        return {
                            redirect: true,
                            page: 'races',
                            args: [race.guid]
                        };
                    }

                    let announcementPanel = ChatWidget.chatPanel(this.context, this.system, [race.announcements], race.announcements).title("Race Announcements");
                    let runnerChatPanel = ChatWidget.chatPanel(this.context, this.system, [race.playerChat], race.playerChat).title("Runner Chat");
                    let viewerChatPanel = ChatWidget.chatPanel(this.context, this.system, [race.viewerChat], race.viewerChat).title("Viewer Chat");


                    let now = toInputFormat(this.api.getClientTime());

                    let controlPanel = panel('primary').title("Race Controls");

                    let start = $('<button>')
                        .addClass('btn btn-success race-mod-button')
                        .text("Start Race")
                        .prop('disabled', !raceState.canStartRace)
                        .click(() => {
                            runAndReload(
                                this.api.startRaceIn(raceGuid, 0),
                                "Failed to start race."
                            );
                        });

                    let cancel = $('<button>')
                        .addClass('btn btn-danger race-mod-button')
                        .text("Cancel Race")
                        .prop('disabled', !raceState.canCancelRace)
                        .click(() => {
                            if (window.confirm("Do you really want to cancel the race? This cannot be undone!")) {
                                return runAndReload(
                                    this.api.cancelRace(raceGuid),
                                    "Failed to cancel race."
                                );
                            }
                        });

                    let datetime = $('<input>')
                        .addClass('race-mod-field form-control')
                        .prop('disabled', !raceState.canScheduleRace)
                        .attr({
                            type: 'datetime-local',
                            pattern: '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}',
                            placeholder: 'yyyy-mm-ddThh:mm',
                            value: now,
                            min: now
                        });

                    let schedule = $('<button>')
                        .addClass('btn btn-success race-mod-action')
                        .text("Schedule Start")
                        .prop('disabled', !raceState.canScheduleRace)
                        .click(() => {
                            let val = datetime.val();
                            let stamp = fromInputFormat(val);
                            if (stamp) {
                                runAndReload(
                                    this.api.startRaceAt(raceGuid, stamp),
                                    "Failed to start race."
                                );
                            } else {
                                alert("Invalid date/time.");
                            }
                        });

                    let controlGrid = new Grid(controlPanel.body());

                    controlGrid.row()
                        .cell(6).append(start)
                        .cell(6).append(cancel);


                    let raceStatus = $('<div>');
                    const updateStatus = () => {
                        raceStatus.text(liveRace.status.label);
                    };
                    updateStatus();
                    liveRace.onStatusChange(updateStatus);

                    controlGrid.row()
                        .cell('sm-6,md-3').append(schedule)
                        .cell('sm-6,md-3').append(datetime)
                        .cell('sm-6,md-3').append(toNode("Race Status", 'label'))
                        .cell('sm-6,md-3').append(raceStatus);

                    const setStatus = ({entry, status}) =>
                        this.api.setEntryStatus(entry, status)
                            .then(() => this.reload())
                            .catch(() => Promise.reject("Failed to update status."));

                    let statusModal = new EntryStatusModal(this.context, setStatus).renderModalInPage(this);

                    let entryTable = new Matrix()
                        .col("Player")
                        .col("Status")
                        .col("Action");
                    for (/**EntryData*/let e of race.entries) {
                        let entry = e;
                        entryTable.row()
                            .cell(userLink(entry.player))
                            .cell(getStatus(entry.status))
                            .cell($('<button>').addClass('btn btn-default').text("Change").click(() => statusModal.open({
                                status: entry.status,
                                entry: entry.guid
                            })));
                    }

                    return new Grid()
                        .row()
                        .cell().append(raceNav(this.api, raceState, 'mod'))
                        .row()
                        .cell().append(controlPanel)
                        .row()
                        .cell(8)
                        .append(
                            new Grid($('<div>'))
                                .row()
                                .cell(12, 'mod-view-chat-announcements').append(announcementPanel)
                                .row()
                                .cell(6, 'mod-view-chat-runners').append(runnerChatPanel)
                                .cell(6, 'mod-view-chat-viewers').append(viewerChatPanel)
                                .node
                        )
                        .cell(4)
                        .append(entryTable.toTable())
                        .node;
                });
        }
    }
);