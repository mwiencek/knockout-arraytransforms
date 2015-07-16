var test = require('tape');
var ko = require('knockout');
var common = require('./common.js');

require('../');

var squaredInts = [1, 4, 9, 16, 25, 36, 49, 64, 81];

function square(x) {
    return x * x;
}

test('maps an array’s initial contents', function (t) {
    t.plan(1);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var b = a.map(square);

    t.deepEqual(b(), squaredInts);
});

test('maps values added via push', function (t) {
    t.plan(1);

    var a = ko.observableArray([]);
    var b = a.map(square);

    a.push.apply(a, common.orderedInts);
    t.deepEqual(b(), squaredInts);
});

test('maps values added via unshift', function (t) {
    t.plan(1);

    var a = ko.observableArray([]);
    var b = a.map(square);

    a.unshift.apply(a, common.orderedInts);
    t.deepEqual(b(), squaredInts);
});

test('maps values spliced to the beginning', function (t) {
    t.plan(1);

    var a = ko.observableArray([]);
    var b = a.map(square);

    for (var i = 0, len = common.orderedInts.length; i < len; i++) {
        a.splice(0, 0, common.orderedInts[i]);
    }

    t.deepEqual(b(), squaredInts.slice(0).reverse());
});

test('maps values spliced to the end', function (t) {
    t.plan(1);

    var a = ko.observableArray([]);
    var b = a.map(square);

    for (var i = 0, len = common.orderedInts.length; i < len; i++) {
        a.splice(i, 0, common.orderedInts[i]);
    }

    t.deepEqual(b(), squaredInts);
});

test('removes values removed from the original array', function (t) {
    t.plan(2);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var b = a.map(square);

    a.splice(0, 5);
    t.deepEqual(b(), [36, 49, 64, 81]);

    a.splice(0, 4);
    t.deepEqual(b(), []);
});

test('re-maps values when they change', function (t) {
    t.plan(4);

    var objects = [
        {num: ko.observable(1)},
        {num: ko.observable(2)},
        {num: ko.observable(3)}
    ];

    var a = ko.observableArray(objects.slice(0));
    var b = a.map(function (object) {return square(object.num())});

    t.deepEqual(b(), [1, 4, 9]);

    objects[0].num(4);
    t.deepEqual(b(), [16, 4, 9]);

    objects[1].num(5);
    t.deepEqual(b(), [16, 25, 9]);

    objects[2].num(6);
    t.deepEqual(b(), [16, 25, 36]);
});

test('only runs the map function when it changes', function (t) {
    t.plan(6);

    var objects = [
        {num: ko.observable(1)},
        {num: ko.observable(2)}
    ];

    var spy0 = common.spy(objects[0], 'num');
    var spy1 = common.spy(objects[1], 'num');

    var a = ko.observableArray(objects.slice(0));
    var b = a.map(function (object) {return square(object.num())});

    t.equal(spy0.calls, 1);
    t.equal(spy1.calls, 1);

    objects[0].num(3);
    t.equal(spy0.calls, 3);
    t.equal(spy1.calls, 1);

    objects[1].num(4);
    t.equal(spy0.calls, 3);
    t.equal(spy1.calls, 3);
});

test('will move existing mapped values when the original values move', function (t) {
    t.plan(2);

    var objects = [
        {num: ko.observable(1)},
        {num: ko.observable(2)}
    ];

    function NumberHolder(num) {
        this.num = num;
    }

    var spy0 = common.spy(objects[0], 'num');
    var spy1 = common.spy(objects[1], 'num');

    var a = ko.observableArray(objects.slice(0));
    var b = a.map(function (object) {return new NumberHolder(object.num())});

    var underlyingB = b.peek();
    var nh0 = underlyingB[0];
    var nh1 = underlyingB[1];

    a.reverse();
    t.equal(underlyingB[0], nh1);
    t.equal(underlyingB[1], nh0);
});

test('passes the value’s index as the second argument to the callback', function (t) {
    t.plan(9);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var expectedIndex = 0;

    a.map(function (x, i) {
        t.equal(i.peek(), expectedIndex++);
    });
});

test('re-maps values that depend on the index observable', function (t) {
    t.plan(2);

    var animals = ko.observableArray(['cat', 'dog', 'goat']);

    var ranks = animals.map(function (name, index) {
        return name + ': ' + (index() + 1);
    });

    t.deepEqual(ranks(), ['cat: 1', 'dog: 2', 'goat: 3']);

    animals.reverse();
    t.deepEqual(ranks(), ['goat: 1', 'dog: 2', 'cat: 3']);
});

test('can insert a new value at index 0 before two swapped values', function (t) {
    t.plan(1);

    var a = ko.observableArray([0, 1, 2, 3]);
    var b = a.map(function (x) {return x + 1});

    a([4, 1, 0, 2, 3]);
    t.deepEqual(b(), [5, 2, 1, 3, 4]);
});
