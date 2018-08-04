'use strict';

import Page from "../page.js";
import {panel, Nav} from "../bootstrap.js";
import {ButtonGroup, Grid} from "../bootstrap";
import {requestMutex} from "../utils";
import EntriesWidget from "../widgets/entriesWidget";
import RaceState from "../raceState";
import ChatWidget from "../api/chatWidget";
import FlagModal from "../modals/flagModal";
import {categoryLink, gameLink} from "../model";
import {TimerWidget} from "../widgets/timerWidget";
import {connectTimerToRace} from "./runnerViewPage";
import {VideoWidget} from "../widgets/videoWidget";
import LiveRace from "../api/liveRace";
import UserRole from "../api/userRole";

const STARTUP_TYPES = {
    'READY_UP': "Ready Up",
    'SCHEDULED': "Scheduled",
    'GATEKEEPER': "Gatekeeper"
};

/**
 * @param {HydraApi} api
 * @param {RaceState} raceState
 * @param {string} currentPage
 * @returns {jQuery}
 */
export function raceNav(api, raceState, currentPage) {
    let nav = new Nav();
    nav.add('~/races/' + raceState.raceGuid, "Race View", currentPage === 'race');
    nav.add('~/races/' + raceState.raceGuid + '/multi', "Multistream View", currentPage === 'multi');
    if (raceState.entry) {
        nav.add('~/entries/' + raceState.entry.guid, "Runner View", currentPage === 'runner');
    }
    if (raceState.isModerator) {
        nav.add('~/races/' + raceState.raceGuid + '/mod', "Mod View", currentPage === 'mod');
    }

    return nav.node;
}

Page.register(
    class RacePage extends Page {
        get urlPattern() {
            return ['races/guid:raceGuid'];
        }

        render() {

            let raceGuid = this.arg('raceGuid');

            return Promise.all([
                this.api.getRaceWithEntries(raceGuid),
                this.api.getRaceStreams(raceGuid),
                LiveRace.load(this.context, this.api, raceGuid)
            ])
                .then(([/**RaceDataWithEntries*/race, streams, liveRace]) => {
                    let raceState = new RaceState(this.api, null, race);
                    let entry = raceState.entry;

                    let mainStream = this.api.pickStream(streams);
                    let video = new VideoWidget(this.system, this.context, race, mainStream)
                        .setTitle(race.name)
                        .setType('primary')
                        .render();

                    let raceButtons = [];

                    if (raceState.canJoin && !entry) {
                        raceButtons.push({
                            label: "Join",
                            style: "primary",
                            handler: requestMutex(
                                () => this.api.joinRace(race.guid),
                                promise => promise
                                    .then(entry => {
                                        this.system.viewPage('entries', [entry.guid]);
                                    })
                                    .catch(() => alert("Failed to join race."))
                            )
                        });
                    }

                    if (raceButtons.length) {
                        let footer = video.panel.footer();

                        let group = new ButtonGroup("Race Actions");
                        group.node.appendTo(footer);
                        for (let raceButton of raceButtons) {
                            group.addButton(raceButton.label, raceButton.style || 'default')
                                .click(raceButton.handler);
                        }
                    }

                    let raceInfo = panel()
                        .title("Race Information");

                    let timerWidget = new TimerWidget(this.system, this.context);
                    let timer = timerWidget.render();
                    connectTimerToRace(timerWidget, liveRace);

                    new Grid(raceInfo.body())
                        .keyValue()
                        .row("Race Time", timer.nodeInPage(this))
                        .row("Game", gameLink(race.game))
                        .row("Category", categoryLink(race.category))
                        .row("Race Type", STARTUP_TYPES[race.startupType] || race.startupType)
                        .row("Entrants", race.entries.length);

                    let flagModal = null;

                    if (UserRole.parse(race.role).isAtLeast(UserRole.NORMAL)) {
                        flagModal = new FlagModal(this.context, this.api);
                        flagModal.renderModalInPage(this);
                    }

                    let entryPanel = new EntriesWidget(this.system, this.context, video.video, liveRace, streams, flagModal)
                        .render();

                    let chatPanel = ChatWidget.chatPanel(this.context, this.system, [race.announcements, race.viewerChat], race.viewerChat).title("Race Chat");
                    chatPanel.addClass('race-stream-aside');

                    return new Grid()
                        .row()
                        .cell().append(raceNav(this.api, raceState, 'race'))
                        .row()
                        .cell(8).append(video.nodeInPage(this))
                        .cell(4).append(chatPanel)
                        .row()
                        .cell(6).append(raceInfo)
                        .cell(6).append(entryPanel.nodeInPage(this))
                        .node;
                });

        }
    }
);