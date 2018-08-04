import Page from "./page";
import HydraApi from "./api/api";
import {panel} from "./bootstrap";
import {TimeFormatter} from "./utils";

const INTERNAL_LINK = 'a[href^="~/"]';

const TITLE_PREFIX = "SpeedRacing TV";
const TITLE_SEPARATOR = " - ";

function onInternalLinkClick(system, page, args, event) {
    event.preventDefault();
    system.viewPage(page, args);
}

function report(state) {
    let ga = window.ga;
    if (ga) {
        ga('set', 'page', state.url);
        ga('send', 'pageview');
    }
}

export class System {
    constructor(api, baseUrl, main, navbar) {
        /**
         * @type {HydraApi}
         */
        this.api = api;

        this._baseUrl = baseUrl;

        /**
         * @type {jQuery}
         * @private
         */
        this._main = main;

        /**
         * @type {jQuery}
         * @private
         */
        this._navbar = navbar;

        this.augmentLinks(navbar);
        navbar.find('[data-link-page]')
            .each(function() {
                let page = $(this).attr('data-link-page');
                $(this).closest('li').attr('data-nav-page', page);
            });

        /**
         * @type {Page|null}
         * @private
         */
        this._currentPage = null;

        window.onpopstate = this._popState.bind(this);
    }

    _augmentLink(internalLink) {
        let args = internalLink.attr('href').substr(2).split('/');
        let newUrl = this._baseUrl + internalLink.attr('href').substr(1);

        let page = args.shift();
        let handler = onInternalLinkClick.bind(null, this, page, args);

        internalLink
            .click(handler)
            .attr('href', newUrl);

        if (!internalLink.is('[data-no-highlight]')) {
            internalLink
                .attr('data-link-page', page);
        }
    }

    /**
     * @param {jQuery} context
     * @returns {jQuery}
     */
    augmentLinks(context) {
        let self = this;
        function augment() {
            return self._augmentLink($(this));
        }

        context
            .filter(INTERNAL_LINK)
            .each(augment);

        context
            .find(INTERNAL_LINK)
            .each(augment);

        return context;
    }

    link(text, ...parts) {
        let url = '~/' + parts.join('/');
        return this.augmentLinks(
            $('<a>').attr('href', url).text(text)
        );
    }

    linkButton(style, text, ...parts) {
        return this.link(text, ...parts)
            .addClass('btn btn-' + (style || 'default'));
    }

    viewDefaultPage(viewType = System.PAGE_VIEW) {
        return this.viewPage('', [], viewType);
    }


    /**
     * @param {string} id
     * @param {string[]} args
     * @param {number} viewType
     * @returns {boolean}
     */
    viewPage(id, args = [], viewType = System.PAGE_VIEW) {
        this._main.empty();
        if (window.HydraDebug) {
            window.HydraDebug.clearApiCalls();
        }

        this._navbar.find('.link-current-span').remove();
        this._navbar.find('.active').removeClass('active');
        this._navbar.find('[data-link-page="' + id + '"]').append($('<span>').addClass('sr-only link-current-span').text(" (current)"));
        this._navbar.find('[data-nav-page="' + id + '"]').addClass('active');

        if (this._currentPage) {
            this._currentPage.context.destroy();
        }

        this._currentPage = Page.create(this, id, args);

        if (this._currentPage) {
            let title = this._createTitle(this._currentPage);
            this._setState(title, id, args, viewType);

            this.renderPage(this._currentPage);
        } else {
            this._main.append(System._notFound());
            this._setTitle();
        }

        return true;
    }

    renderPage(p, meta = null) {
        let title = this._createTitle(p);

        Promise.resolve()
            .then(() => p.render(meta))
            .then(content => {
                if (content.redirect) {
                    let page = content.page || '';
                    let args = content.args || [];
                    this.viewPage(page, args, System.PAGE_REDIRECT);
                } else {
                    this.augmentLinks(content);

                    content.find('[data-toggle="tooltip"]').tooltip();

                    this._main.empty()
                        .append(content);
                    this._setTitle(title);
                    p.postRender();
                }
            })
            .catch(e => {
                this._main.empty()
                    .append(System._loadFailed(e));
                this._setTitle();
            });
    }

    parseUrl(pathName) {
        if (pathName.indexOf(this._baseUrl + '/') === 0) {
            pathName = pathName.substring(this._baseUrl.length + 1);

            let args = pathName.split('/');
            let id = args.shift();
            return {id, args};
        }
        return null;
    }

    _setState(title, id, args, viewType) {
        let url = this._buildHistoryUrl(id, args);
        let state = {id, args, url};
        if (viewType === System.PAGE_FIRST) {
            history.replaceState(state, title, url);
            // Don't report the first page view since that would count it twice
        } else if (viewType === System.PAGE_REDIRECT) {
            history.replaceState(state, title, url);
            report(state);
        } else if (viewType === System.PAGE_VIEW) {
            history.pushState(state, title, url);
            report(state);
        }
    }

    /**
     * @param {Page} page
     * @param {string[]} urlParts
     */
    updateState(page, urlParts) {
        let title = this._createTitle(page);
        let id = urlParts.shift();

        let url = this._buildHistoryUrl(id, urlParts);
        let state = {id, urlParts, url};
        history.replaceState(state, title, url);
        report(state);
    }

    _buildHistoryUrl(id, args) {
        let url = this._baseUrl + '/' + id;
        if (args.length) {
            url += '/' + args.join('/');
        }
        return url;
    }


    get timeFormatter() {
        return new TimeFormatter();
    }

    /**
     * @param {string|null} title
     * @private
     */
    _setTitle(title = TITLE_PREFIX) {
        document.title = title;
    }

    _createTitle(page = null) {
        let title = page && page.title;
        title = title ? TITLE_PREFIX + TITLE_SEPARATOR + title : TITLE_PREFIX;
        return title;
    }

    _popState(event) {
        let state = (event && event.state) || {};
        let id = state.id || '';
        let args = state.args || [];
        this.viewPage(id, args, System.PAGE_BACK);
        report(state);
    }

    static _notFound() {
        return panel('danger')
            .title('Error')
            .body('Page not found');
    }

    static _loadFailed(e) {
        console.error(e);
        return panel('danger')
            .title('Error')
            .body('An unknown error occurred when loading this page.');
    }
}

System.PAGE_VIEW = 0;
System.PAGE_REDIRECT = 1;
System.PAGE_BACK = 2;
System.PAGE_FIRST = 3;