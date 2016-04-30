var proxyquire = require('proxyquire');
var test = require('tape');
var ko = require('./lib/knockout');

proxyquire('../', {knockout: ko});

test('maps changes that trigger nested notifications', function (t) {
    t.plan(3);

    var aCount = 0;
    var bCount = 0;
    var cCount = 0;
    var a = ko.observableArray([]);
    var b = a.map();
    var c = b.map();

    a.subscribe(function () {
        if (aCount < 3) {
            a.push('a' + (aCount++));
        }
    });

    b.subscribe(function () {
        if (bCount < 3) {
            a.push('b' + (bCount++));
        }
    });

    c.subscribe(function () {
        if (cCount < 3) {
            a.push('c' + (cCount++));
        }
    });

    a.push('hello');
    t.deepEqual(a(), ['hello', 'b0', 'a0', 'a1', 'a2', 'c0', 'b1', 'c1', 'b2', 'c2']);
    t.deepEqual(b(), a());
    t.deepEqual(c(), b());
});
