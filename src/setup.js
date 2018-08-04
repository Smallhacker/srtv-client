'use strict';

import "babel-polyfill";
import {System} from "./system";
import HydraApi from "./api/api";
import Theme from "./theme";
import {Notifier} from "./notifier";

export function headSetup() {
    Theme.getUserTheme().writeHtml();
}

export function bodySetup() {

    function loggedIn(user) {
        $('#area-user-name').text(user.name);
        $('.logged-in-only').show();
        $('.logged-out-only').hide();
    }

    function loggedOut() {
        $('#area-user-name').text("");
        $('.logged-in-only').hide();
        $('.logged-out-only').show();
    }

    loggedOut();

    const api = new HydraApi('https://beta.api.speedracing.tv/', 'wss://beta.api.speedracing.tv:45108/');
    api.getRealTimeApi().subscribe('64d80936-ff86-4fe3-a183-e2026b797357');

    api.onLogIn(loggedIn);
    api.onLogOut(loggedOut);

    const system = new System(
        api, '',
        $('#area-main'),
        $('#area-top-nav')
    );

    $('[data-icon]').each(function() {
        let target = $(this);
        let icon = target.attr('data-icon');

        let addMargin = target.contents().length;

        let fa = $('<i>')
            .addClass('fa fa-' + icon)
            .prependTo(target);

        if (addMargin) {
            fa.addClass('nav-icon-margin');
        }

        target.attr('data-icon', null);
    });

    function updateRtapiStats(online) {
        $('#rtapi-live')
            .css('color', online ? '#62c462' : '#ee5f5b');
    }
    system.api.getRealTimeApi().onStatusUpdate(updateRtapiStats);
    updateRtapiStats(true);

    let loadFirstPage = function () {
        let path = location.pathname;
        let firstPage = system.parseUrl(path);
        if (firstPage) {
            system.viewPage(firstPage.id, firstPage.args, System.PAGE_FIRST);
        } else {
            system.viewDefaultPage(System.PAGE_FIRST);
        }
    };

    system.api.autoLogIn()
        .then(
            () => loadFirstPage(),
            () => loadFirstPage()
        );

    Notifier.init();
}