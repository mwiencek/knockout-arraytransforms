var test = require('tape');
var ko = require('knockout');
var common = require('./common.js');

require('../');

test('tests an array’s initial contents', function (t) {
    t.plan(1);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var b = a.any(common.isEven);

    t.equal(b(), true);
});

test('is false when empty', function (t) {
    t.plan(1);

    var a = ko.observableArray([]);
    var b = a.any(common.isEven);

    t.equal(b(), false);
});

test('tests values added via push', function (t) {
    t.plan(2);

    var a = ko.observableArray([]);
    var b = a.any(common.isEven);

    a.push(1)
    t.deepEqual(b(), false);

    a.push(2);
    t.deepEqual(b(), true);
});

test('tests values added via unshift', function (t) {
    t.plan(2);

    var a = ko.observableArray([]);
    var b = a.any(common.isEven);

    a.unshift(1)
    t.deepEqual(b(), false);

    a.unshift(2);
    t.deepEqual(b(), true);
});

test('tests values spliced to the beginning', function (t) {
    t.plan(2);

    var a = ko.observableArray([]);
    var b = a.any(common.isEven);

    a.splice(0, 0, 1)
    t.deepEqual(b(), false);

    a.splice(0, 0, 2);
    t.deepEqual(b(), true);
});

test('tests values spliced to the end', function (t) {
    t.plan(2);

    var a = ko.observableArray([]);
    var b = a.any(common.isEven);

    a.splice(0, 0, 1)
    t.deepEqual(b(), false);

    a.splice(1, 0, 2);
    t.deepEqual(b(), true);
});

test('removes values removed from the original array', function (t) {
    t.plan(2);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var b = a.any(common.isEven);

    t.equal(b(), true);

    a.splice(1, 1); // -> [1, 3, 4, 5, 6, 7, 8, 9]
    a.splice(2, 1); // -> [1, 3, 5, 6, 7, 8, 9]
    a.splice(3, 1); // -> [1, 3, 5, 7, 8, 9]
    a.splice(4, 1); // -> [1, 3, 5, 7, 9]

    t.equal(b(), false);
});

test('re-tests values when they change', function (t) {
    t.plan(2);

    var objects = [
        {num: ko.observable(1)},
        {num: ko.observable(2)},
        {num: ko.observable(3)}
    ];

    var a = ko.observableArray(objects.slice(0));
    var b = a.any(function (object) {return common.isEven(object.num())});

    t.equal(b(), true);

    objects[1].num(5);
    t.equal(b(), false);
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
    var b = a.any(function (object) {return common.isEven(object.num())});

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

    a.any(function (x, i) {
        t.equal(i.peek(), expectedIndex++);
    });
});

test('re-tests values that depend on the index observable', function (t) {
    t.plan(3);

    var a = ko.observableArray(common.orderedInts.slice(0));

    // are any even-indexed values equal to 0?
    var b = a.any(function (n, index) {
        return index() % 2 === 0 ? n === 0 : false;
    });

    t.equal(b(), false);

    a.unshift(0);
    t.equal(b(), true);

    a([1, 0, 1]);
    t.equal(b(), false);
});

test('ignores moves in the original array', function (t) {
    t.plan(1);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var b = a.any(common.isEven);

    a(common.orderedInts.slice(0).reverse());
    t.equal(b(), true);
});
