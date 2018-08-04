'use strict';

import {div, h3} from './html.js'
import {isFunction, isNumber, isString, NBSP, textNode, toNode, uniqueId} from "./utils";
import Loader from "./loader";
import FileDrop from "./fileDrop";
import SuggestionInput, {SearchEngine} from "./suggestionInput";

export class Grid {
    /**
     * @param {jQuery|null} node
     * @param {jQuery|null} row
     * @param {jQuery|null} cell
     */
    constructor(node = null, row = null, cell = null) {
        this.node = node || $('<div class="container">');
        this.rowNode = row || $();
        this.cellNode = cell || $();
    }

    /**
     * @param {string|null} cssClass
     * @returns {Grid}
     */
    row(cssClass = null) {
        let row = $('<div class="row">')
            .addClass(cssClass)
            .appendTo(this.node);
        return new Grid(this.node, row);
    }

    /**
     * @param {number|string} width
     * @param {string|null} cssClass
     * @returns {Grid}
     */
    cell(width = 12, cssClass = null) {
        if (isNumber(width)) {
            width = 'md-' + width;
        }

        let classes = width.split(',')
            .map(c => "col-" + c)
            .join(" ");

        let cell = $('<div>')
            .addClass(classes)
            .addClass(cssClass)
            .appendTo(this.rowNode);
        return new Grid(this.node, this.rowNode, cell);
    }

    /**
     * @param {...(jQuery|Element|string)} nodes
     * @returns {Grid}
     */
    append(...nodes) {
        for (let node of nodes) {
            if (isString(node)) {
                node = document.createTextNode(node);
            }
            this.cellNode.append(node);
        }
        return this;
    }

    /**
     * @param {(number|string)} text
     * @returns {Grid}
     */
    label(text) {
        let label = $('<label>').text(text);
        return this.append(label);
    }

    /**
     * @param {number} keyWidth
     * @returns {KeyValueGrid}
     */
    keyValue(keyWidth = 4) {
        return new KeyValueGrid(this, keyWidth);
    }
}

class KeyValueGrid {
    constructor(grid, keyWidth) {
        this._grid = grid;
        this._keyWidth = keyWidth;
        this._valueWidth = 12 - keyWidth;
    }

    row(key, value, skipEmpty = true) {
        if (arguments.length === 1) {
            this._grid
                .row()
                .cell().append(key);
        } else {
            if (skipEmpty) {
                if (!value || (value instanceof jQuery && !value.length)) {
                    return this;
                }
            }

            this._grid
                .row()
                .cell(this._keyWidth).append(toNode(key, 'label'))
                .cell(this._valueWidth).append(toNode(value));
        }

        return this;
    }

    end() {
        return this._grid;
    }
}

export class Matrix {
    constructor() {
        this._rows = [];
        this._cols = [];
        this._maxCol = 0;
        this._rowColCount = 0;
        this._explicitColCount = 0;
        this._currentRow = null;
        this._anyColValue = false;
    }

    /**
     * @param values
     * @returns {Matrix}
     */
    col(...values) {
        this._cols.push(values);
        this._anyColValue = true;
        this._explicitColCount++;
        if (this._explicitColCount > this._maxCol) {
            this._maxCol = this._explicitColCount;
        }
        return this;
    }

    /**
     * @returns {Matrix}
     */
    row() {
        this._rowColCount = 0;
        this._currentRow = [];
        this._rows.push(this._currentRow);

        for (let i = 0; i < arguments.length; i++) {
            let arg = arguments[i];
            this.cell(arg);
        }

        return this;
    }

    /**
     * @param value
     * @param cssClass
     * @returns {Matrix}
     */
    cell(value, cssClass = null) {
        if (!this._currentRow) {
            this.row();
        }

        this._rowColCount++;
        if (this._rowColCount > this._maxCol) {
            this._maxCol = this._rowColCount;
        }

        let node = value;
        if (isString(value) || isNumber(value)) {
            node = $(document.createTextNode(value));
        }
        this._currentRow.push({node, cssClass});
        return this;
    }

