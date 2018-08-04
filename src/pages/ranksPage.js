'use strict';

import Page from '../page.js';
import {panel} from '../bootstrap.js';
import {Matrix} from "../bootstrap";
import {userLink} from "../model";

Page.register(
    class RanksPage extends Page {
        get urlPattern() {
            return [
                'categories/guid:categoryGuid/ranks'
            ];
        }

        render() {
            let categoryGuid = this.arg('categoryGuid');

            return this.api.getCategoryRanks(categoryGuid)
                .then(ranks => {
                    let p = panel('primary')
                        .title(ranks.name);

                    let table = new Matrix()
                        .col("Rank")
                        .col("Runner")
                        .col("Rating");

                    let array = ranks.ranks || [];

                    let lastRank = 0;
                    let lastRating = -Infinity;
                    for (let entry of array) {
                        let rating = entry.rating;
                        if (rating !== lastRating) {
                            lastRating = rating;
                            lastRank++;
                        }
                        table.row()
                            .cell(lastRank)
                            .cell(userLink(entry))
                            .cell(rating);
                    }

                    table.toTable().appendTo(p.body());

                    return p;
                });
        }
    }
);