'use strict';
import {Widget} from "./widget";
import Rendering from "../rendering";

export default class CategoryWidget extends Widget {
    /**
     * @param {System} system
     * @param {Context} parentContext
     * @param {GameData} game
     * @param {Guid|null} categoryGuid
     */
    constructor(system, parentContext, game, categoryGuid = null) {
        super(system, parentContext);
        this._game = game;
        this._categoryGuid = categoryGuid;
    }

    render() {
        let nav = $('<ul class="nav nav-pills nav-stacked">');

        function link(label, url, active) {
            let li = $('<li role="presentation">').appendTo(nav);
            if (active) {
                li.addClass('active');
            }
            $('<a>').attr('href', url).text(label).appendTo(li);
        }

        link(this._game.name, '~/games/' + (this._game.slug || this._game.guid), this._categoryGuid === null);

        $('<li class="nav-separator">').appendTo(nav);

        for (let category of this._game.categories) {
            link(category.name, '~/categories/' + category.guid, this._categoryGuid === category.guid);
        }

        return new Rendering(this.context, nav);
    }
}