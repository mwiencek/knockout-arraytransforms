(function () {

var randomInts = [1, 9, 2, 8, 3, 7, 4, 6, 5],
    orderedInts = [1, 2, 3, 4, 5, 6, 7, 8, 9],
    isEven = function (x) { return x % 2 === 0 };


describe("sortBy", function () {
    it("sorts an array’s initial contents", function () {
        var a = ko.observableArray(randomInts.slice(0)),
            b = a.sortBy();

        expect(b()).toEqual(orderedInts);
    });

    it("sorts values added via push", function () {
        var a = ko.observableArray([]),
            b = a.sortBy();

        a.push.apply(a, randomInts);
        expect(b()).toEqual(orderedInts);
    });

    it("sorts values added via unshift", function () {
        var a = ko.observableArray([]),
            b = a.sortBy();

        a.unshift.apply(a, randomInts);
        expect(b()).toEqual(orderedInts);
    });

    it("sorts values spliced to the beginning", function () {
        var a = ko.observableArray([]),
            b = a.sortBy();

        for (var i = 0, len = randomInts.length; i < len; i++) {
            a.splice(0, 0, randomInts[i]);
        }

        expect(b()).toEqual(orderedInts);
    });

    it("sorts values spliced to the end", function () {
        var a = ko.observableArray([]),
            b = a.sortBy();

        for (var i = 0, len = randomInts.length; i < len; i++) {
            a.splice(i, 0, randomInts[i]);
        }

        expect(b()).toEqual(orderedInts);
    });

    it("removes values removed from the original array", function () {
        var a = ko.observableArray(randomInts.slice(0)),
            b = a.sortBy();

        a.remove(2);
        a.remove(4);
        a.remove(6);
        a.remove(8);
        expect(b()).toEqual([1, 3, 5, 7, 9]);

        a.splice(0, 5);
        expect(b()).toEqual([]);
    });

    it("re-sorts values when they change", function () {
        var objects = [
            { name: ko.observable("") },
            { name: ko.observable("") },
            { name: ko.observable("") },
            { name: ko.observable("") }
        ];

        var a = ko.observableArray(objects.slice(0)),
            b = a.sortBy("name");

        objects[0].name("2");
        expect(b()).toEqual([objects[1], objects[2], objects[3], objects[0]]);

        objects[1].name("1");
        expect(b()).toEqual([objects[2], objects[3], objects[1], objects[0]]);

        objects[0].name("0");
        expect(b()).toEqual([objects[2], objects[3], objects[0], objects[1]]);
    });

    it("only runs the sort function when it changes", function () {
        var objects = [
            { name: ko.observable("foo") },
            { name: ko.observable("bar") }
        ];

        var spy0 = spyOn(objects[0], "name"),
            spy1 = spyOn(objects[1], "name"),
            a = ko.observableArray(objects.slice(0)),
            b = a.sortBy(function (object) { return object.name() });

        expect(spy0.calls.count()).toBe(1);
        expect(spy1.calls.count()).toBe(1);

        objects[0].name("1");
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(1);

        objects[1].name("2");
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(2);
    });

    it("passes the value’s index as the second argument to the callback", function () {
        var a = ko.observableArray(randomInts.slice(0)),
            expectedIndex = 0;

        a.sortBy(function (x, i) {
            expect(i.peek()).toBe(expectedIndex++);
        });
    });

    it("re-sorts values that depend on the index observable", function () {
        var a = ko.observableArray(orderedInts.slice(0));

        var b = a.sortBy(function (n, index) {
            return a().length - index();
        });

        expect(b()).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);

        a.reverse();
        expect(b()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("is stable", function () {
        var original = [
            { a: 3 },
            { a: 3 },
            { a: 3 },
            { a: 2 },
            { a: 2 },
            { a: 2 },
            { a: 1 },
            { a: 1 },
            { a: 1 }
        ];

        var a = ko.observableArray(original.slice(0)),
            b = a.sortBy("a"),
            sorted = b(),
            order = [6, 7, 8, 3, 4, 5, 0, 1, 2];

        for (var i = 0; i < 9; i++) {
            expect(sorted[i]).toBe(original[order[i]]);
        }

        // Remove middle dupes
        a.splice(1, 1);
        a.splice(3, 1);
        a.splice(5, 1);
        order = [6, 8, 3, 5, 0, 2];

        for (var i = 0; i < 6; i++) {
            expect(sorted[i]).toBe(original[order[i]]);
        }

        // Reverse leftover dupes
        a.splice(0, 2, original[2], original[0]);
        a.splice(2, 2, original[5], original[3]);
        a.splice(4, 2, original[8], original[6]);
        order = [8, 6, 5, 3, 2, 0];

        for (var i = 0; i < 6; i++) {
            expect(sorted[i]).toBe(original[order[i]]);
        }
    });

    it("remains stably sorted after value mutations", function () {
        var sortByFoo = ko.observable(true);

        var original = [
            { name: "A", foo: 4, bar: 3 },
            { name: "B", foo: 3, bar: 5 },
            { name: "C", foo: 5, bar: 4 },
            { name: "D", foo: 2, bar: 2 },
        ];

        var sorted = ko.observableArray(original.slice(0))
            .sortBy("name")
            .sortBy("bar")
            .sortBy(function (h) {
                if (sortByFoo()) {
                    return h.foo;
                }
                return 0;
            });

        // DBAC -> DACB
        sortByFoo(false);

        expect(sorted()).toEqual([
            original[3],
            original[0],
            original[2],
            original[1]
        ]);
    });

    it("can chain array moves", function () {
        var original = [
            { order: ko.observable(1) },
            { order: ko.observable(2) },
            { order: ko.observable(3) }
        ];

        var sorted = ko.observableArray(original.slice(0))
            .sortBy("order").sortBy(function () { return 0 });

        original[2].order(0);
        expect(sorted()).toEqual([original[2], original[0], original[1]]);
    });
});


describe("filter", function () {
    it("filters an array’s initial contents", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.filter(isEven);

        expect(b()).toEqual([2, 4, 6, 8]);
    });

    it("filters values added via push", function () {
        var a = ko.observableArray([]),
            b = a.filter(isEven);

        a.push.apply(a, orderedInts);
        expect(b()).toEqual([2, 4, 6, 8]);
    });

    it("filters values added via unshift", function () {
        var a = ko.observableArray([]),
            b = a.filter(isEven);

        a.unshift.apply(a, orderedInts);
        expect(b()).toEqual([2, 4, 6, 8]);
    });

    it("filters values spliced to the beginning", function () {
        var a = ko.observableArray([]),
            b = a.filter(isEven);

        for (var i = 0, len = orderedInts.length; i < len; i++) {
            a.splice(0, 0, orderedInts[i]);
        }

        expect(b()).toEqual([8, 6, 4, 2]);
    });

    it("filters values spliced to the end", function () {
        var a = ko.observableArray([]),
            b = a.filter(isEven);

        for (var i = 0, len = orderedInts.length; i < len; i++) {
            a.splice(i, 0, orderedInts[i]);
        }

        expect(b()).toEqual([2, 4, 6, 8]);
    });

    it("removes values removed from the original array", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.filter(isEven);

        a.splice(0, 5);
        expect(b()).toEqual([6, 8]);

        a.splice(0, 4);
        expect(b()).toEqual([]);
    });

    it("re-filters values when they change", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(3) },
            { num: ko.observable(5) }
        ];

        var a = ko.observableArray(objects.slice(0)),
            b = a.filter(function (object) { return object.num() % 2 === 0 });

        expect(b()).toEqual([]);

        objects[0].num(2);
        expect(b()).toEqual([objects[0]]);

        objects[1].num(4);
        expect(b()).toEqual([objects[0], objects[1]]);

        objects[2].num(6);
        expect(b()).toEqual([objects[0], objects[1], objects[2]]);
    });

    it("only runs the filter function when it changes", function () {
        var objects = [
            { num: ko.observable(0) },
            { num: ko.observable(1) }
        ];

        var spy0 = spyOn(objects[0], "num"),
            spy1 = spyOn(objects[1], "num"),
            a = ko.observableArray(objects.slice(0)),
            b = a.filter(function (object) { return object.num() % 2 === 0 });

        expect(spy0.calls.count()).toBe(1);
        expect(spy1.calls.count()).toBe(1);

        objects[0].num(2);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(1);

        objects[1].num(4);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(2);
    });

    it("passes the value’s index as the second argument to the callback", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            expectedIndex = 0;

        a.filter(function (x, i) {
            expect(i.peek()).toBe(expectedIndex++);
        });
    });

    it("re-filters values that depend on the index observable", function () {
        var a = ko.observableArray(orderedInts.slice(0));

        var b = a.filter(function (n, index) {
            return index() % 2 === 0;
        });

        expect(b()).toEqual([1, 3, 5, 7, 9]);

        a.shift();
        expect(b()).toEqual([2, 4, 6, 8]);

        a.reverse();
        expect(b()).toEqual([9, 7, 5, 3]);
    });

    it("moves values moved in the original array", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.filter(isEven);

        a(orderedInts.slice(0).reverse());
        expect(b()).toEqual([8, 6, 4, 2]);
    });

    it("allows modifying the original array inside a subscription", function () {
        var original = [{ visible: ko.observable(true) }],
            a = ko.observableArray(original.slice(0)),
            b = a.filter("visible"),
            c = b.map(),
            toAdd = { visible: ko.observable(true) };

        b.subscribe(function (values) {
            if (!values.length) {
                a.push(toAdd);
            } else if (values.length > 1) {
                a.remove(toAdd);
            }
        });

        original[0].visible(false);
        expect(b()).toEqual([toAdd]);
        expect(c()).toEqual(b());

        original[0].visible(true);
        expect(b()).toEqual([original[0]]);
        expect(c()).toEqual(b());
    });

    it("can insert a new value at index 0 before two swapped values", function () {
        var a = ko.observableArray([0, 1, 2, 3]),
            b = a.filter(isEven);

        a([4, 1, 0, 2, 3]);
        expect(b()).toEqual([4, 0, 2]);
    });
});


