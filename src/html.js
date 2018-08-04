'use strict';

/**
 * @param name
 * @returns {function(string): jQuery}
 */
function tag(name) {
    return function (classes) {
        let node = $('<' + name + '>');
        if (classes) {
            node.addClass(classes);
        }
        return node;
    };
}

/**
 * @type {function(string): jQuery}
 */
export const div = tag('div');

/**
 * @type {function(string): jQuery}
 */
export const h3 = tag('h3');