    /**
     * @param cssClass
     * @returns {jQuery}
     */
    toTable(cssClass = null) {
        cssClass = "table " + (cssClass || '');
        let table = $('<table>').addClass(cssClass);

        let colGroup = $('<colgroup>').appendTo(table);
        for (let i = 0; i < this._maxCol; i++) {

            let col = this._cols[i];
            let colClass = (col && col[1]) || null;

            $('<col>')
                .addClass(colClass)
                .appendTo(colGroup);
        }

        if (this._anyColValue) {
            let thead = $('<thead>').appendTo(table);
            let tr = $('<tr>').appendTo(thead);
            for (let i = 0; i < this._maxCol; i++) {
                let col = this._cols[i];
                let th = $('<th>')
                    .text((col && col[0]) || NBSP)
                    .appendTo(tr);
            }
        }

        let tbody = $('<tbody>').appendTo(table);
        for (let i = 0; i < this._rows.length; i++) {
            let row = this._rows[i];
            let tr = $('<tr>').appendTo(tbody);
            for (let j = 0; j < this._maxCol; j++) {
                let cell = row[j] || {};
                $('<td>')
                    .addClass(cell.cssClass)
                    .append(cell.node)
                    .appendTo(tr);
            }

        }

        return $('<div class="table-responsive">')
            .append(table);
    }
}

function toGrid(node) {
    let currentRow = null;

    function rowOrNew() {
        return currentRow || (currentRow = node.row());
    }

    node.row = function () {
        currentRow = $('<div class="row">')
            .appendTo(node);
        return node;
    };

    node.grid = function (width = 12) {
        let col = node.col(width);
        return toGrid(col);
    };

    node.col = function (width = 12, content = null) {
        if ($.type(width) !== 'object') {
            width = {sm: width};
        }

        let classes = '';

        let sizes = ['xs', 'sm', 'md', 'lg'];
        for (let i = 0; i < sizes.length; i++) {
            let size = sizes[i];
            if (width[size]) {
                classes += ' col-' + size + '-' + width[size];
            }
        }

        let col = $('<div>')
            .addClass(classes)
            .appendTo(rowOrNew());

        if (content) {
            content = toNode(content);
            col.append(content);
            return node;
        }

        return col;
    };
    return node;
}

/**
 * @param {string|Function|string[]} hrefOrCallback
 * @param {string|null} text
 * @param {string|null} target
 * @returns {jQuery}
 */
export function link(hrefOrCallback = '#', text = null, target = null) {
    let callback = null;
    let href = hrefOrCallback;
    if (isFunction(href)) {
        callback = function (e) {
            hrefOrCallback();
            e.preventDefault();
        };
        href = '#';
    } else if (Array.isArray(href)) {
        href = ['~'].concat(href).join('/');
    }
    let a = $('<a>', {href, text, target});
    if (callback) {
        a.click(callback);
    }
    return a;
}

export class Panel {
    /**
     * @param {string} type
     */
    constructor(type = 'default') {
        /**
         * @type {jQuery}
         * @private
         */
        this._node = div('panel panel-' + type);

        /**
         * @type {jQuery}
         * @private
         */
        this._body = div('panel-body').appendTo(this._node);

        /**
         * @type {jQuery|null}
         * @private
         */
        this._heading = null;

        /**
         * @type {jQuery|null}
         * @private
         */
        this._title = null;

        /**
         * @type {jQuery|null}
         * @private
         */
        this._footer = null;

        /**
         * @type {Loader|null}
         * @private
         */
        this._loader = null;
    }

    /**
     * @returns {jQuery}
     */
    get node() {
        return this._node;
    }

    /**
     * @param {NodeContent|null} content
     * @returns {Panel|jQuery}
     */
    body(content = null) {
        if (content !== null) {
            this._body.empty()
                .append(toNode(content));
            return this;
        }
        return this._body;
    };

    /**
     * @returns {Grid}
     */
    grid() {
        return new Grid(this.body());
    }

    /**
     * @param {NodeContent|null} content
     * @returns {Panel|jQuery}
     */
    heading(content = null) {
        if (!this._heading) {
            this._heading = div('panel-heading')
                .prependTo(this._node);
        }

        if (content !== null) {
            this.title(content);
            return this;
        }

        return this._heading;
    };

    /**
     * @param {NodeContent|null} content
     * @returns {Panel|jQuery}
     */
    title(content = null) {
        if (!this._title) {
            this._title = h3('panel-title')
                .appendTo(this.heading());
        }

        if (content !== null) {
            this._title.empty()
                .append(toNode(content));
            return this;
        }

        return this._title;
    };