describe("reject", function () {
    it("filters an array’s initial contents", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.reject(isEven);

        expect(b()).toEqual([1, 3, 5, 7, 9]);
    });

    it("filters values added via push", function () {
        var a = ko.observableArray([]),
            b = a.reject(isEven);

        a.push.apply(a, orderedInts);
        expect(b()).toEqual([1, 3, 5, 7, 9]);
    });

    it("filters values added via unshift", function () {
        var a = ko.observableArray([]),
            b = a.reject(isEven);

        a.unshift.apply(a, orderedInts);
        expect(b()).toEqual([1, 3, 5, 7, 9]);
    });

    it("filters values spliced to the beginning", function () {
        var a = ko.observableArray([]),
            b = a.reject(isEven);

        for (var i = 0, len = orderedInts.length; i < len; i++) {
            a.splice(0, 0, orderedInts[i]);
        }

        expect(b()).toEqual([9, 7, 5, 3, 1]);
    });

    it("filters values spliced to the end", function () {
        var a = ko.observableArray([]),
            b = a.reject(isEven);

        for (var i = 0, len = orderedInts.length; i < len; i++) {
            a.splice(i, 0, orderedInts[i]);
        }

        expect(b()).toEqual([1, 3, 5, 7, 9]);
    });

    it("removes values removed from the original array", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.reject(isEven);

        a.splice(0, 5);
        expect(b()).toEqual([7, 9]);

        a.splice(0, 4);
        expect(b()).toEqual([]);
    });

    it("re-filters values when they change", function () {
        var objects = [
            { num: ko.observable(2) },
            { num: ko.observable(4) },
            { num: ko.observable(6) }
        ];

        var a = ko.observableArray(objects.slice(0)),
            b = a.reject(function (object) { return object.num() % 2 === 0 });

        expect(b()).toEqual([]);

        objects[0].num(1);
        expect(b()).toEqual([objects[0]]);

        objects[1].num(3);
        expect(b()).toEqual([objects[0], objects[1]]);

        objects[2].num(5);
        expect(b()).toEqual([objects[0], objects[1], objects[2]]);
    });

    it("only runs the filter function when it changes", function () {
        var objects = [
            { num: ko.observable(0) },
            { num: ko.observable(1) }
        ];

        var spy0 = spyOn(objects[0], "num"),
            spy1 = spyOn(objects[1], "num"),
            a = ko.observableArray(objects.slice(0)),
            b = a.reject(function (object) { return object.num() % 2 === 0 });

        expect(spy0.calls.count()).toBe(1);
        expect(spy1.calls.count()).toBe(1);

        objects[0].num(2);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(1);

        objects[1].num(4);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(2);
    });

    it("passes the value’s index as the second argument to the callback", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            expectedIndex = 0;

        a.reject(function (x, i) {
            expect(i.peek()).toBe(expectedIndex++);
        });
    });

    it("re-filters values that depend on the index observable", function () {
        var a = ko.observableArray(orderedInts.slice(0));

        var b = a.reject(function (n, index) {
            return index() % 2 === 0;
        });

        expect(b()).toEqual([2, 4, 6, 8]);

        a.shift();
        expect(b()).toEqual([3, 5, 7, 9]);

        a.reverse();
        expect(b()).toEqual([8, 6, 4, 2]);
    });

    it("moves values moved in the original array", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.reject(isEven);

        a(orderedInts.slice(0).reverse());
        expect(b()).toEqual([9, 7, 5, 3, 1]);
    });
});


