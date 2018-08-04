'use strict';
import {PanelWidget} from "./widget";
import Theme from "../theme";

export default class TwitchChatWidget extends PanelWidget {
    /**
     * @param {System} system
     * @param {Context} parentContext
     * @param {string} twitchChannel
     */
    constructor(system, parentContext, twitchChannel) {
        super(system, parentContext);
        this._twitchChannel = twitchChannel;
        this.setTitle("Twitch Chat");
    }

    /**
     * @param panel
     * @param {Rendering} rendering
     * @private
     */
    _panel(panel, rendering) {
        let suffix = Theme.getCurrentTheme().useDarkEmbed ? '?darkpopout' : '';
        $(`<iframe frameborder="0" scrolling="yes" src="https://www.twitch.tv/${this._twitchChannel}/chat${suffix}">`)
            .appendTo(panel.body());
    }
}