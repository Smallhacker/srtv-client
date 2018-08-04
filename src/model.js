'use strict';
import {link} from "./bootstrap";
import {textNode} from "./utils";

/**
 * @param {string} url
 * @param {*} object
 * @returns {jQuery}
 */
export function modelLink(url, object) {
    return link([url, object.slug || object.guid], object.name);
}

/**
 * @param {Function} f
 * @param {Array} array
 * @param {string|null} separator
 * @returns {jQuery}
 */
export function linkArray(f, array, separator = ", ") {
    let span = $('<span>');
    let first = true;
    for (let elem of array) {
        if (first) {
            first = false;
        } else {
            if (separator) {
                span.append(textNode(separator));
            }
        }
        span.append(f(elem));
    }
    return span;
}

/**
 * @param {UserBlurb} user
 * @returns {jQuery}
 */
export function userLink(user) {
    return modelLink('users', user);
}

/**
 * @param {GameBlurb} game
 * @returns {jQuery}
 */
export function gameLink(game) {
    return modelLink('games', game);
}

/**
 * @param {RaceBlurb} race
 * @returns {jQuery}
 */
export function raceLink(race) {
    return modelLink('races', race);
}

/**
 * @param {CategoryBlurb} category
 * @returns {jQuery}
 */
export function categoryLink(category) {
    return modelLink('categories', category);
}