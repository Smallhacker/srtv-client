'use strict';

import Page from '../page.js';
import {panel} from '../bootstrap.js';

const tests = [];

window.UnitTests = class {
    constructor(table, api) {
        this.table = table;
        this.api = api;
    }

    get(name, url, params, expected) {
        return this.runTest(name, this.api._get(url, params || {}), expected);
    }

    post(name, url, data, expected) {
        return this.runTest(name, this.api._post(url, data || {}), expected);
    }

    runTest(name, promise, expected) {
        function fa(name, spin = false) {
            let fa = $('<i>').addClass('fa fa-' + name);
            if (spin) {
                fa.addClass('fa-spin');
            }
            return fa;
        }

        let row = $('<tr>').appendTo(this.table);
        let status = $('<td>').append(fa('spinner', true)).appendTo(row);
        $('<td>').text(name).appendTo(row);
        let message = $('<td>').appendTo(row);

        function setSuccess() {
            status.empty().append(fa('check'));
            row.addClass('success');
        }

        function setWarning(warnings) {
            status.empty().append(fa('warning'));
            row.addClass('warning');
            let ul = $('<ul>').appendTo(message);
            for (let warning of warnings) {
                $('<li>').text(warning.warning).appendTo(ul);
            }
        }

        function setError(errors) {
            status.empty().append(fa('times'));
            row.addClass('danger');
            let ul = $('<ul>').appendTo(message);
            for (let error of errors) {
                $('<li>').text(error.error).appendTo(ul);
            }
        }

        promise
            .then(data => {
                if ($.type(expected) === 'function') {
                    return expected(data);
                }
                return UnitTests.checkEqual('root', expected, data);
            })
            .catch(e => {
                return [UnitTests.error("Error: " + JSON.stringify(e))];
            })
            .then(problems => {
                let errors = problems.filter(p => p.hasOwnProperty('error'));
                if (errors.length) {
                    setError(errors);
                    return;
                }

                let warnings = problems.filter(p => p.hasOwnProperty('warning'));
                if (warnings.length) {
                    setWarning(warnings);
                    return;
                }

                setSuccess();
            });
    }

    static checkEqual(path, expected, actual) {
        let type = UnitTests.typeOf(expected);
        let actualType = UnitTests.typeOf(actual);
        if (type !== actualType) {
            return [UnitTests.error(path + " is of type " + actualType + ", expected " + type)];
        }

        let problems = [];

        switch (type) {
            case 'boolean':
            case 'number':
            case 'string':
                if (!UnitTests.isAny(expected)) {
                    if (expected !== actual) {
                        return [UnitTests.error(path + " (" + type + ") is \"" + actual + "\", expected \"" + expected + "\"")];
                    }
                }
                break;
            case 'object':
                let visited = {};

                for (let key in expected) {
                    if (expected.hasOwnProperty(key)) {
                        visited[key] = true;
                        problems = problems.concat(
                            UnitTests.checkEqual(path + "." + key, expected[key], actual[key])
                        );
                    }
                }

                for (let key in actual) {
                    if (actual.hasOwnProperty(key) && !visited.hasOwnProperty(key)) {
                        problems.push(UnitTests.warning(path + "." + key + " is undocumented"));
                    }
                }
                break;
            case 'array':
                for (let i = 0; i < expected.length; i++) {
                    problems = problems.concat(
                        UnitTests.checkEqual(path + "[" + i + "]", expected[i], actual[i])
                    );
                }

                if (actual.length > expected.length) {
                    problems.push(UnitTests.warning(path + " has " + actual.length + " elements, expected " + expected.length));
                }
                break;
        }
        return problems;
    }

    static isAny(d) {
        return d === UnitTests.ANY_BOOLEAN || d === UnitTests.ANY_STRING || d === UnitTests.ANY_NUMBER;
    }

    static typeOf(d) {
        if (d === UnitTests.ANY_BOOLEAN) {
            return 'boolean';
        }
        if (d === UnitTests.ANY_NUMBER) {
            return 'number';
        }
        if (d === UnitTests.ANY_STRING) {
            return 'string';
        }
        return $.type(d);
    }

    static error(text) {
        return {error: text};
    }

    static warning(text) {
        return {warning: text};
    }

    static addTests(f) {
        tests.push(f);
    }
};

UnitTests.ANY_BOOLEAN = {};
UnitTests.ANY_STRING = {};
UnitTests.ANY_NUMBER = {};

Page.register(
    class TestPage extends Page {
        get urlPattern() {
            return [
                'unitTests'
            ];
        }

        render() {
            let p = panel('danger')
                .title("API Unit Tests");

            let table = $('<table class="table">').appendTo(p.body());

            setTimeout(() => {
                for (let t of tests) {
                    t(new UnitTests(table, this.api));
                }
            }, 100);

            return p;
        }
    }
);

