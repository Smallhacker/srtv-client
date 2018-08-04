'use strict';
import {PanelWidget} from "./widget";

export class VideoWidget extends PanelWidget {
    /**
     * @param {System} system
     * @param {Context} parentContext
     * @param {RaceData} race
     * @param {VideoData|null} stream
     * @param {boolean} muted
     */
    constructor(system, parentContext, race, stream, muted = false) {
        super(system, parentContext);
        this._race = race;
        this._stream = stream;
        this._muted = muted;

        /**
         * @type {string|null}
         * @private
         */
        this._bodyClass = null;
    }

    bodyClass(bodyClass) {
        this._bodyClass = bodyClass;
    }

    _createTitle() {
        if (!this._stream) {
            return "Live Stream";
        }

        if (this._stream.name) {
            return this._stream.player.name + " playing " + this._race.game.name;
        }
        else {
            return "Live on SpeedRacing TV"
        }
    }

    /**
     * @param panel
     * @param {Rendering} rendering
     * @private
     */
    _panel(panel, rendering) {
        let body = panel.body();

        let video = null;
        if (this._stream) {
            video = this._stream.video
                .showIn(body);
            this.context.onDestroy(() => video.context.destroy());
            rendering.onPostRender(() => video.init(this._muted));
        } else {
            let text = $('<span>').text("There are currently no live streams of this race.");
            body.append(
                $('<div>').addClass('race-stream-missing').append(text)
            );
        }

        rendering['video'] = video;

        panel.title(this._createTitle());
        body.addClass('embed-responsive embed-responsive-16by9');
        if (this._bodyClass) {
            body.addClass(this._bodyClass);
        }
    }
}