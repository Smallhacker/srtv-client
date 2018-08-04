'use strict';

import Page from "../page.js";

Page.register(
    class LogoutPage extends Page {
        get urlPattern() {
            return ['logout'];
        }

        render() {
            return this.api.logOut()
                .then(() => {
                    return {redirect: true};
                });
        }
    }
);