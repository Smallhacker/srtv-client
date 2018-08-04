'use strict';
import {textNode} from "./utils";

export default class TwitterEmbed {
    constructor(handle, node = null, dark = false) {
        this._handle = handle;
        this._theme = dark ? 'dark' : 'light';
        this.node = node || $('<div>');
    }

    load() {
        let twttr = window.twttr;
        if (twttr) {
            $('<a class="twitter-timeline" data-lang="en">')
                .attr('data-theme', this._theme)
                .attr('href', 'https://twitter.com/' + this._handle)
                .text("Tweets by " + this._handle)
                .appendTo(this.node);
            twttr.widgets.load(this.node[0]);
        } else {
            textNode("Failed to load Twitter feed.").appendTo(this.node);
        }
    }
};