    /**
     * @param {NodeContent|null} content
     * @returns {Panel|jQuery}
     */
    footer(content = null) {
        if (!this._footer) {
            this._footer = div('panel-footer')
                .appendTo(this._node);
        }

        if (content !== null) {
            this._footer.empty()
                .append(toNode(content));
            return this;
        }

        return this._title;
    };

    /**
     * @param {Context} parentContext
     * @param {Promise<T>|null} request
     * @returns {Promise<T>|null}
     * @template T
     */
    load(parentContext, request = null) {
        if (!this._loader) {
            let body = this.body().empty();
            this._loader = new Loader(parentContext)
                .appendTo(body);

            this.node.addClass('panel-loading');

            if (request) {
                request.then(
                    () => this.loaded(),
                    () => this.loaded()
                )
            }
        }
        return request;
    }

    loaded() {
        if (this._loader) {
            this._loader.stop();
            this._loader = null;
            this.node.removeClass('panel-loading');
        }
    }
}

export function panel(type = 'default') {
    const panel = div('panel panel-' + type);
    const body = div('panel-body').appendTo(panel);
    let heading = null;
    let title = null;
    let footer = null;

    panel.body = function (text) {
        if (text) {
            body.empty().text(text);
            return panel;
        }
        return body;
    };

    panel.grid = function () {
        return toGrid(panel.body());
    };

    panel.heading = function (text) {
        if (!heading) {
            heading = div('panel-heading').prependTo(panel);
        }

        if (text) {
            panel.title(text);
            return panel;
        }

        return heading;
    };

    panel.title = function (text) {
        if (!title) {
            title = h3('panel-title').appendTo(panel.heading());
        }

        if (text) {
            title.empty().text(text);
            return panel;
        }

        return title;
    };

    panel.footer = function (text) {
        if (!footer) {
            footer = div('panel-footer').appendTo(panel);
        }

        if (text) {
            footer.empty().text(text);
            return panel;
        }

        return footer;
    };

    return panel;
}

export function grid() {
    return toGrid($('<div class="container">'));
}

export class ButtonGroup {
    /**
     * @param {string|null} ariaLabel
     * @param {boolean} vertical
     * @param {string} tag
     */
    constructor(ariaLabel, vertical = false, tag = 'div') {
        let groupClass = 'btn-group' + (vertical ? '-vertical' : '');

        /**
         * @type {jQuery}
         */
        this.node = $('<' + tag + ' role="group">')
            .addClass(groupClass)
            .attr('aria-label', ariaLabel);
    }

    /**
     * @param {string|Function|string[]} hrefOrCallback
     * @param {string|number|null} text
     * @param {string|null} target
     * @param {string} type
     * @returns {ButtonGroupItem}
     */
    addLink(hrefOrCallback = '#', text = null, target = null, type = 'default') {
        let node = link(hrefOrCallback, text, target)
            .addClass('btn btn-' + type);
        this.node.append(node);
        return new ButtonGroupItem(node);
    };

    /**
     * @param {string|number|jQuery|null} content
     * @param {string} type
     * @returns {ButtonGroupItem}
     */
    addButton(content = null, type = 'default') {
        let button = $('<button type="button">')
            .addClass('btn btn-' + type);
        this.node.append(button);

        let item = new ButtonGroupItem(button);

        if (content) {
            button.append(toNode(content));
        }

        return item;
    };
}

export class ButtonGroupItem {
    /**
     * @param {jQuery} node
     */
    constructor(node) {
        /**
         * @type {jQuery}
         */
        this.node = node;
    }

    /**
     * @param {...(jQuery|string|number|HTMLElement)} nodesOrText
     * @returns {ButtonGroupItem}
     */
    append(...nodesOrText) {
        for (let nodeOrText of nodesOrText) {
            let node = toNode(nodeOrText);
            this.node.append(node);
        }
        return this;
    }

    /**
     * @param {string|number} text
     * @returns {*}
     */
    addBadge(text) {
        return this.append(" ", $('<span class="badge">').text(text));
    }

    /**
     * @param {Function} callback
     * @returns {ButtonGroupItem}
     */
    click(callback) {
        this.node.click(callback);
        return this;
    }
}

