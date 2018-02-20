var proxyquire = require('proxyquire');
var test = require('tape');
var ko = require('./lib/knockout');
var common = require('./common.js');

proxyquire('../', {knockout: ko});

test('tests an array’s initial contents', function (t) {
    t.plan(1);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var b = a.all(common.isEven);

    t.equal(b(), false);
});

test('is true when empty', function (t) {
    t.plan(1);

    var a = ko.observableArray([]);
    var b = a.all(common.isEven);

    t.equal(b(), true);
});

test('tests values added via push', function (t) {
    t.plan(2);

    var a = ko.observableArray([]);
    var b = a.all(common.isEven);

    a.push(2);
    t.deepEqual(b(), true);

    a.push(1)
    t.deepEqual(b(), false);
});

test('tests values added via unshift', function (t) {
    t.plan(2);

    var a = ko.observableArray([]);
    var b = a.all(common.isEven);

    a.unshift(2);
    t.deepEqual(b(), true);

    a.unshift(1)
    t.deepEqual(b(), false);
});

test('tests values spliced to the beginning', function (t) {
    t.plan(2);

    var a = ko.observableArray([]);
    var b = a.all(common.isEven);

    a.splice(0, 0, 2);
    t.deepEqual(b(), true);

    a.splice(0, 0, 1)
    t.deepEqual(b(), false);
});

test('tests values spliced to the end', function (t) {
    t.plan(2);

    var a = ko.observableArray([]);
    var b = a.all(common.isEven);

    a.splice(0, 0, 2);
    t.deepEqual(b(), true);

    a.splice(1, 0, 1)
    t.deepEqual(b(), false);
});

test('removes values removed from the original array', function (t) {
    t.plan(2);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var b = a.all(common.isEven);

    t.equal(b(), false);

    a.splice(0, 1); // -> [2, 3, 4, 5, 6, 7, 8, 9]
    a.splice(1, 1); // -> [2, 4, 5, 6, 7, 8, 9]
    a.splice(2, 1); // -> [2, 4, 6, 7, 8, 9]
    a.splice(3, 1); // -> [2, 4, 6, 8, 9]
    a.splice(4, 1); // -> [2, 4, 6, 8]

    t.equal(b(), true);
});

test('re-tests values when they change', function (t) {
    t.plan(2);

    var objects = [
        {num: ko.observable(1)},
        {num: ko.observable(2)},
        {num: ko.observable(3)}
    ];

    var a = ko.observableArray(objects.slice(0));

    var b = a.all(function (object) {
        return common.isEven(object.num());
    });

    t.equal(b(), false);

    objects[0].num(4);
    objects[2].num(6);
    t.equal(b(), true);
});

test('only runs the test function when it changes', function (t) {
    t.plan(6);

    var objects = [
        {num: ko.observable(1)},
        {num: ko.observable(2)}
    ];

    var spy0 = common.spy(objects[0], 'num');
    var spy1 = common.spy(objects[1], 'num');

    var a = ko.observableArray(objects.slice(0));

    var b = a.all(function (object) {
        return common.isEven(object.num());
    });

    t.equal(spy0.calls, 1);
    t.equal(spy1.calls, 1);

    objects[0].num(3);
    t.equal(spy0.calls, 3);
    t.equal(spy1.calls, 1);

    objects[1].num(4);
    t.equal(spy0.calls, 3);
    t.equal(spy1.calls, 3);
});

test('passes the value’s index as the second argument to the callback', function (t) {
    t.plan(9);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var expectedIndex = 0;

    a.all(function (x, i) {
        t.equal(i.peek(), expectedIndex++);
    });
});

test('re-tests values that depend on the index observable', function (t) {
    t.plan(4);

    var a = ko.observableArray(common.orderedInts.slice(0));

    // are all even-indexed values equal to 0?
    var b = a.all(function (n, index) {
        return index() % 2 === 0 ? n === 0 : true;
    });

    t.equal(b(), false);

    a([0, 0, 0]);
    t.equal(b(), true);

    a([0, 1, 0]);
    t.equal(b(), true);

    a([0, 1, 1]);
    t.equal(b(), false);
});

test('ignores moves in the original array', function (t) {
    t.plan(1);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var b = a.all(common.isEven);

    a(common.orderedInts.slice(0).reverse());
    t.equal(b(), false);
});
