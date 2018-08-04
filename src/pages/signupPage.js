'use strict';

import Page from '../page.js';
import {panel} from '../bootstrap.js';

Page.register(
    class SignupPage extends Page {
        get urlPattern() {
            return ['signup'];
        }

        render() {
            let p = panel('primary')
                    .title("Sign Up");

            this.api.signupFrame('resources.speedracing.tv/signup.css', 'speedracing.tv/login')
                .addClass('signup-frame')
                .appendTo(p.body());


            return p;
        }
    }
);