// TODO: Retire this in favor of the ButtonGroup class
export function buttonGroup(ariaLabel, vertical = false, tag = 'div') {
    let groupClass = 'btn-group' + (vertical ? '-vertical' : '');
    let group = $('<' + tag + ' role="group">')
        .addClass(groupClass)
        .attr('aria-label', ariaLabel);

    let dropdownMenu = null;

    group.link = function (hrefOrCallback = '#', text = null, target = null, type = 'default') {
        link(hrefOrCallback, text, target)
            .addClass('btn btn-' + type)
            .appendTo(group);
        return group;
    };

    group.button = function (content = null, type = 'default') {
        let button = $('<button type="button" class="btn">')
            .addClass('btn-' + type)
            .appendTo(group);
        if (content === null) {
            return button;
        }
        button.append(toNode(content));
        return group;
    };

    group.dropdown = function (text, type = 'default') {
        let dropdown = buttonGroup(null);
        let button = dropdown.button(null, type);
        button.text(text + " ")
            .append($('<span class="caret">'))
            .addClass('dropdown-toggle')
            .attr('data-toggle', 'dropdown')
            .attr('aria-haspopup', 'true')
            .attr('aria-expanded', 'false');
        dropdownMenu = $('<ul class="dropdown-menu">')
            .appendTo(dropdown);
        dropdown.appendTo(group);
        return group;
    };

    group.dropdownLink = function (hrefOrCallback = '#', text = null, target = null) {
        $('<li>')
            .append(link(hrefOrCallback, text, target))
            .appendTo(dropdownMenu);
        return group;
    };

    return group;
}

export function formGroup(input, labelText = null, colWidth = null, srOnly = false, hintText = null) {
    let id = input.attr('id');
    if (input.is('input,textarea,select')) {
        input.addClass('form-control');
    }

    let group = $('<div class="form-group">');
    let label;
    if (labelText) {
        label = $('<label>');
        label.append(hint(labelText, hintText));
        if (id) {
            label.attr('for', id);
        }
        if (srOnly) {
            label.addClass('sr-only');
        }
    } else {
        label = $('<span>');
    }

    label.addClass('control-label').appendTo(group);

    if (colWidth) {
        let labelWidth = 12 - colWidth;
        label.addClass('col-sm-' + labelWidth);
        let col = $('<div>').addClass('col-sm-' + colWidth)
            .append(input)
            .appendTo(group);
    } else {
        group.append(input);
    }
    return group;
}

export class Pagination {
    constructor(callback) {
        this.node = $('<nav aria-label="Page navigation">');
        this.node.addClass('hidden');
        this._ul = $('<ul class="pagination">').appendTo(this.node);

        let prevLink = $('<a href="#" aria-label="Previous">')
            .append('<span aria-hidden="true">&laquo;</span>')
            .click(event => {
                event.preventDefault();
                this.page(this._page - 1);
            });

        let nextLink = $('<a href="#" aria-label="Next">')
            .append('<span aria-hidden="true">&raquo;</span>')
            .click(event => {
                event.preventDefault();
                this.page(this._page + 1);
            });

        this._prevLi = $('<li>').append(prevLink);
        this._nextLi = $('<li>').append(nextLink);

        this._pageCount = 0;
        this._page = 0;
        this._lis = $();
        this._callback = callback;
    }

    page(id) {
        if (id === this._page || id < 0 || id >= this._pageCount) {
            return;
        }

        this._callback(id);
    }

    update(pageId, totalCount = this._pageCount) {
        let paginate = totalCount > 1;
        this.node.toggleClass('hidden', !paginate);

        this._prevLi.detach();
        this._nextLi.detach();

        let lis = [];
        for (let i = 0; i < totalCount; i++) {
            let li = this._pageLi(i);
            lis.push(li[0]);
        }

        this._lis = $(lis);

        this._ul.empty();
        this._ul.append(this._prevLi);
        this._ul.append(this._lis);
        this._ul.append(this._nextLi);


        this._pageCount = totalCount;

        let firstPage = pageId === 0;
        let lastPage = pageId === this._pageCount - 1;

        this._prevLi.toggleClass('disabled', firstPage);
        this._nextLi.toggleClass('disabled', lastPage);

        this._lis.removeClass('active')
            .eq(pageId)
            .addClass('active');
        this._page = pageId;
    }

