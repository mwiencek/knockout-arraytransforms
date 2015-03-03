var test = require('tape');
var ko = require('knockout');
var common = require('./common.js');

require('../knockout-arraytransforms.js');

test('groups an array’s initial contents', function (t) {
    t.plan(2);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var b = a.groupBy(common.isEven);

    t.deepEqual(b()[0].values(), [1, 3, 5, 7, 9]);
    t.deepEqual(b()[1].values(), [2, 4, 6, 8]);
});

test('groups values added via push', function (t) {
    t.plan(2);

    var a = ko.observableArray([]);
    var b = a.groupBy(common.isEven);

    a.push.apply(a, common.orderedInts);
    t.deepEqual(b()[0].values(), [1, 3, 5, 7, 9]);
    t.deepEqual(b()[1].values(), [2, 4, 6, 8]);
});

test('groups values added via unshift', function (t) {
    t.plan(2);

    var a = ko.observableArray([]);
    var b = a.groupBy(common.isEven);

    a.unshift.apply(a, common.orderedInts);
    t.deepEqual(b()[0].values(), [1, 3, 5, 7, 9]);
    t.deepEqual(b()[1].values(), [2, 4, 6, 8]);
});

test('groupBy values spliced to the beginning', function (t) {
    t.plan(2);

    var a = ko.observableArray([]);
    var b = a.groupBy(common.isEven);

    for (var i = 0, len = common.orderedInts.length; i < len; i++) {
        a.splice(0, 0, common.orderedInts[i]);
    }

    t.deepEqual(b()[0].values(), [9, 7, 5, 3, 1]);
    t.deepEqual(b()[1].values(), [8, 6, 4, 2]);
});

test('groups values spliced to the end', function (t) {
    t.plan(2);

    var a = ko.observableArray([]);
    var b = a.groupBy(common.isEven);

    for (var i = 0, len = common.orderedInts.length; i < len; i++) {
        a.splice(i, 0, common.orderedInts[i]);
    }

    t.deepEqual(b()[0].values(), [1, 3, 5, 7, 9]);
    t.deepEqual(b()[1].values(), [2, 4, 6, 8]);
});

test('removes values removed from the original array', function (t) {
    t.plan(3);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var b = a.groupBy(common.isEven);

    a.splice(0, 5);
    t.deepEqual(b()[0].values(), [7, 9]);
    t.deepEqual(b()[1].values(), [6, 8]);

    a.splice(0, 4);
    t.equal(b().length, 0);
});

test('re-groups values when they change', function (t) {
    t.plan(4);

    var objects = [
        {num: ko.observable(1)},
        {num: ko.observable(2)},
        {num: ko.observable(3)}
    ];

    var a = ko.observableArray(objects.slice(0));
    var b = a.groupBy(function (object) {return common.isEven(object.num())});

    t.deepEqual(ko.toJS(b), [
        {key: 'false', values: [{num: 1}, {num: 3}]},
        {key: 'true', values: [{num: 2}]}
    ]);

    objects[0].num(2);
    objects[1].num(4);

    t.deepEqual(ko.toJS(b), [
        {key: 'false', values: [{num: 3}]},
        {key: 'true', values: [{num: 2}, {num: 4}]}
    ]);

    b.subscribe(function (changes) {
        t.deepEqual(ko.toJS(changes), [
            {status: 'deleted', index: 0, value: {key: 'false', values: []}}
        ]);
    }, null, 'arrayChange');

    objects[2].num(6);

    t.deepEqual(ko.toJS(b), [
        {key: 'true', values: [{num: 2}, {num: 4}, {num: 6}]}
    ]);
});

test('only runs the groupBy function when it changes', function (t) {
    t.plan(12);

    var objects = [
        {num: ko.observable(1)},
        {num: ko.observable(2)},
        {num: ko.observable(3)}
    ];

    var spy0 = common.spy(objects[0], 'num');
    var spy1 = common.spy(objects[1], 'num');
    var spy2 = common.spy(objects[2], 'num');

    var a = ko.observableArray(objects.slice(0));
    var b = a.groupBy(function (object) {return common.isEven(object.num())});

    t.equal(spy0.calls, 1);
    t.equal(spy1.calls, 1);
    t.equal(spy2.calls, 1);

    objects[0].num(2);
    t.equal(spy0.calls, 3);
    t.equal(spy1.calls, 1);
    t.equal(spy2.calls, 1);

    objects[1].num(3);
    t.equal(spy0.calls, 3);
    t.equal(spy1.calls, 3);
    t.equal(spy2.calls, 1);

    objects[2].num(4);
    t.equal(spy0.calls, 3);
    t.equal(spy1.calls, 3);
    t.equal(spy2.calls, 3);
});