describe("map", function () {
    var squaredInts = [1, 4, 9, 16, 25, 36, 49, 64, 81],
        square = function (x) { return x * x };

    it("maps an array’s initial contents", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.map(square);

        expect(b()).toEqual(squaredInts);
    });

    it("maps values added via push", function () {
        var a = ko.observableArray([]),
            b = a.map(square);

        a.push.apply(a, orderedInts);
        expect(b()).toEqual(squaredInts);
    });

    it("maps values added via unshift", function () {
        var a = ko.observableArray([]),
            b = a.map(square);

        a.unshift.apply(a, orderedInts);
        expect(b()).toEqual(squaredInts);
    });

    it("maps values spliced to the beginning", function () {
        var a = ko.observableArray([]),
            b = a.map(square);

        for (var i = 0, len = orderedInts.length; i < len; i++) {
            a.splice(0, 0, orderedInts[i]);
        }

        expect(b()).toEqual(squaredInts.slice(0).reverse());
    });

    it("maps values spliced to the end", function () {
        var a = ko.observableArray([]),
            b = a.map(square);

        for (var i = 0, len = orderedInts.length; i < len; i++) {
            a.splice(i, 0, orderedInts[i]);
        }

        expect(b()).toEqual(squaredInts);
    });

    it("removes values removed from the original array", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.map(square);

        a.splice(0, 5);
        expect(b()).toEqual([36, 49, 64, 81]);

        a.splice(0, 4);
        expect(b()).toEqual([]);
    });

    it("re-maps values when they change", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(2) },
            { num: ko.observable(3) }
        ];

        var a = ko.observableArray(objects.slice(0)),
            b = a.map(function (object) {
                    var n = object.num();
                    return n * n;
                });

        expect(b()).toEqual([1, 4, 9]);

        objects[0].num(4);
        expect(b()).toEqual([16, 4, 9]);

        objects[1].num(5);
        expect(b()).toEqual([16, 25, 9]);

        objects[2].num(6);
        expect(b()).toEqual([16, 25, 36]);
    });

    it("only runs the map function when it changes", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(2) }
        ];

        var spy0 = spyOn(objects[0], "num"),
            spy1 = spyOn(objects[1], "num"),
            a = ko.observableArray(objects.slice(0)),
            b = a.map(function (object) {
                    var n = object.num();
                    return n * n;
                });

        expect(spy0.calls.count()).toBe(1);
        expect(spy1.calls.count()).toBe(1);

        objects[0].num(3);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(1);

        objects[1].num(4);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(2);
    });

    it("will move existing mapped values when the original values move", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(2) }
        ];

        var NumberHolder = function (num) {
            this.num = num;
        };

        var spy0 = spyOn(objects[0], "num"),
            spy1 = spyOn(objects[1], "num"),
            a = ko.observableArray(objects.slice(0)),
            b = a.map(function (object) { return new NumberHolder(object.num()) }),
            underlyingb = b.peek(),
            nh0 = underlyingb[0],
            nh1 = underlyingb[1];

        a.reverse();
        expect(underlyingb[0]).toBe(nh1);
        expect(underlyingb[1]).toBe(nh0);
    });

    it("passes the value’s index as the second argument to the callback", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            expectedIndex = 0;

        a.map(function (x, i) {
            expect(i.peek()).toBe(expectedIndex++);
        });
    });

    it("re-maps values that depend on the index observable", function () {
        var animals = ko.observableArray(["cat", "dog", "goat"]);

        var ranks = animals.map(function (name, index) {
            return name + ": " + (index() + 1);
        });

        expect(ranks()).toEqual(["cat: 1", "dog: 2", "goat: 3"]);

        animals.reverse();
        expect(ranks()).toEqual(["goat: 1", "dog: 2", "cat: 3"]);
    });

    it("can insert a new value at index 0 before two swapped values", function () {
        var a = ko.observableArray([0, 1, 2, 3]),
            b = a.map(function (x) { return x + 1 });

        a([4, 1, 0, 2, 3]);
        expect(b()).toEqual([5, 2, 1, 3, 4]);
    });
});


