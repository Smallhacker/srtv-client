'use strict';
import {panel} from "./bootstrap";
import {textNode} from "./utils";
import {Notifier} from "./notifier";

export default function debugSetup() {
    if (window.location.hostname === 'localhost' || window.location.search === '?enableDebug') {
        let nextContext = 1;
        let contexts = [];

        let debugPanel = panel('danger');

        debugPanel
            .title("DEBUG")
            .css({position: 'fixed', right: 0, bottom: 0, margin: 0});

        let body = debugPanel.body();
        debugPanel.body().hide();

        let eventTrigger = event => {
            return () => {
                Notifier.trigger(event);
            };
        };

        for (let event of Notifier.getEvents()) {
            $('<button>')
                .text(event.title)
                .click(eventTrigger(event))
                .appendTo(body)
        }

        let contextRoot = $('<ul>').appendTo(body);
        let apiRoot = $('<ul>').appendTo(body);

        debugPanel.title().click(() => {
            debugPanel.body().toggle();
        });

        let refreshContexts = () => {
            let parents = Object.create(null);
            parents[0] = contextRoot.empty();
            let orphans = null;

            let c = [].concat(contexts);
            while (c.length) {

                c = c.filter(/**Context*/context => {
                    function render(parentNode) {
                        let id = context._contextId;
                        let li = $('<li>').text(id + " " + (context._contextName || "<unknown>")).appendTo(parentNode);
                        parents[id] = $('<ul>').appendTo(li);
                    }

                    let parentId = (context._parent && context._parent._contextId) || 0;
                    if (parents[parentId]) {
                        render(parents[parentId]);
                        return false;
                    } else {
                        if (!contexts.includes(context._parent)) {
                            orphans = orphans || $('<li>').text("ORPHANS").appendTo(contextRoot);
                            render(orphans);
                            return false;
                        }
                    }
                    return true;
                });
            }
        };

        window.HydraDebug = {
            /**
             * @param {Context} context
             */
            registerContext: context => {
                context._contextId = nextContext++;
                contexts.push(context);
                context.onDestroy(() => {
                    contexts = contexts.filter(c => c !== context);
                    refreshContexts();
                });
                refreshContexts();
            },

            /**
             * @param {Contextual} contextual
             */
            registerContextual: contextual => {
                contextual.context._contextName = contextual.constructor && contextual.constructor.name;
                refreshContexts();
            },

            apiCall: (method, url) => {
                if (url === 'https://api.speedracing.tv/time') {
                    return;
                }
                let callNode = $('<li>');
                callNode.append(textNode(method + " "));
                callNode.append($('<a>', {
                    href: url,
                    target: '_blank',
                    text: url
                }));
                callNode.appendTo(apiRoot);
            },

            clearApiCalls: () => {
                apiRoot.empty();
            }
        };

        $(document).ready(() => {
            debugPanel.appendTo(document.body);
        });
    }
}