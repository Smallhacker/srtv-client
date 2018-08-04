'use strict';

import Page from '../page.js';
import {panel} from '../bootstrap.js';
import {Grid, Matrix, Panel} from "../bootstrap";
import TwitterEmbed from "../twitter";
import ChatWidget from "../api/chatWidget";
import Theme from "../theme";
import {categoryLink, gameLink, raceLink} from "../model";
import {intercept} from "../utils";
import TwitchChatWidget from "../widgets/twitchChatWidget";

Page.register(
    class HomePage extends Page {
        get urlPattern() {
            return [''];
        }

        _createTitle(stream) {
            if (!stream) {
                return "SpeedRacing TV";
            }

            if (stream.name) {
                return stream.name + " playing " + stream.race.game.name;
            }
            else {
                return "Live on SpeedRacing TV"
            }
        }

        /**
         * @returns {Promise<StreamData>}
         * @private
         */
        _getStream() {
            return this.api.getHomePageStream()
                .then(stream => {
                    if (!stream) {
                        return null;
                    }

                    if (!stream.race) {
                        return stream;
                    }

                    return this.api.getRace(stream.race.guid)
                        .then(race => {
                            stream.race = race;
                            return stream;
                        });
                })
                .catch(() => {
                    // Failsafe
                    return null;
                });
        }

        render() {
            let racePanel = new Panel('primary').title(this._createTitle(null));
            let twitterPanel = new Panel().title("Tweets");
            let ongoingPanel = new Panel().title("Ongoing Races");
            let upcomingPanel = new Panel().title("Upcoming Races");

            let grid = new Grid();

            let topRow = grid.row()
                .cell(8).append(racePanel.node);

            racePanel.load(this.context, this._getStream())
                .then(stream => {
                    if (stream) {
                        racePanel.title(this._createTitle(stream));
                        let raceBody = racePanel.body()
                            .addClass('home-race-stream embed-responsive embed-responsive-16by9');

                        let video = stream.video
                            .showIn(raceBody);

                        this.context.onDestroy(() => video.context.destroy());

                        this.onPostRender(() => video.init());

                        if (stream.race) {
                            let chatPanel = ChatWidget.chatPanel(this.context, this.system, [stream.race.viewerChat, stream.race.announcements], stream.race.viewerChat);
                            chatPanel.addClass('race-stream-aside');
                            chatPanel.title("Race Chat");
                            chatPanel.body()
                                .addClass('home-race-stream');

                            topRow.cell(4).append(chatPanel);
                        } else {
                            let channel = video.getChannel();
                            if (channel) {
                                let twitchChat = new TwitchChatWidget(this.system, this.context, channel)
                                    .render()
                                    .nodeInPage(this);

                                twitchChat.addClass('race-stream-aside home-race-twitch-chat');

                                topRow.cell(4).append(twitchChat);
                            }
                        }
                    } else {
                        racePanel.body("There are currently no ongoing streams.");
                        racePanel.node.addClass('home-race-chat');
                    }
                });

            /**
             * @param {Panel} panel
             * @param {string} type
             * @param {string[]} flags
             */
            const raceListPanel = (panel, type, flags) => {
                panel.load(this.context,
                    this.api.getRaces(0, null, null, flags)
                )
                    .then(search => {

                        let results = search.results;
                        let len = results.length;
                        if (len > 10) {
                            len = 10;
                        }
                        let table = new Matrix();
                        table.col("");
                        table.col("Race");
                        table.col("Game");

                        for (let i = 0; i < len; i++) {
                            let race = results[i];

                            let imgUrl = this.api.getGameImageUrl(race.game.guid);
                            let img = $('<img>').attr('src', imgUrl).addClass('search-thumbnail');

                            table.row(img, raceLink(race), gameLink(race.game));
                        }

                        if (len === 0) {
                            table.row("", "(None right now)");
                        } else {
                            table.row("", this.system.link("View All", 'races', 'type', type));
                        }

                        panel.body().append(table.toTable());
                        this.system.augmentLinks(panel.body());
                    });
            };

            raceListPanel(ongoingPanel, 'ongoing', ['STARTED', 'POSTJOIN']);
            raceListPanel(upcomingPanel, 'upcoming', ['SCHEDULED', 'CREATED']);


            grid.row()
                .cell(4).append(twitterPanel.node.addClass('home-twitter-embed'))
                .cell(4).append(ongoingPanel.node)
                .cell(4).append(upcomingPanel.node);


            let darkTwitter = Theme.getCurrentTheme().useDarkEmbed;
            let twitter = new TwitterEmbed('SRTVInfo', twitterPanel.body(), darkTwitter);
            this.onPostRender(() => twitter.load());


            return grid.node;
        }
    }
);