describe("groupBy", function () {
    it("groups an array’s initial contents", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.groupBy(isEven);

        expect(b()[0].values()).toEqual([1, 3, 5, 7, 9]);
        expect(b()[1].values()).toEqual([2, 4, 6, 8]);
    });

    it("groups values added via push", function () {
        var a = ko.observableArray([]),
            b = a.groupBy(isEven);

        a.push.apply(a, orderedInts);
        expect(b()[0].values()).toEqual([1, 3, 5, 7, 9]);
        expect(b()[1].values()).toEqual([2, 4, 6, 8]);
    });

    it("groups values added via unshift", function () {
        var a = ko.observableArray([]),
            b = a.groupBy(isEven);

        a.unshift.apply(a, orderedInts);
        expect(b()[0].values()).toEqual([1, 3, 5, 7, 9]);
        expect(b()[1].values()).toEqual([2, 4, 6, 8]);
    });

    it("groupBy values spliced to the beginning", function () {
        var a = ko.observableArray([]),
            b = a.groupBy(isEven);

        for (var i = 0, len = orderedInts.length; i < len; i++) {
            a.splice(0, 0, orderedInts[i]);
        }

        expect(b()[0].values()).toEqual([9, 7, 5, 3, 1]);
        expect(b()[1].values()).toEqual([8, 6, 4, 2]);
    });

    it("groups values spliced to the end", function () {
        var a = ko.observableArray([]),
            b = a.groupBy(isEven);

        for (var i = 0, len = orderedInts.length; i < len; i++) {
            a.splice(i, 0, orderedInts[i]);
        }

        expect(b()[0].values()).toEqual([1, 3, 5, 7, 9]);
        expect(b()[1].values()).toEqual([2, 4, 6, 8]);
    });

    it("removes values removed from the original array", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.groupBy(isEven);

        a.splice(0, 5);
        expect(b()[0].values()).toEqual([7, 9]);
        expect(b()[1].values()).toEqual([6, 8]);

        a.splice(0, 4);
        expect(b().length).toBe(0);
    });

    it("re-groups values when they change", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(2) },
            { num: ko.observable(3) }
        ];

        var a = ko.observableArray(objects.slice(0)),
            b = a.groupBy(function (object) { return isEven(object.num()) });

        expect(ko.toJS(b)).toEqual([
            { key: "false", values: [{ num: 1 }, { num: 3 }] },
            { key: "true", values: [{ num: 2 }] }
        ]);

        objects[0].num(2);
        objects[1].num(4);

        expect(ko.toJS(b)).toEqual([
            { key: "false", values: [{ num: 3 }] },
            { key: "true", values: [{ num: 2 }, { num: 4 }] }
        ]);

        b.subscribe(function (changes) {
            expect(ko.toJS(changes)).toEqual([
                { status: "deleted", index: 0, value: { key: "false", values: [] } }
            ]);
        }, null, "arrayChange");

        objects[2].num(6);

        expect(ko.toJS(b)).toEqual([
            { key: "true", values: [{ num: 2 }, { num: 4 }, { num: 6 }] }
        ]);
    });

    it("only runs the groupBy function when it changes", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(2) },
            { num: ko.observable(3) }
        ];

        var spy0 = spyOn(objects[0], "num"),
            spy1 = spyOn(objects[1], "num"),
            spy2 = spyOn(objects[2], "num"),
            a = ko.observableArray(objects.slice(0)),
            b = a.groupBy(function (object) { return isEven(object.num()) });

        expect(spy0.calls.count()).toBe(1);
        expect(spy1.calls.count()).toBe(1);
        expect(spy2.calls.count()).toBe(1);

        objects[0].num(2);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(1);
        expect(spy2.calls.count()).toBe(1);

        objects[1].num(3);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(2);
        expect(spy2.calls.count()).toBe(1);

        objects[2].num(4);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(2);
        expect(spy2.calls.count()).toBe(2);
    });

    it("passes the value’s index as the second argument to the callback", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            expectedIndex = 0;

        a.groupBy(function (x, i) {
            expect(i.peek()).toBe(expectedIndex++);
        });
    });

    it("re-groups values that depend on the index observable", function () {
        var a = ko.observableArray(orderedInts.slice(0));

        var b = a.groupBy(function (n, index) {
            return index() % 2 === 0;
        });

        expect(ko.toJS(b)).toEqual([
            { key: "true", values: [1, 3, 5, 7, 9] },
            { key: "false", values: [2, 4, 6, 8] }
        ]);

        a.shift();

        expect(ko.toJS(b)).toEqual([
            { key: "true", values: [2, 4, 6, 8] },
            { key: "false", values: [3, 5, 7, 9] }
        ]);

        a.reverse();

        expect(ko.toJS(b)).toEqual([
            { key: "true", values: [9, 7, 5, 3] },
            { key: "false", values: [8, 6, 4, 2] }
        ]);
    });

    it("moves values moved in the original array", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.groupBy(isEven);

        a(orderedInts.slice(0).reverse());

        expect(ko.toJS(b)).toEqual([
            { key: "false", values: [9, 7, 5, 3, 1] },
            { key: "true", values: [8, 6, 4, 2] }
        ]);
    });

    it("notifies changes that occur on the group arrays", function () {
        var objects = [
                { num: ko.observable(1) },
                { num: ko.observable(2) },
                { num: ko.observable(3) },
                { num: ko.observable(4) }
            ],
            a = ko.observableArray(objects.slice(0)),
            b = a.groupBy(function (object) { return isEven(object.num()) });

        var evenChanges, oddChanges;
        b()[1].values.subscribe(function (x) { evenChanges = x }, null, "arrayChange");
        b()[0].values.subscribe(function (x) { oddChanges = x }, null, "arrayChange");

        a.reverse();

        expect(ko.toJS(evenChanges)).toEqual([
            { status: "deleted", value: { num: 2 }, index: 0, moved: 1 },
            { status: "added", value: { num: 2 }, index: 1, moved: 0 }
        ]);

        expect(ko.toJS(oddChanges)).toEqual([
            { status: "deleted", value: { num: 1 }, index: 0, moved: 1 },
            { status: "added", value: { num: 1 }, index: 1, moved: 0 }
        ]);

        objects[0].num(0);

        expect(evenChanges).toEqual([
            { status: "added", value: objects[0], index: 2 }
        ]);

        expect(oddChanges).toEqual([
            { status: "deleted", value: objects[0], index: 1 }
        ]);

        a.removeAll(objects);

        expect(evenChanges).toEqual([
            { status: "deleted", value: objects[3], index: 0 },
            { status: "deleted", value: objects[1], index: 1 },
            { status: "deleted", value: objects[0], index: 2 }
        ]);

        expect(oddChanges).toEqual([
            { status: "deleted", value: objects[2], index: 0 }
        ]);
    });

    it("notifies changes that occur on the transformation", function () {
        var objects = [
                { num: ko.observable(1) },
                { num: ko.observable(3) }
            ],
            changes = null;

        var a = ko.observableArray(objects.slice(0)),
            b = a.groupBy(function (object) { return isEven(object.num()) });

        b.subscribe(function (c) { changes = c }, null, "arrayChange");

        a.push({ num: ko.observable(2) });

        expect(ko.toJS(changes)).toEqual([
            { status: "added", index: 1, value: { key: "true", values: [{ num: 2 }] } }
        ]);

        a.removeAll([objects[0], objects[1]]);

        expect(ko.toJS(changes)).toEqual([
            { status: "deleted", index: 0, value: { key: "false", values: [] } }
        ]);
    });

    it("can add a new group via mutation", function () {
        var objects = [
                { num: ko.observable(1) },
                { num: ko.observable(2) },
                { num: ko.observable(3) }
            ],
            a = ko.observableArray(objects.slice(0)),
            b = a.groupBy(function (x) { return x.num() });

        objects[1].num(5);

        expect(ko.toJS(b())).toEqual([
            { key: "1", values: [{ num: 1 }] },
            { key: "3", values: [{ num: 3 }] },
            { key: "5", values: [{ num: 5 }] }
        ]);
    });
});


