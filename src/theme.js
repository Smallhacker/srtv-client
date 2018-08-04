'use strict';

import {Persistent} from "./utils";

let THEMES = {};
let THEME_ARRAY = [];
let DEFAULT_THEME = null;
const LINK_ELEMENT_ID = 'bootstrap-css';
const THEME_SETTING = Persistent.string('srtv/user/theme');

export default class Theme {
    constructor(id, name, cssFile, useDarkEmbed = false) {
        this.id = id;
        this.name = name;
        this.cssFile = cssFile;
        this.useDarkEmbed = useDarkEmbed;
        THEMES[id] = this;
        if (!DEFAULT_THEME) {
            DEFAULT_THEME = this;
        }
        this.index = THEME_ARRAY.length;
        THEME_ARRAY.push(this);
    }

    /**
     * @returns {string}
     */
    static getUserThemeId() {
        return THEME_SETTING.get();
    }

    /**
     * @returns {Theme}
     */
    static getUserTheme() {
        let id = Theme.getUserThemeId();
        return Theme.getTheme(id);
    }

    /**
     * @returns {Theme}
     */
    static getTheme(id) {
        if (!id) {
            return THEME_ARRAY[0];
        }
        return THEMES[id] || THEME_ARRAY[0];
    }

    /**
     * @returns {Theme[]}
     */
    static getThemes() {
        return THEME_ARRAY;
    }

    /**
     * @returns {Theme}
     */
    static getCurrentTheme() {
        let url = Theme.cssNode().attr('href');
        for (let id in THEMES) {
            if (THEMES.hasOwnProperty(id)) {
                if (THEMES[id].cssFile === url) {
                    return THEMES[id];
                }
            }
        }
        return THEME_ARRAY[0];
    }

    static cycle() {
        let current = Theme.getCurrentTheme();
        let index = (current.index + 1) % THEME_ARRAY.length;
        THEME_ARRAY[index].switchTo();
    }

    switchTo() {
        if (this === Theme.getCurrentTheme()) {
            return;
        }

        THEME_SETTING.set(this.id);

        let style = $('<style>').text('*{transition:all 0.2s}')
            .appendTo(document.body);

        setTimeout(() => {
            Theme.cssNode()
                .attr('href', this.cssFile)
        }, 0);

        setTimeout(() => {
            style.remove()
        }, 300);
    }

    static cssNode() {
        return $('#' + LINK_ELEMENT_ID);
    }

    writeHtml() {
        document.write('<link href="' + this.cssFile + '" rel="stylesheet" id="' + LINK_ELEMENT_ID + '">');
    }
}

new Theme('dark', "Dark Theme", '/_bootstrap/css/slate.min.css', true);
new Theme('light', "Light Theme", '/_bootstrap/css/bootstrap.min.css');
