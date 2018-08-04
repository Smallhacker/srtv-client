import {KeyBind, Queue} from "./utils";

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function sharedPrefixLength(a, b) {
    a = a.trim().toLowerCase();
    b = b.trim().toLowerCase();
    let len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        if (a.charAt(i) !== b.charAt(i)) {
            return i;
        }
    }
    return len;
}

export default class SuggestionInput {
    /**
     * @param {SearchEngine} searchEngine
     * @param {jQuery|null} input
     * @param {number} maxSuggestions
     */
    constructor(searchEngine, input = null, maxSuggestions = Infinity) {
        /**
         * @type {jQuery}
         */
        this.input = input || $('<input type="text">');

        new KeyBind(this.input)
            .onKey('ArrowUp', () => this._move(-1))
            .onKey('ArrowDown', () => this._move(1))
            .onKey('Enter', () => this._pick())
            .onKey('Escape', () => this._closeSuggestions())
            .onKey('Tab', () => {
                this._pick();
                return false;
            });

        /**
         * @type {jQuery}
         * @private
         */
        this._suggestionList = $('<ul>');

        /**
         * @type {jQuery}
         */
        this.node = $('<div class="suggestion-input-container">')
            .append(this.input)
            .append(this._suggestionList);

        this.input
            .on('input', () => this._changed())
            .blur(() => this._closeSuggestions());

        this._suggestions = null;
        this._index = -1;

        /**
         * @type {SearchEngine}
         * @private
         */
        this._searchEngine = searchEngine;

        /**
         * @type {number}
         * @private
         */
        this._maxSuggestions = maxSuggestions;
    }

    /**
     * @returns {boolean}
     * @private
     */
    get _open() {
        return this._suggestions !== null;
    }

    /**
     * @param {string} value
     * @param {string[]} suggestions
     * @private
     */
    _openSuggestions(value, suggestions) {
        if (!suggestions || suggestions.length === 0) {
            this._closeSuggestions();
            return;
        }

        suggestions = suggestions
            .map(s => ({
                value: s,
                prefix: sharedPrefixLength(s, value)
            }))
            .sort((a, b) => {
                if (a.prefix > b.prefix) {
                    return -1;
                }
                if (a.prefix < b.prefix) {
                    return 1;
                }
                if (a.value < b.value) {
                    return -1;
                }
                if (a.value > b.value) {
                    return 1;
                }
                return 0;
            })
            .map(s => s.value);


        if (suggestions.length > this._maxSuggestions) {
            suggestions = suggestions.slice(0, this._maxSuggestions);
        }

        this._suggestions = suggestions;
        this._index = -1;
        this.node.addClass('suggestion-input-open');
        this._suggestionList.empty();

        let index = 0;
        for (let suggestion of suggestions) {
            let s = suggestion;
            $('<li>').text(s)
                .appendTo(this._suggestionList)
                .mousedown(e => {
                    this._selected(s);
                    e.stopPropagation();
                    e.preventDefault();
                    return false;
                })
                .mouseover(this._hover.bind(this, index++));
        }
    }

    _closeSuggestions() {
        if (this._open) {
            this._suggestions = null;
            this._index = -1;
            this.node.removeClass('suggestion-input-open');
            this._suggestionList.empty();
        }
    }

    _changed() {
        let value = this.input.val();
        if (!value) {
            this._closeSuggestions();
            return;
        }

        this._searchEngine.search(value)
            .then(suggestions => this._openSuggestions(value, suggestions));
    }

    /**
     * @param {string} text
     * @private
     */
    _selected(text) {
        this.input.val(text);
        this._closeSuggestions();
        this.input.change();
    }

    _pick() {
        if (this._open) {
            let i = this._index;
            if (i !== -1) {
                this._selected(this._suggestions[i]);
                return;
            }
        }
        return false;
    }

    _move(deltaY) {
        if (this._open) {
            let i = this._index + deltaY;
            let len = this._suggestions.length;
            if (i < 0) {
                i = len - 1;
            } else if (i >= len) {
                i = 0;
            }

            this._hover(i);
        }
    }

    _hover(index) {
        this._index = index;

        let entries = this._suggestionList.children();
        entries.removeClass('suggestion-input-selected');
        if (index !== -1) {
            entries.eq(index).addClass('suggestion-input-selected');
        }
    }
}

export class SearchEngine {
    /**
     * @param {function(string):Promise<string[]>} fetcher
     */
    constructor(fetcher) {
        /**
         * @type {Queue}
         * @private
         */
        this._cacheQueue = new Queue();

        /**
         * @type {Object}
         * @private
         */
        this._cache = Object.create(null);

        /**
         * @type {number}
         * @private
         */
        this._cacheLimit = 30;

        /**
         * @type {function(string):Promise<string[]>}
         * @private
         */
        this._fetcher = fetcher;
    }

    _addToCache(key, value) {
        this._cacheQueue.push(key);
        this._cache[key] = value;

        if (this._cacheQueue.length > this._cacheLimit) {
            this._cacheQueue.pop();
        }
    }

    /**
     * @param term
     * @returns {Promise<string[]>}
     */
    search(term) {
        term = term.trim().toLowerCase();

        if (!term) {
            return Promise.resolve([]);
        }

        if (this._cache[term]) {
            this._cacheQueue.removeValue(term);
            this._cacheQueue.push(term);
            return Promise.resolve(this._cache[term]);
        }

        // If a prefix of `term` is known to have no results, save an unnecessary remote lookup
        for (let i = term.length - 1; i > 0; i--) {
            let t = term.substring(0, i);
            let c = this._cache[t];
            if (c) {
                if (!c.length) {
                    return Promise.resolve([]);
                }
                break;
            }
        }

        return this._fetcher(term)
            .then(strings => {
                this._addToCache(term, strings);
                return strings;
            });
    }
}