describe("any", function () {
    it("tests an array’s initial contents", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.any(isEven);

        expect(b()).toBe(true);
    });

    it("is false when empty", function () {
        var a = ko.observableArray([]),
            b = a.any(isEven);

        expect(b()).toBe(false);
    });

    it("tests values added via push", function () {
        var a = ko.observableArray([]),
            b = a.any(isEven);

        a.push(1)
        expect(b()).toEqual(false);
        a.push(2);
        expect(b()).toEqual(true);
    });

    it("tests values added via unshift", function () {
        var a = ko.observableArray([]),
            b = a.any(isEven);

        a.unshift(1)
        expect(b()).toEqual(false);
        a.unshift(2);
        expect(b()).toEqual(true);
    });

    it("tests values spliced to the beginning", function () {
        var a = ko.observableArray([]),
            b = a.any(isEven);

        a.splice(0, 0, 1)
        expect(b()).toEqual(false);
        a.splice(0, 0, 2);
        expect(b()).toEqual(true);
    });

    it("tests values spliced to the end", function () {
        var a = ko.observableArray([]),
            b = a.any(isEven);

        a.splice(0, 0, 1)
        expect(b()).toEqual(false);
        a.splice(1, 0, 2);
        expect(b()).toEqual(true);
    });

    it("removes values removed from the original array", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.any(isEven);

        expect(b()).toBe(true);

        a.splice(1, 1); // -> [1, 3, 4, 5, 6, 7, 8, 9]
        a.splice(2, 1); // -> [1, 3, 5, 6, 7, 8, 9]
        a.splice(3, 1); // -> [1, 3, 5, 7, 8, 9]
        a.splice(4, 1); // -> [1, 3, 5, 7, 9]

        expect(b()).toBe(false);
    });

    it("re-tests values when they change", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(2) },
            { num: ko.observable(3) }
        ];

        var a = ko.observableArray(objects.slice(0)),
            b = a.any(function (object) { return isEven(object.num()) });

        expect(b()).toBe(true);

        objects[1].num(5);
        expect(b()).toBe(false);
    });

    it("only runs the test function when it changes", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(2) }
        ];

        var spy0 = spyOn(objects[0], "num"),
            spy1 = spyOn(objects[1], "num"),
            a = ko.observableArray(objects.slice(0)),
            b = a.any(function (object) { return isEven(object.num()) });

        expect(spy0.calls.count()).toBe(1);
        expect(spy1.calls.count()).toBe(1);

        objects[0].num(3);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(1);

        objects[1].num(4);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(2);
    });

    it("passes the value’s index as the second argument to the callback", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            expectedIndex = 0;

        a.any(function (x, i) {
            expect(i.peek()).toBe(expectedIndex++);
        });
    });

    it("re-tests values that depend on the index observable", function () {
        var a = ko.observableArray(orderedInts.slice(0));

        // are any even-indexed values equal to 0?
        var b = a.any(function (n, index) {
            return index() % 2 === 0 ? n === 0 : false;
        });

        expect(b()).toBe(false);

        a.unshift(0);
        expect(b()).toBe(true);

        a([1, 0, 1]);
        expect(b()).toBe(false);
    });

    it("ignores moves in the original array", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.any(isEven);

        a(orderedInts.slice(0).reverse());
        expect(b()).toBe(true);
    });
});


