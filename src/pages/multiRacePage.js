'use strict';

import Page from "../page.js";
import {Grid} from "../bootstrap";
import {VideoWidget} from "../widgets/videoWidget";
import {HydraVideo} from "../video";
import {raceNav} from "./racePage";
import RaceState from "../raceState";

const ONE_PER_ROW = 'md-12,sm-12';
const TWO_PER_ROW = 'md-6,sm-6';
const THREE_PER_ROW = 'md-4,sm-6';

Page.register(
    class MultiRacePage extends Page {
        get urlPattern() {
            return ['races/guid:raceGuid/multi'];
        }

        render() {

            let raceGuid = this.arg('raceGuid');

            return Promise.all([
                this.api.getRaceWithEntries(raceGuid),
                this.api.getRaceStreams(raceGuid)
            ])
                .then(([race, streams]) => {

                    /**/

                    let grid = new Grid();

                    let raceState = new RaceState(this.api, null, race);
                    grid.row().cell().append(raceNav(this.api, raceState, 'multi'));

                    let row = grid.row();

                    let videoSize;
                    let runnerCount = streams.runner.length;
                    if (runnerCount <= 1) {
                        videoSize = ONE_PER_ROW;
                    } else if (runnerCount <= 4) {
                        videoSize = TWO_PER_ROW;
                    } else {
                        videoSize = THREE_PER_ROW;
                    }

                    for (let stream of streams.runner) {
                        stream.video = new HydraVideo(this.api);
                        stream.video.channel(stream.player.twitch, stream.player.guid);

                        let cell = row.cell(videoSize);

                        let video = new VideoWidget(this.system, this.context, race, stream, true)
                            .setTitle(race.name)
                            .setType('primary')
                            .renderInPage(this, cell.cellNode);
                    }

                    return grid.node;
                });

        }
    }
);