    _pageLi(id) {
        let link = $('<a href="#">').text(id + 1)
            .click(event => {
                event.preventDefault();
                this.page(id);
            });

        return $('<li>')
            .append(link);
    }
}

/**
 * @param {jQuery} target
 * @param {string|null} text
 * @param {string} direction
 * @returns {jQuery}
 */
export function tooltip(target, text, direction = 'bottom') {
    if (text) {
        target.attr({
            'data-toggle': 'tooltip',
            'data-placement': direction,
            title: text
        });
    }
    return target;
}

/**
 * @param {string} text
 * @param {string|null} hintText
 * @returns {jQuery}
 */
export function hint(text, hintText) {
    if (!hintText) {
        return textNode(text);
    }
    let span = $('<span>', {
        text: text,
        class: 'has-hint'
    });
    return tooltip(span, hintText);
}

export class Form {
    constructor(inputColWidth = 10) {
        this.node = $('<form class="form-horizontal">');
        this._inputColWidth = inputColWidth;
        this._currentNode = this.node;
        this._validators = [];
    }

    _addValidator(node, handler, group, getter = (n => n.val())) {
        this._validators.push({node, handler, getter, group});
    }

    onSubmit(callback) {
        let locked = false;

        function unlock() {
            locked = false;
        }

        this.node.submit(e => {
            e.preventDefault();
            if (locked) {
                return;
            }

            this.node.find('.has-warning, .has-success, .has-error')
                .removeClass('has-warning has-success has-error');
            this.node.find('.help-block').remove();

            let errors = false;
            for (let validator of this._validators) {
                let node = validator.node;
                let val = validator.getter(node);
                let error = validator.handler(val);
                if (error) {
                    let group = validator.group;
                    $('<span class="help-block">')
                        .text(error)
                        .appendTo(group);
                    group.addClass('has-error');
                    errors = true;
                }
            }
            if (errors) {
                return;
            }

            locked = true;

            let promise = callback();
            if (promise && promise.then) {
                promise.then(unlock, unlock);
            } else {
                unlock();
            }
        });
    }

    /**
     * @param {null|string|{action: function, style: string, text: string}} fix
     * @returns {jQuery}
     * @private
     */
    static _fixNode(fix) {
        if (!fix) {
            return $();
        }

        if (fix.action) {
            let button = $('<button>', {
                class: 'btn btn-' + (fix.style || 'default'),
                type: 'button',
                text: fix.text
            }).click(fix.action);

            return $('<div class="input-group-btn">')
                .append(button);
        }

        return $('<div class="input-group-addon">').text(fix);

    }

    /**
     * @param {string} type
     * @param {string} label
     * @param {string|null} value
     * @param {{}} options
     * @returns {jQuery}
     */
    input(type, label, value = null, options = {}) {
        let input = $('<input>')
            .attr('type', type)
            .val(value)
            .addClass('form-control')
            .prop('disabled', !!options.disabled);
        let element = input;
        if (options.prefix || options.suffix) {
            element = $('<div class="input-group">')
                .append(input);

            element.prepend(Form._fixNode(options.prefix));
            element.append(Form._fixNode(options.suffix));
        }

        let group = formGroup(element, label, this._inputColWidth, false, options.hint || null)
            .appendTo(this._currentNode);

        if (options.required) {
            this._addValidator(input, val => {
                return val === "" ? "Value must be set." : null;
            }, group);
        }

        if (options.validate) {
            this._addValidator(input, options.validate, group);
        }

        return input;
    }

    /**
     * @param {string} label
     * @param {string|null} value
     * @param {{}} options
     * @returns {jQuery}
     */
    text(label, value = null, options = {}) {
        return this.input('text', label, value, options);
    }

    /**
     * @param {string} label
     * @param {string|null} value
     * @param {string|null} min
     * @param {string|null} max
     * @param {{}} options
     * @returns {jQuery}
     */
    integer(label, value = null, min = null, max = null, options = {}) {
        return this.number(label, value, min, max, '1', options);
    }

    /**
     * @param {string} label
     * @param {string|null} value
     * @param {string|null} min
     * @param {string|null} max
     * @param {string|null} step
     * @param {{}} options
     * @returns {jQuery}
     */
    decimal(label, value = null, min = null, max = null, step = null, options = {}) {
        return this.number(label, value, min, max, step || '0.001', options);
    }

