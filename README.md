# knockout-arrayTransforms

Allows for creating efficient transformations of observable arrays.

```JavaScript
var integers = ko.observableArray([
    ko.observable(10), ko.observable(9),
    ko.observable(8),  ko.observable(7),
    ko.observable(6),  ko.observable(5),
    ko.observable(4),  ko.observable(3),
    ko.observable(2),  ko.observable(1)
]);

var evenIntegersOver5 =
    integers.sortBy(function (n) {
        return n();
    }).filter(function (n) {
        n = n();
        return n > 5 && n % 2 === 0;
    });

// ko.toJS(evenIntegersOver5) -> [6, 8, 10];

// The sortBy and filter callbacks are only called for these new items, not
// every item in the array.
integers.splice(0, 0, ko.observable(12), ko.observable(11));

// ko.toJS(evenIntegersOver5) -> [6, 8, 10, 12];

// Set the observable containing 1 in the original array to 14. Again, the
// sortBy and filter callbacks are only called once on index 11. sortBy has
// all of the previous sort keys cached and performs a fast binary sort.
integers()[11](14);

// ko.toJS(evenIntegersOver5) -> [6, 8, 10, 12, 14];
```

## Transformations

all/every, any/some, filter/reject, groupBy, map, sortBy.

Callback functions receive two arguments: an item in the original array, and an observable containing the index of that item in the original array.

```JavaScript
var animals = ko.observableArray(["cat", "dog"]);

var ranks = animals.map(function (name, index) {
    return name + ": " + (index() + 1);
});

// ranks() -> ["cat: 1", "dog: 2"];

animals.reverse();

// ranks() -> ["dog: 1", "cat: 2"];
```

```groupBy``` returns an array of objects containing a key string and a values observableArray.

```JavaScript
var integers = ko.observableArray([1, 2, 3, 4, 5]);

var evenOrOdd = integers.groupBy(function (n) {
    // return value is always coerced into a string
    return n % 2 === 0;
});

// evenOrOdd() -> [
//     { key: "false", values: ko.observableArray([1, 3, 5]) },
//     { key: "true", values: ko.observableArray([2, 4]) }
// ]
```

## Create your own

For examples, see ```ko.arrayTransforms.makeTransform``` in the source code.

Note: While I don’t plan on making tons of breaking changes to ```makeTransform```, the API is still in early stages and may be tweaked in later versions.

## License

X11. See LICENSE.