test('passes the value’s index as the second argument to the callback', function (t) {
    t.plan(9);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var expectedIndex = 0;

    a.groupBy(function (x, i) {
        t.equal(i.peek(), expectedIndex++);
    });
});

test('re-groups values that depend on the index observable', function (t) {
    t.plan(3);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var b = a.groupBy(function (n, index) {return common.isEven(index())});

    t.deepEqual(ko.toJS(b), [
        {key: 'true', values: [1, 3, 5, 7, 9]},
        {key: 'false', values: [2, 4, 6, 8]}
    ]);

    a.shift();

    t.deepEqual(ko.toJS(b), [
        {key: 'true', values: [2, 4, 6, 8]},
        {key: 'false', values: [3, 5, 7, 9]}
    ]);

    a.reverse();

    t.deepEqual(ko.toJS(b), [
        {key: 'true', values: [9, 7, 5, 3]},
        {key: 'false', values: [8, 6, 4, 2]}
    ]);
});

test('moves values moved in the original array', function (t) {
    t.plan(1);

    var a = ko.observableArray(common.orderedInts.slice(0));
    var b = a.groupBy(common.isEven);

    a(common.orderedInts.slice(0).reverse());

    t.deepEqual(ko.toJS(b), [
        {key: 'false', values: [9, 7, 5, 3, 1]},
        {key: 'true', values: [8, 6, 4, 2]}
    ]);
});

test('notifies changes that occur on the group arrays', function (t) {
    t.plan(6);

    var objects = [
        {num: ko.observable(1)},
        {num: ko.observable(2)},
        {num: ko.observable(3)},
        {num: ko.observable(4)}
    ];

    var a = ko.observableArray(objects.slice(0));
    var b = a.groupBy(function (object) {return common.isEven(object.num())});

    var evenChanges;
    var oddChanges;
    b()[1].values.subscribe(function (x) {evenChanges = x}, null, 'arrayChange');
    b()[0].values.subscribe(function (x) {oddChanges = x}, null, 'arrayChange');

    a.reverse();

    t.deepEqual(ko.toJS(evenChanges), [
        {status: 'deleted', value: {num: 2}, index: 0, moved: 1},
        {status: 'added', value: {num: 2}, index: 1, moved: 0}
    ]);

    t.deepEqual(ko.toJS(oddChanges), [
        {status: 'deleted', value: {num: 1}, index: 0, moved: 1},
        {status: 'added', value: {num: 1}, index: 1, moved: 0}
    ]);

    objects[0].num(0);

    t.deepEqual(evenChanges, [
        {status: 'added', value: objects[0], index: 2}
    ]);

    t.deepEqual(oddChanges, [
        {status: 'deleted', value: objects[0], index: 1}
    ]);

    a.removeAll(objects);

    t.deepEqual(evenChanges, [
        {status: 'deleted', value: objects[3], index: 0},
        {status: 'deleted', value: objects[1], index: 1},
        {status: 'deleted', value: objects[0], index: 2}
    ]);

    t.deepEqual(oddChanges, [
        {status: 'deleted', value: objects[2], index: 0}
    ]);
});

test('notifies changes that occur on the transformation', function (t) {
    t.plan(2);

    var objects = [
        {num: ko.observable(1)},
        {num: ko.observable(3)}
    ];

    var changes = null;
    var a = ko.observableArray(objects.slice(0));
    var b = a.groupBy(function (object) {return common.isEven(object.num())});

    b.subscribe(function (c) {changes = c}, null, 'arrayChange');

    a.push({num: ko.observable(2)});

    t.deepEqual(ko.toJS(changes), [
        {status: 'added', index: 1, value: {key: 'true', values: [{num: 2}]}}
    ]);

    a.removeAll([objects[0], objects[1]]);

    t.deepEqual(ko.toJS(changes), [
        {status: 'deleted', index: 0, value: {key: 'false', values: []}}
    ]);
});

test('can add a new group via mutation', function (t) {
    t.plan(1);

    var objects = [
        {num: ko.observable(1)},
        {num: ko.observable(2)},
        {num: ko.observable(3)}
    ];

    var a = ko.observableArray(objects.slice(0));
    var b = a.groupBy(function (x) {return x.num()});

    objects[1].num(5);

    t.deepEqual(ko.toJS(b()), [
        {key: '1', values: [{num: 1}]},
        {key: '3', values: [{num: 3}]},
        {key: '5', values: [{num: 5}]}
    ]);
});