    /**
     * @param {string} label
     * @param {string|null} value
     * @param {string|null} min
     * @param {string|null} max
     * @param {string|null} step
     * @param {{}} options
     * @returns {jQuery}
     */
    number(label, value = null, min = null, max = null, step = null, options = {}) {
        let input = this.input('number', label, value, options);
        return input
            .attr('min', min)
            .attr('max', max)
            .attr('step', step);
    }

    /**
     * @param {string} label
     * @param {string|null} value
     * @param {{}} options
     * @returns {jQuery}
     */
    password(label, value = null, options = {}) {
        return this.input('password', label, value, options);
    }

    /**
     * @param {string} label
     * @param {string|null} value
     * @param {{}} options
     * @returns {jQuery}
     */
    textArea(label, value = null, options = {}) {
        let input = $('<textarea>')
            .val(value)
            .addClass('form-control')
            .prop('disabled', !!options.disabled);

        let group = formGroup(input, label, this._inputColWidth, false, options.hint || null)
            .appendTo(this._currentNode);

        if (options.validate) {
            this._addValidator(input, options.validate, group);
        }

        return input;
    }

    /**
     * @param {string} label
     * @param {{value: string, label: string}[]} values
     * @param {string|null} value
     * @param {{}} options
     * @returns {jQuery}
     */
    select(label, values = [], value = null, options = {}) {
        let input = $('<select>')
            .addClass('form-control')
            .prop('disabled', !!options.disabled);

        this.setOptions(input, values);
        input.val(value);

        let group = formGroup(input, label, this._inputColWidth, false, options.hint || null)
            .appendTo(this._currentNode);

        if (options.validate) {
            this._addValidator(input, options.validate, group);
        }

        return input;
    }

    /**
     * @param {jQuery} select
     * @param {{value: string, label: string}[]} values
     */
    setOptions(select, values) {
        for (let option of values) {
            $('<option>', {value: option.value, text: option.label})
                .appendTo(select);
        }
    }

    /**
     * @param {string} label
     * @param {{value: string, label: string, }[]} values
     * @param {string[]|null} value
     * @param {{}} options
     * @returns {jQuery}
     */
    multiSelect(label, values, value = null, options = {}) {
        value = value || [];

        let root = $('<span>');

        for (let option of values) {
            let checkboxDiv = $('<div class="checkbox">')
                .appendTo(root);

            let input = $('<input>', {
                type: 'checkbox',
                checked: value.includes(option.value),
                value: option.value
            });

            let label = $('<label>', {text: " " + option.label})
                .prepend(input)
                .appendTo(checkboxDiv);

            if (option.lock) {
                input.prop('checked', true).prop('disabled', true);
                checkboxDiv.addClass('disabled');
            }
        }

        root.val = () => {
            return root
                .find('input:checked')
                .map(function () {
                    return $(this).attr('value');
                })
                .get();
        };

        let group = formGroup(root, label, this._inputColWidth, false, options.hint || null)
            .appendTo(this._currentNode);

        if (options.validate) {
            this._addValidator(root, options.validate, group);
        }

        return root;
    }

    /**
     * @param {string} label
     * @param {boolean} checked
     * @param {{}} options
     * @returns {jQuery}
     */
    checkbox(label, checked = false, options = {}) {
        let input = $('<input type="checkbox">')
            .prop('checked', checked)
            .prop('disabled', !!options.disabled);

        let element = $('<label>')
            .append(input)
            .append(textNode(" "))
            .append(hint(label, options.hint));

        let group = formGroup(element, null, this._inputColWidth, false)
            .appendTo(this._currentNode);

        if (options.validate) {
            this._addValidator(input, options.validate, group, n => n.prop('checked'));
        }

        return input;
    }

    /**
     * @param {string} label
     * @param {number|null} value
     * @param {number|null} min
     * @param {number|null} max
     * @param {{}} options
     * @returns {jQuery}
     */
    duration(label, value = 0, min = null, max = null, options = {}) {
        options.suffix = options.suffix || "seconds";
        return this.input('number', label, value, options)
            .attr('min', min)
            .attr('max', max);
    }

    /**
     * @param {string} label
     * @param {string|null} value
     * @param {{}} options
     * @returns {jQuery}
     */
    dateTime(label, value = null, options = {}) {
        return this.input('datetime-local', label, value, options);
    }

