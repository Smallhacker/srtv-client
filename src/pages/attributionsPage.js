'use strict';

import Page from '../page.js';
import {panel} from '../bootstrap.js';
import {Grid, Panel} from "../bootstrap";

Page.register(
    class AttributionsPage extends Page {
        get urlPattern() {
            return ['attributions'];
        }

        render() {
            let p = new Panel('primary')
                .title("Attributions");

            let list = $('<ul>').appendTo(p.body());

            $('<li>Race start sound effect, <a href="https://freesound.org/people/ProjectsU012/sounds/341695/">Coins 1</a>, created by ProjectsU012. <a href="https://creativecommons.org/licenses/by/3.0/">(License)</a></li>')
                .appendTo(list);

            return p.node;
        }
    }
);