describe("all", function () {
    it("tests an array’s initial contents", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.all(isEven);

        expect(b()).toBe(false);
    });

    it("is true when empty", function () {
        var a = ko.observableArray([]),
            b = a.all(isEven);

        expect(b()).toBe(true);
    });

    it("tests values added via push", function () {
        var a = ko.observableArray([]),
            b = a.all(isEven);

        a.push(2);
        expect(b()).toEqual(true);
        a.push(1)
        expect(b()).toEqual(false);
    });

    it("tests values added via unshift", function () {
        var a = ko.observableArray([]),
            b = a.all(isEven);

        a.unshift(2);
        expect(b()).toEqual(true);
        a.unshift(1)
        expect(b()).toEqual(false);
    });

    it("tests values spliced to the beginning", function () {
        var a = ko.observableArray([]),
            b = a.all(isEven);

        a.splice(0, 0, 2);
        expect(b()).toEqual(true);
        a.splice(0, 0, 1)
        expect(b()).toEqual(false);
    });

    it("tests values spliced to the end", function () {
        var a = ko.observableArray([]),
            b = a.all(isEven);

        a.splice(0, 0, 2);
        expect(b()).toEqual(true);
        a.splice(1, 0, 1)
        expect(b()).toEqual(false);
    });

    it("removes values removed from the original array", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.all(isEven);

        expect(b()).toBe(false);

        a.splice(0, 1); // -> [2, 3, 4, 5, 6, 7, 8, 9]
        a.splice(1, 1); // -> [2, 4, 5, 6, 7, 8, 9]
        a.splice(2, 1); // -> [2, 4, 6, 7, 8, 9]
        a.splice(3, 1); // -> [2, 4, 6, 8, 9]
        a.splice(4, 1); // -> [2, 4, 6, 8]

        expect(b()).toBe(true);
    });

    it("re-tests values when they change", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(2) },
            { num: ko.observable(3) }
        ];

        var a = ko.observableArray(objects.slice(0)),
            b = a.all(function (object) { return isEven(object.num()) });

        expect(b()).toBe(false);

        objects[0].num(4);
        objects[2].num(6);
        expect(b()).toBe(true);
    });

    it("only runs the test function when it changes", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(2) }
        ];

        var spy0 = spyOn(objects[0], "num"),
            spy1 = spyOn(objects[1], "num"),
            a = ko.observableArray(objects.slice(0)),
            b = a.all(function (object) { return isEven(object.num()) });

        expect(spy0.calls.count()).toBe(1);
        expect(spy1.calls.count()).toBe(1);

        objects[0].num(3);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(1);

        objects[1].num(4);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(2);
    });

    it("passes the value’s index as the second argument to the callback", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            expectedIndex = 0;

        a.all(function (x, i) {
            expect(i.peek()).toBe(expectedIndex++);
        });
    });

    it("re-tests values that depend on the index observable", function () {
        var a = ko.observableArray(orderedInts.slice(0));

        // are all even-indexed values equal to 0?
        var b = a.all(function (n, index) {
            return index() % 2 === 0 ? n === 0 : true;
        });

        expect(b()).toBe(false);

        a([0, 0, 0]);
        expect(b()).toBe(true);

        a([0, 1, 0]);
        expect(b()).toBe(true);

        a([0, 1, 1]);
        expect(b()).toBe(false);
    });

    it("ignores moves in the original array", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.all(isEven);

        a(orderedInts.slice(0).reverse());
        expect(b()).toBe(false);
    });
});