    /**
     * @param {string} label
     * @param {boolean} submit
     * @param {{}} options
     * @returns {jQuery}
     */
    button(label, submit = true, options = {}) {
        let button = $('<button>')
            .text(label)
            .addClass('btn')
            .addClass('btn-' + (options.style || 'primary'))
            .attr('type', submit ? 'submit' : 'button')
            .prop('disabled', !!options.disabled);

        if (options.collapse) {
            button.attr({
                'data-toggle': 'collapse',
                'data-target': '#' + options.collapse,
                'aria-expanded': 'false',
                'aria-controls': options.collapse
            });
        }

        formGroup(button, null, this._inputColWidth, false, options.hint || null)
            .appendTo(this._currentNode);
        return button;
    }

    collapse(id = null) {
        if (id === null) {
            id = uniqueId();
        }

        let div = $('<div class="collapse">').attr('id', id).appendTo(this.node);
        this._currentNode = $('<div class="well">').appendTo(div);

        function eventAdder(eventName) {
            return handler => {
                div.on(eventName, handler);
                return div;
            };
        }

        div.onShow = eventAdder('show.bs.collapse');
        div.onShown = eventAdder('shown.bs.collapse');
        div.onHide = eventAdder('hide.bs.collapse');
        div.onHidden = eventAdder('hidden.bs.collapse');
        div.isOpen = () => div.is('.in');
        div.setHidden = () => div.collapse('hide');
        div.setShown = () => div.collapse('show');
        div.toggleShown = () => div.collapse('toggle');

        return div;
    }

    endCollapse() {
        this._currentNode = this.node;
    }

    /**
     * @param {HydraApi} api
     * @param {string} label
     * @param {string|null} value
     * @param {{}} options
     * @returns {jQuery}
     */
    username(api, label, value = null, options = {}) {
        let user = api.currentUserName;

        let element;
        if (user) {
            options = $.extend({
                suffix: {
                    action: () => {
                        element.val(user);
                    },
                    text: "Me"
                }
            }, options);
        }

        element = this.input('text', label, value, options);
        return element;
    }

    _parseImage(dataUrl) {
        let match = dataUrl && dataUrl.match(/^data:(image\/(?:png|jpg|jpeg|gif));base64,(.*)$/);
        return match && {mime: match[1], base64: match[2]};
    }

    /**
     * @param {string} label
     * @param {{}} options
     * @returns {jQuery}
     */
    imageUpload(label, options = {}) {
        let input = $('<div>')
            .val(value)
            .addClass('image-upload well');

        formGroup(input, label, this._inputColWidth, false, options.hint || null)
            .appendTo(this._currentNode);

        let value = null;

        new FileDrop(input[0], (dataUrl) => {
            let img = this._parseImage(dataUrl);
            if (img) {
                input.addClass('image-upload-set');
                value = img;
                input.empty()
                    .append($('<img>', {src: dataUrl}));
            } else {
                input.removeClass('image-upload-set');
                value = null;
                input.empty();
            }
        }, 'image-upload-hover');

        input.val = () => value;
        return input;
    }

    /**
     * @param {string} label
     * @param {HydraApi} api
     * @param {{}} options
     * @returns {jQuery}
     */
    game(label, api, options = {}) {
        let input = $('<input type="text">')
            .addClass('form-control');

        let se = new SearchEngine(name => {
            return api.getGames(0, name)
                .then(games => games.results.map(game => game.name))
        });
        let suggestions = new SuggestionInput(se, input, 8);

        formGroup(suggestions.node, label, this._inputColWidth, false, options.hint || null)
            .appendTo(this._currentNode);

        return input;
    }
}

export class Nav {
    constructor(type = 'tabs') {
        this.node = $('<nav>');
        this._ul = $('<ul>')
            .addClass('nav nav-' + type)
            .appendTo(this.node);
    }

    /**
     * @param {string} url
     * @param {string} text
     * @param {boolean} active
     * @returns {Nav}
     */
    add(url, text, active = false) {
        let li = $('<li>')
            .attr('role', 'presentation')
            .appendTo(this._ul);

        if (active) {
            li.addClass('active');
        }

        $('<a>')
            .attr('href', url)
            .text(text)
            .appendTo(li);

        return this;
    }
}