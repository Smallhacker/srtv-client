'use strict';

import Page from '../page.js';
import {panel} from '../bootstrap.js';
import {Grid} from "../bootstrap";

Page.register(
    class UserPage extends Page {
        get urlPattern() {
            return [
                'users/guid:userGuid',
                'users/slug:userSlug'
            ];
        }

        render() {
            let userGuidOrSlug = this.arg('userGuid') || this.arg('userSlug');
            return this.api.getUser(userGuidOrSlug)
                .then(user => {
                    let p = panel('primary')
                        .title(user.name);

                    let grid = new Grid(p.body());
                    grid.row()
                        .cell(2).append("User GUID")
                        .cell(10).append(user.guid);

                    return p;
                });
        }
    }
);