describe("chaining", function () {
    var charCode = function (x) { return x.charCodeAt(0) },
        evenDistanceFrom65 = function (x) { return (x - 65) % 2 === 0 },
        evenDistanceFromA = function (x) { return evenDistanceFrom65(charCode(x)) },
        greaterThan69 = function (x) { return x > 69 },
        randomLetters = ["H", "I", "F", "G", "D", "E", "B", "C", "A"];

    it("works between filter -> filter", function () {
        var a = ko.observableArray([65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75]),
            b = a.filter(greaterThan69).filter(evenDistanceFrom65);

        var changes;
        b.subscribe(function (x) { changes = x }, null, "arrayChange");

        expect(b()).toEqual([71, 73, 75]);

        a.reverse();
        expect(b()).toEqual([75, 73, 71]);
        expect(changes).toEqual([
            { status: "deleted", index: 0, moved: 2, value: 71 },
            { status: "added", index: 0, moved: 2, value: 75 },
            { status: "deleted", index: 2, moved: 0, value: 75 },
            { status: "added", index: 2, moved: 0, value: 71 }
        ]);

        a.push(73);
        expect(b()).toEqual([75, 73, 71, 73]);
        expect(changes).toEqual([
            { status: "added", index: 3, value: 73 },
        ]);

        a.unshift(73);
        expect(b()).toEqual([73, 75, 73, 71, 73]);
        expect(changes).toEqual([
            { status: "added", index: 0, value: 73 },
        ]);

        a.removeAll([73]);
        expect(b()).toEqual([75, 71]);
        expect(changes).toEqual([
            { status: "deleted", index: 0, value: 73 },
            { status: "deleted", index: 2, value: 73 },
            { status: "deleted", index: 4, value: 73 }
        ]);
    });

    it("works between filter -> filter -> filter", function () {
        var numbers = [];

        for (var i = 0; i < 1000; i++) {
            numbers.push(i + 1);
        }

        var a = ko.observableArray(numbers),
            b = a.filter(function (x) { return x % 3 === 0 }),
            c = b.filter(function (x) { return x % 5 === 0 }),
            d = c.filter(function (x) { return x % 7 === 0 });

        expect(d()).toEqual([105, 210, 315, 420, 525, 630, 735, 840, 945]);

        a.reverse();
        expect(d()).toEqual([945, 840, 735, 630, 525, 420, 315, 210, 105]);
    });

    it("works between filter -> sortBy", function () {
        var a = ko.observableArray(randomLetters.slice(0)),
            b = a.filter(evenDistanceFromA).sortBy();

        expect(b()).toEqual(["A", "C", "E", "G", "I"]);

        var latestChanges;
        b.subscribe(function (changes) { latestChanges = changes }, null, "arrayChange");

        a.splice(0, 0, "J", "K", "L");
        expect(b()).toEqual(["A", "C", "E", "G", "I", "K"]);
        expect(latestChanges).toEqual([{ status: "added", index: 5, value: "K" }]);
    });

    it("works between filter -> groupBy", function () {
        var a = ko.observableArray([66, 67, 68, 69, 70, 71, 72]),
            b = a.filter(isEven).groupBy(greaterThan69);

        expect(ko.toJS(b())).toEqual([
            { key: "false", values: [66, 68] },
            { key: "true", values: [70, 72] }
        ]);
    });

    it("works between sortBy -> filter", function () {
        var a = ko.observableArray(randomLetters.slice(0)),
            b = a.sortBy().filter(evenDistanceFromA);

        expect(b()).toEqual(["A", "C", "E", "G", "I"]);

        var latestChanges;
        b.subscribe(function (changes) { latestChanges = changes }, null, "arrayChange");

        a.splice(0, 0, "J", "K", "L");
        expect(b()).toEqual(["A", "C", "E", "G", "I", "K"]);
        expect(latestChanges).toEqual([{ status: "added", index: 5, value: "K" }]);
    });

    it("works between filter -> map", function () {
        var a = ko.observableArray(randomLetters.slice(0)),
            b = a.filter(evenDistanceFromA).map(charCode);

        expect(b()).toEqual([73, 71, 69, 67, 65]);

        var latestChanges;
        b.subscribe(function (changes) { latestChanges = changes }, null, "arrayChange");

        a.splice(0, 0, "J", "K", "L");
        expect(b()).toEqual([75, 73, 71, 69, 67, 65]);
        expect(latestChanges).toEqual([{ status: "added", index: 0, value: 75 }]);
    });

    it("works between map -> filter", function () {
        var a = ko.observableArray(randomLetters.slice(0)),
            b = a.map(charCode).filter(evenDistanceFrom65);

        expect(b()).toEqual([73, 71, 69, 67, 65]);

        var latestChanges;
        b.subscribe(function (changes) { latestChanges = changes }, null, "arrayChange");

        a.splice(0, 0, "J", "K", "L");
        expect(b()).toEqual([75, 73, 71, 69, 67, 65]);
        expect(latestChanges).toEqual([{ status: "added", index: 0, value: 75 }]);
    });

    it("works between map -> sortBy", function () {
        var a = ko.observableArray(randomLetters.slice(0)),
            b = a.map(charCode).sortBy();

        expect(b()).toEqual([65, 66, 67, 68, 69, 70, 71, 72, 73]);

        var latestChanges = [];
        b.subscribe(function (changes) { latestChanges.push.apply(latestChanges, changes) }, null, "arrayChange");

        a.splice(0, 0, "J", "K", "L");
        expect(b()).toEqual([65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76]);
        expect(latestChanges).toEqual([
            { status: "added", index: 9, value: 74 },
            { status: "added", index: 10, value: 75 },
            { status: "added", index: 11, value: 76 }
        ]);
    });

    it("works between sortBy -> map", function () {
        var a = ko.observableArray(randomLetters.slice(0)),
            b = a.map(charCode).sortBy();

        expect(b()).toEqual([65, 66, 67, 68, 69, 70, 71, 72, 73]);

        var latestChanges = [];
        b.subscribe(function (changes) { latestChanges.push.apply(latestChanges, changes) }, null, "arrayChange");

        a.splice(0, 0, "J", "K", "L");
        expect(b()).toEqual([65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76]);
        expect(latestChanges).toEqual([
            { status: "added", index: 9, value: 74 },
            { status: "added", index: 10, value: 75 },
            { status: "added", index: 11, value: 76 }
        ]);
    });

    it("works between filter -> all", function () {
        var a = ko.observableArray([68, 69, 70]),
            b = a.filter(greaterThan69).all(isEven);

        expect(b()).toBe(true);

        a.push(71);
        expect(b()).toBe(false);
    });

    it("works between filter -> any", function () {
        var a = ko.observableArray([68, 69, 70]),
            b = a.filter(greaterThan69).any(isEven);

        expect(b()).toBe(true);

        a.remove(70);
        expect(b()).toBe(false);
    });

    it("works between map -> all", function () {
        var a = ko.observableArray([68, 69, 70]),
            b = a.map(function (x) { return x + 1 }).all(greaterThan69);

        expect(b()).toBe(false);

        a.remove(68);
        expect(b()).toBe(true);
    });

    it("works between map -> any", function () {
        var a = ko.observableArray([68, 69, 70]),
            b = a.map(function (x) { return x - 1 }).any(greaterThan69);

        expect(b()).toBe(false);

        a.push(71);
        expect(b()).toBe(true);
    });

    it("works between map -> map", function () {
        var a = ko.observableArray([1, 2, 3, 4, 5]),
            b = a.map(function (x) { return x + 1 }).map(function (x) { return x * 2 });

        expect(b()).toEqual([4, 6, 8, 10, 12]);

        a.unshift(0);
        expect(b()).toEqual([2, 4, 6, 8, 10, 12]);

        a.push(6);
        expect(b()).toEqual([2, 4, 6, 8, 10, 12, 14]);

        a.removeAll([1, 2, 3, 4, 5]);
        expect(b()).toEqual([2, 14]);

        a.splice(1, 1, 1, 2);
        expect(b()).toEqual([2, 4, 6]);
    });

    it("works between map -> groupBy", function () {
        var a = ko.observableArray([1, 2, 3, 4, 5]),
            b = a.map(function (x) { return x + 1 }).groupBy(isEven);

        expect(ko.toJS(b())).toEqual([
            { key: "true", values: [2, 4, 6] },
            { key: "false", values: [3, 5] }
        ]);
    });

    it("works between sortBy -> all", function () {
        var a = ko.observableArray([70, 69, 68]),
            b = a.sortBy(),
            c = b.all(function (x, i) {
                var prev = b()[i() - 1];
                return prev === undefined || (x - prev) === 1;
            });

        expect(c()).toBe(true);

        a.remove(69);
        expect(c()).toBe(false);
    });

    it("works between sortBy -> any", function () {
        var a = ko.observableArray([70, 69, 68]),
            b = a.sortBy(),
            c = b.any(function (x, i) {
                var prev = b()[i() - 1];
                return prev !== undefined && (x - prev) === 1;
            });

        expect(c()).toBe(true);

        a([70, 68, 66]);
        expect(c()).toBe(false);
    });

    it("works between sortBy -> sortBy", function () {
        var original = [
                { a: ko.observable(1), b: ko.observable(4) },
                { a: ko.observable(1), b: ko.observable(3) },
                { a: ko.observable(2), b: ko.observable(2) },
                { a: ko.observable(2), b: ko.observable(1) }
            ],
            a = ko.observableArray(original),
            b = a.sortBy("b").sortBy("a");

        var sorted = b();
        expect(sorted[0]).toBe(original[1]);
        expect(sorted[1]).toBe(original[0]);
        expect(sorted[2]).toBe(original[3]);
        expect(sorted[3]).toBe(original[2]);

        original[3].b(3);
        expect(sorted[0]).toBe(original[1]);
        expect(sorted[1]).toBe(original[0]);
        expect(sorted[2]).toBe(original[2]);
        expect(sorted[3]).toBe(original[3]);
    });

    it("works between sortBy -> groupBy", function () {
        var original = [
                { a: ko.observable(1), b: ko.observable(4) },
                { a: ko.observable(1), b: ko.observable(3) },
                { a: ko.observable(2), b: ko.observable(2) },
                { a: ko.observable(2), b: ko.observable(1) }
            ],
            a = ko.observableArray(original),
            b = a.sortBy("b").groupBy("a");

        expect(ko.toJS(b())).toEqual([
            { key: "2", values: [{ a: 2, b: 1 }, { a: 2, b: 2 }] },
            { key: "1", values: [{ a: 1, b: 3 }, { a: 1, b: 4 }] }
        ]);
    });
});


describe("all transformations", function () {

    it("can map changes that trigger nested notifications", function () {
        var aCount = 0,
            bCount = 0,
            cCount = 0,
            a = ko.observableArray([]),
            b = a.map(),
            c = b.map();

        a.subscribe(function () {
            if (aCount < 3) {
                a.push("a" + (aCount++));
            }
        });

        b.subscribe(function () {
            if (bCount < 3) {
                a.push("b" + (bCount++));
            }
        });

        c.subscribe(function () {
            if (cCount < 3) {
                a.push("c" + (cCount++));
            }
        });

        a.push("hello");
        expect(a()).toEqual(["hello", "b0", "a0", "a1", "a2", "c0", "b1", "c1", "b2", "c2"]);
        expect(b()).toEqual(a());
        expect(c()).toEqual(b());
    });
});

}());
