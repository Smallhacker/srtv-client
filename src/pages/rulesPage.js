'use strict';

import Page from '../page.js';
import {Panel} from "../bootstrap";

Page.register(
    class RulesPage extends Page {
        get urlPattern() {
            return ['rules'];
        }

        render() {
            return this.api.getRules()
                .then(rules => {
                    return new Panel('primary')
                        .title("Site Rules")
                        .body(rules)
                        .node
                        .addClass('srtv-rules');
                });
        }
    }
);