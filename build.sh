#!/bin/bash

cat > dist/knockout-arraytransforms.js <<EOJS
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define(['knockout', 'module'], function (ko, module) {
            factory(function (name) {
                if (name === 'knockout') {
                    return ko;
                }
            }, module);
            return window.knockoutArraytransforms;
        });
    } else {
        factory(require || function (name) {
            if (name === 'knockout') {
                return window.ko;
            }
        });
    }
}(function (require, requireJsModule) {
EOJS

./node_modules/.bin/browserify index.js -x knockout >> dist/knockout-arraytransforms.js

cat >> dist/knockout-arraytransforms.js <<EOJS
}));
EOJS
