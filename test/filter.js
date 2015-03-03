var test = require('tape');
var ko = require('knockout');
var common = require('./common.js');

require('../knockout-arraytransforms.js');

test('filters an array’s initial contents', function (t) {
    t.plan(1);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var b = a.filter(common.isEven);

    t.deepEqual(b(), [2, 4, 6, 8]);
});

test('filters values added via push', function (t) {
    t.plan(1);

    var a = ko.observableArray([]);
    var b = a.filter(common.isEven);

    a.push.apply(a, common.orderedInts);
    t.deepEqual(b(), [2, 4, 6, 8]);
});

test('filters values added via unshift', function (t) {
    t.plan(1);

    var a = ko.observableArray([]);
    var b = a.filter(common.isEven);

    a.unshift.apply(a, common.orderedInts);
    t.deepEqual(b(), [2, 4, 6, 8]);
});

test('filters values spliced to the beginning', function (t) {
    t.plan(1);

    var a = ko.observableArray([]);
    var b = a.filter(common.isEven);

    for (var i = 0, len = common.orderedInts.length; i < len; i++) {
        a.splice(0, 0, common.orderedInts[i]);
    }

    t.deepEqual(b(), [8, 6, 4, 2]);
});

test('filters values spliced to the end', function (t) {
    t.plan(1);

    var a = ko.observableArray([]);
    var b = a.filter(common.isEven);

    for (var i = 0, len = common.orderedInts.length; i < len; i++) {
        a.splice(i, 0, common.orderedInts[i]);
    }

    t.deepEqual(b(), [2, 4, 6, 8]);
});

test('removes values removed from the original array', function (t) {
    t.plan(2);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var b = a.filter(common.isEven);

    a.splice(0, 5);
    t.deepEqual(b(), [6, 8]);

    a.splice(0, 4);
    t.deepEqual(b(), []);
});

test('re-filters values when they change', function (t) {
    t.plan(4);

    var objects = [
        {num: ko.observable(1)},
        {num: ko.observable(3)},
        {num: ko.observable(5)}
    ];

    var a = ko.observableArray(objects.slice(0));
    var b = a.filter(function (object) {return common.isEven(object.num())});

    t.deepEqual(b(), []);

    objects[0].num(2);
    t.deepEqual(b(), [objects[0]]);

    objects[1].num(4);
    t.deepEqual(b(), [objects[0], objects[1]]);

    objects[2].num(6);
    t.deepEqual(b(), [objects[0], objects[1], objects[2]]);
});

test('only runs the filter function when it changes', function (t) {
    t.plan(6);

    var objects = [
        {num: ko.observable(0)},
        {num: ko.observable(1)}
    ];

    var spy0 = common.spy(objects[0], 'num');
    var spy1 = common.spy(objects[1], 'num');
    var a = ko.observableArray(objects.slice(0));
    var b = a.filter(function (object) {return common.isEven(object.num())});

    t.equal(spy0.calls, 1);
    t.equal(spy1.calls, 1);

    objects[0].num(2);
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

    a.filter(function (x, i) {
        t.equal(i.peek(), expectedIndex++);
    });
});

test('re-filters values that depend on the index observable', function (t) {
    t.plan(3);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var b = a.filter(function (n, index) {return common.isEven(index())});

    t.deepEqual(b(), [1, 3, 5, 7, 9]);

    a.shift();
    t.deepEqual(b(), [2, 4, 6, 8]);

    a.reverse();
    t.deepEqual(b(), [9, 7, 5, 3]);
});

test('moves values moved in the original array', function (t) {
    t.plan(1);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var b = a.filter(common.isEven);

    a(common.orderedInts.slice(0).reverse());
    t.deepEqual(b(), [8, 6, 4, 2]);
});

test('allows modifying the original array inside a subscription', function (t) {
    t.plan(4);

    var original = [{visible: ko.observable(true)}];
    var a = ko.observableArray(original.slice(0));
    var b = a.filter('visible');
    var c = b.map();
    var toAdd = {visible: ko.observable(true)};

    b.subscribe(function (values) {
        if (!values.length) {
            a.push(toAdd);
        } else if (values.length > 1) {
            a.remove(toAdd);
        }
    });

    original[0].visible(false);
    t.deepEqual(b(), [toAdd]);
    t.deepEqual(c(), b());

    original[0].visible(true);
    t.deepEqual(b(), [original[0]]);
    t.deepEqual(c(), b());
});

test('can insert a new value at index 0 before two swapped values', function (t) {
    t.plan(1);

    var a = ko.observableArray([0, 1, 2, 3]);
    var b = a.filter(common.isEven);

    a([4, 1, 0, 2, 3]);
    t.deepEqual(b(), [4, 0, 2]);
});
