'use strict';

import Page from "../page.js";
import {panel} from "../bootstrap.js";
import {Grid} from "../bootstrap";
import {HydraVideo} from "../video";
import ChatWidget from "../api/chatWidget";
import RaceState from "../raceState";
import {TimerWidget} from "../widgets/timerWidget";
import LiveRace from "../api/liveRace";
import {Mutex} from "../utils";
import {Notifier} from "../notifier";
import {raceNav} from "./racePage";

/**
 * @param {TimerWidget} timerWidget
 * @param {LiveRace} liveRace
 */
export function connectTimerToRace(timerWidget, liveRace) {
    timerWidget.withOffset(liveRace.startupOffset);

    function set(duration) {
        if (duration === null) {
            timerWidget.hideTime();
        } else {
            timerWidget.setAbsoluteTime(duration);
        }
    }

    if (liveRace.isCanceled) {
        set(null);
        return;
    }

    if (liveRace.isEnded) {
        set(liveRace.finalDuration);
        return;
    }

    set(null);

    if (liveRace.isStarted) {
        liveRace.getApproximateStarted()
            .then(stamp => timerWidget.tickTime(stamp));
    } else {
        liveRace.onStarted(() => {
            timerWidget.tickTime();
        })
    }

    liveRace.onCanceled(() => set(null));
    liveRace.onEnded(() => set(liveRace.finalDuration));
}

Page.register(
    class RunnerViewPage extends Page {
        get urlPattern() {
            return ['entries/guid:entryGuid'];
        }

        render() {

            let entryGuid = this.arg('entryGuid');

            return this.api.getEntry(entryGuid)
                .then(entry => Promise
                    .all([
                        this.api.getRace(entry.race.guid),
                        this.api.getUser(entry.player.guid),
                        LiveRace.load(this.context, this.api, entry.race.guid)
                    ])
                    .then(([race, player, liveRace]) => {
                        entry.race = race;
                        entry.player = player;
                        return [entry, liveRace];
                    })
                )
                .then(([/**EntryData*/entry, /**LiveRace*/liveRace]) => {
                    if (entry.player.guid !== this.api.currentUserGuid) {
                        return {
                            redirect: true,
                            page: 'races',
                            args: [entry.race.guid]
                        };
                    }

                    let raceState = new RaceState(this.api, () => {
                        return raceState.refresh();
                    }, entry.race, entry);

                    return this._gui(entry, liveRace, raceState);
                });
        }

        _gui(entry, liveRace, raceState) {
            let race = entry.race;

            let timerWidget = new TimerWidget(this.system, this.context);
            let timer = timerWidget.render();
            connectTimerToRace(timerWidget, liveRace);

            let hooks = {
                'RACE_UPDATE': () =>
                    raceState.refresh()
            };

            let controlPanel = panel('primary').title("Race Controls");
            let timerPanel = panel().title("Race Timer");
            let announcementPanel = ChatWidget.chatPanel(this.context, this.system, [race.announcements], null, hooks).title("Race Announcements");
            let runnerChatPanel = ChatWidget.chatPanel(this.context, this.system, [race.playerChat], race.playerChat).title("Runner Chat");
            let viewerChatPanel = ChatWidget.chatPanel(this.context, this.system, [race.viewerChat], race.viewerChat).title("Viewer Chat");
            let twitchChatPanel = panel().title("Twitch Chat");

            liveRace.onStarting(() => {
                Notifier.RACE_STARTING.trigger();
            });

            timerPanel.body().append(timer.nodeInPage(this));

            let commentForm = $('<form class="runner-view-comment">');

            let group = $('<div class="input-group">')
                .appendTo(commentForm);

            let commentField = $('<input type="text" placeholder="Race Comment" class="form-control">')
                .appendTo(group);
            $('<button type="submit">').addClass("btn btn-default").text("Save")
                .appendTo($('<span class="input-group-btn">').appendTo(group));

            let lastComment = "";

            if (entry.comment) {
                lastComment = entry.comment;
                commentField.val(lastComment);
            }

            commentForm.submit(e => {
                e.preventDefault();
                let comment = commentField.val();
                let olderComment = lastComment;
                lastComment = comment;
                if (comment !== olderComment) {
                    this.api.setRaceComment(entry.guid, lastComment)
                        .then(() => {
                            group.addClass('submit-success');
                            setTimeout(() => {
                                group.removeClass('submit-success');
                            }, 500);
                        })
                        .catch(() => {
                            lastComment = olderComment;
                            alert("Failed to update comment");
                        });
                }
            });

            new Grid(controlPanel.body())
                .row()
                .cell('sm-4').append(raceState.joinButton)
                .cell('sm-4').append(raceState.dnfButton)
                .cell('sm-4').append(raceState.quitButton)

                .row()
                .cell().append(commentForm)

                .node.appendTo(controlPanel.body());

            HydraVideo.embedChat(entry.player.twitch) // TODO
                .appendTo(twitchChatPanel.body());

            return new Grid()
                .row()
                .cell().append(raceNav(this.api, raceState, 'runner'))
                .row()
                .cell(8, 'runner-view-controls').append(controlPanel)
                .cell(4, 'runner-view-timer').append(timerPanel)

                .row()
                .cell(12, 'runner-view-chat-announcements').append(announcementPanel)

                .row()
                .cell(4, 'runner-view-chat-runners').append(runnerChatPanel)
                .cell(4, 'runner-view-chat-viewers').append(viewerChatPanel)
                .cell(4, 'runner-view-chat-twitch').append(twitchChatPanel)

                .node;
        }
    }
);