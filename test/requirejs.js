var test = require('tape');
var jsdom = require('jsdom');
var path = require('path');

test('defining custom method names via requirejs config', function(t) {
    t.plan(14);

    var virtualConsole = jsdom.createVirtualConsole().sendTo(console);

    jsdom.env({
        features: {
            FetchExternalResources: ['script'],
            ProcessExternalResources: ['script'],
            SkipExternalResources: false,
        },
        file: path.join(__dirname, 'requirejs.html'),
        done: function (err, window) {
            window.callback = function (ko) {
                var fn = ko.observableArray.fn;

                t.ok(typeof fn.trAll === 'function');
                t.ok(typeof fn.trAny === 'function');
                t.ok(typeof fn.trFilter === 'function');
                t.ok(typeof fn.trGroupBy === 'function');
                t.ok(typeof fn.trMap === 'function');
                t.ok(typeof fn.trReject === 'function');
                t.ok(typeof fn.trSortBy === 'function');

                t.ok(typeof fn.all === 'undefined');
                t.ok(typeof fn.any === 'undefined');
                t.ok(typeof fn.filter === 'undefined');
                t.ok(typeof fn.groupBy === 'undefined');
                t.ok(typeof fn.map === 'undefined');
                t.ok(typeof fn.reject === 'undefined');
                t.ok(typeof fn.sortBy === 'undefined');
            };
        },
        virtualConsole: virtualConsole,
    });
});
