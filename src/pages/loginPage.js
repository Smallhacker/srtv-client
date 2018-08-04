'use strict';

import Page from "../page.js";
import {panel} from "../bootstrap.js";
import {formGroup} from "../bootstrap";

Page.register(
    class LoginPage extends Page {
        get urlPattern() {
            return ['login'];
        }

        render() {
            let p = panel('primary')
                .title("Log In");

            let form = $('<form class="form-horizontal">').appendTo(p);

            let username = $('<input type="text" id="input-username">');
            let password = $('<input type="password" id="input-password">');
            let persist = $('<input type="checkbox" id="input-persist" checked>');
            let submit = $('<button type="submit" class="btn btn-primary">').text("Log In");

            let persistLabel = $('<label>').text('Stay logged in ').append(persist);

            formGroup(username, "Username", 10).appendTo(form);
            formGroup(password, "Password", 10).appendTo(form);
            formGroup(persistLabel, null, 10).appendTo(form);
            formGroup(submit, null, 10).appendTo(form);

            let locked = false;

            form.submit(e => {
                e.preventDefault();

                if (locked) {
                    return;
                }
                locked = true;

                let shouldPersist = persist.prop('checked');

                this.api.logIn(username.val(), password.val(), shouldPersist)
                    .then(() => {
                        this.system.viewDefaultPage();
                    })
                    .catch(() => {
                        locked = false;
                        alert("Failed to log in.");
                        //password.val("");
                    });
            });


            return Promise.resolve(p);
        }
    }
);