'use strict';

import Page from '../page.js';
import {panel} from '../bootstrap.js';
import {Matrix} from "../bootstrap";
import FlagType from "../flagType";

Page.register(
    class FlagsPage extends Page {
        get urlPattern() {
            return [
                'categories/guid:categoryGuid/flags',
                'flags'
            ];
        }

        render() {
            let categoryGuid = this.arg('categoryGuid');

            let promise = categoryGuid ? this.api.getCategoryFlags(categoryGuid) : this.api.getAllowedFlags();

            return promise
                .then(flags => {
                    let withRaces = flags.map(flag => {
                        return this.api.getRace(flag.race)
                            .then(race => {
                                flag.race = race;
                                return flag;
                            })
                    });
                    return Promise.all(withRaces);
                })
                .then(/**@type {FlagData[]}*/flags => {


                    let p = panel('primary')
                        .title("Moderation Queue");

                    let table = new Matrix();
                    table.col("Race").col("Flag Type").col("Runner").col("Comment").col();

                    for (/** @type {FlagData} */let flag of flags) {
                        table.row(
                            this.system.link(flag.race.name, 'races', flag.race.guid),
                            FlagType.parseFlagType(flag.type).toHintNode(),
                            flag.entrant ? flag.entrant.name : "(None)",
                            flag.comment,
                            this.system.linkButton(null, "View", 'flags', flag.guid),
                        );
                    }

                    p.body().append(table.toTable());
                    return p;
                });
        }
    }
);