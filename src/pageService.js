'use strict';
import {Matrix, Pagination} from "./bootstrap";
import {toNode} from "./utils";

export default class PageService {
    constructor(system, fetcher, columns, rowRenderer) {
        this._system = system;
        this._fetcher = fetcher;
        this._params = null;
        this._rowRenderer = rowRenderer;

        let matrix = new Matrix();

        for (let column of columns) {
            if (!Array.isArray(column)) {
                column = [column];
            }
            matrix.col.apply(matrix, column);
        }

        let table = matrix.toTable("table-striped");

        this._tbody = table.find('tbody');
        this._paginationTop = new Pagination(page => this._get(page));
        this._paginationBottom = new Pagination(page => this._get(page));
        this.node = $('<div>')
            .addClass('paginated-table')
            .append(this._paginationTop.node)
            .append(table)
            .append(this._paginationBottom.node);

        this._fetching = false;
    }

    params(params) {
        this._params = params;
        return this._get(0);
    }

    /**
     * @param {number} page
     * @returns {Promise<boolean>}
     * @private
     */
    _get(page) {
        if (this._fetching) {
            return Promise.resolve(false);
        }

        this._fetching = true;

        return this._fetcher
            .call(this._fetcher, page, this._params)
            .then(data => {
                this._fetching = false;
                let rows = [];

                let promises = [];

                for (let result of data.results) {
                    let row = $('<tr>');
                    rows.push(row);
                    let rowPromise = Promise.resolve(this._rowRenderer(result))
                        .then(cols => {
                            for (let col of cols) {
                                col = toNode(col);
                                $('<td>')
                                    .append(col)
                                    .appendTo(row);
                            }
                            this._system.augmentLinks(row);
                            return true;
                        });
                    promises.push(rowPromise);
                }

                let pageCount = Math.ceil(data.totalResults / data.resultsPerPage);
                this._paginationTop.update(data.page, pageCount);
                this._paginationBottom.update(data.page, pageCount);

                this._tbody.empty().append(rows);
                return Promise.all(promises);
            })
            .catch(c => {
                this._fetching = true;
                return Promise.reject(c);
            });
    }
}