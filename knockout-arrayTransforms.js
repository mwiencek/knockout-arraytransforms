// knockout-arrayTransforms 0.2.1 (https://github.com/mwiencek/knockout-arrayTransforms)
// Released under the MIT (X11) License; see the LICENSE file in the official code repository.

(function (factory) {
    if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
        factory(module.exports = require("knockout"));
    } else if (typeof define === "function" && define.amd) {
        define(["knockout"], factory);
    } else {
        factory(window.ko);
    }
})(function (ko) {
    ko.arrayTranforms = {};

    function applySequentialDiff(changes) {
        var moves = {}, offset = 0;

        for (var i = 0, change; change = changes[i]; i++) {
            var status = change.status;

            if (status === "retained") {
                continue;
            }

            var observables = this.observables,
                index = change.index,
                moved = change.moved,
                value = change.value;

            if (moved !== undefined) {
                // For added statuses, index is a position in the new
                // array and moved is a position in the old array. For
                // deleted statuses, it's the opposite.
                if (status === "added") {
                    var to = index, from = moved + offset;

                } else if (status === "deleted") {
                    var to = moved, from = index + offset;
                }

                if (moves[to] === undefined) {
                    moves[to] = true;

                    var observableOrValue = observables[from];
                    observables.splice(from, 1)
                    observables.splice(to, 0, observableOrValue);

                    this.valueMoved(value, to, from, offset, valueOf(observableOrValue));
                }
            }

            if (status === "added") {
                if (moved === undefined) {
                    var observableOrValue = this.applyCallback(value, index);

                    observables.splice(index, 0, observableOrValue);
                    this.valueAdded(value, index, valueOf(observableOrValue));
                }
                offset++;

            } else if (status === "deleted") {
                if (moved === undefined) {
                    var observableOrValue = observables.splice(index + offset, 1)[0];

                    if (ko.isObservable(observableOrValue)) {
                        observableOrValue.dispose();
                    }
                    this.valueDeleted(value, index + offset, valueOf(observableOrValue));
                }
                offset--;
            }
        }

        if (this.changes && this.changes.length) {
            this.transform.notifySubscribers(this.transform.peek());
        }
    };

    function valueOf(object) {
        return typeof object === "function" ? object.peek() : object;
    }

    function indexOf(value, array, reverse) {
        var length = array.length, i = length, j;

        while (i--) {
            j = reverse ? i : length - i - 1;

            if (array[j] === value) {
                return j;
            }
        }
        return -1;
    }

    function noop() {}

    function exactlyEqual(a, b) { return a === b }

    function applyCallback(value, index) {
        var callback = this.callback;

        if (callback === undefined) {
            return value;
        }

        var owner = this, method = "callback";

        if (typeof callback !== "function") {
            owner = value;
            method = callback;
            callback = owner[method];

            if (typeof callback !== "function") {
                return callback;

            } else if (ko.isObservable(callback)) {
                watchValue(this, value, callback);
                return callback;
            }
        }

        var original = this.original,
            computedValue = ko.computed(function () {
                return owner[method](value, index === null ? indexOf(value, original.peek()) : index);
            });

        if (computedValue.isActive()) {
            index = null;
            computedValue.equalityComparer = exactlyEqual;
            watchValue(this, value, computedValue);
            return computedValue;
        } else {
            computedValue.dispose();
            return computedValue.peek();
        }
    }

    function watchValue(self, value, observable) {
        var currentValue = observable.peek();

        observable.subscribe(function (newValue) {
            self.valueMutated(value, newValue, currentValue);

            currentValue = newValue;

            if (self.changes && self.changes.length) {
                self.transform.notifySubscribers(self.transform.peek());
            }
        });
    }

    ko.arrayTranforms.makeTransform = function (proto) {
        function ArrayTransform(original, callback) {
            this.original = original;
            this.observables = [];
            this.callback = callback;
            this.transform = this.init();
        }

        ArrayTransform.prototype.applySequentialDiff = applySequentialDiff;
        ArrayTransform.prototype.applyCallback = applyCallback;
        ko.utils.extend(ArrayTransform.prototype, proto);

        ko.observableArray.fn[proto.name] = function (callback) {
            var state = new ArrayTransform(this, callback),
                transform = state.transform;

            if (ko.isObservable(transform) && transform.cacheDiffForKnownOperation) {
                state.changes = [];
                state.transformedArray = transform.peek();

                // Force knockout to call trackChanges().
                transform.subscribe(noop, null, "arrayChange").dispose();

                // Replace the change subscription it added with our own.
                transform._subscriptions.change[0].callback = function () {
                    var changes = state.changes;

                    if (changes.length) {
                        transform.notifySubscribers(changes, "arrayChange");
                        state.changes = [];
                    }
                };
            }

            this.subscribe(applySequentialDiff, state, "arrayChange");

            var originalArray = this.peek(),
                initialChanges = [];

            for (var i = 0, len = originalArray.length; i < len; i++) {
                initialChanges.push({ status: "added", value: originalArray[i], index: i });
            }

            state.applySequentialDiff(initialChanges);
            delete originalArray;
            delete initialChanges;

            return transform;
        };
    };

    ko.arrayTranforms.makeTransform({
        name: "sortBy",
        init: function () {
            this.keyCounts = {};
            this.sortedKeys = [];
            return ko.observableArray([]);
        },
        valueAdded: function (value, index, sortKey) {
            var mappedIndex = this.sortedIndexOf(sortKey, value),
                keyCounts = this.keyCounts;

            this.transformedArray.splice(mappedIndex, 0, value);
            this.sortedKeys.splice(mappedIndex, 0, sortKey);
            keyCounts[sortKey] = (keyCounts[sortKey] + 1) || 1;
            this.changes.push({ status: "added", value: value, index: mappedIndex });
        },
        valueDeleted: function (value, index, sortKey) {
            var transform = this.transformedArray,
                mappedIndex = indexOf(value, transform, index > (transform.length / 2));

            transform.splice(mappedIndex, 1);
            this.sortedKeys.splice(mappedIndex, 1);
            this.keyCounts[sortKey]--;
            this.changes.push({ status: "deleted", value: value, index: mappedIndex });
        },
        valueMoved: function (value, to, from, offset, sortKey) {
            var oldIndex = indexOf(value, this.transformedArray),
                newIndex = this.sortedIndexOf(sortKey, value);

            if (oldIndex !== newIndex) {
                this.moveValue(value, sortKey, oldIndex, newIndex);
            }
        },
        valueMutated: function (value, newKey, oldKey) {
            var oldIndex = this.sortedIndexOf(oldKey, value),
                newIndex = this.sortedIndexOf(newKey, value);

            if (oldIndex !== newIndex) {
                this.moveValue(value, newKey, oldIndex, newIndex);

                var keyCounts = this.keyCounts;
                keyCounts[oldKey]--;
                keyCounts[newKey] = (keyCounts[newKey] + 1) || 1;
            }
        },
        moveValue: function (value, sortKey, oldIndex, newIndex) {
            var transform = this.transformedArray,
                sortedKeys = this.sortedKeys;

            transform.splice(oldIndex, 1);
            sortedKeys.splice(oldIndex, 1);

            if (oldIndex < newIndex) {
                newIndex--;
            }

            transform.splice(newIndex, 0, value);
            sortedKeys.splice(newIndex, 0, sortKey);

            this.changes.push(
                { status: "added", index: newIndex, moved: oldIndex, value: value },
                { status: "deleted", index: oldIndex, moved: newIndex, value: value }
            );
        },
        sortedIndexOf: function (key, value) {
            var sortedKeys = this.sortedKeys,
                length = sortedKeys.length;

            if (length === 0) {
                return 0;
            }

            var start = 0, end = length - 1, index;

            while (start <= end) {
                index = (start + end) >> 1;

                if (sortedKeys[index] < key) {
                    start = index + 1;
                } else {
                    end = index;

                    if (start === end) {
                        break;
                    }
                }
            }

            // Keep things stably sorted. Only incurs a cost if there are
            // multiple of this key.
            var count = this.keyCounts[key], offset = 0;

            if (count) {
                var original = this.original.peek(),
                    observables = this.observables;

                for (var i = 0; i < length; i++) {
                    if (original[i] === value) {
                        break;
                    }
                    if (valueOf(observables[i]) === key) {
                        offset++;
                    }
                    if (offset === count) {
                        break;
                    }
                }
            }

            return start + offset;
        }
    });

    ko.arrayTranforms.makeTransform({
        name: "filter",
        init: function () {
            return ko.observableArray([]);
        },
        valueAdded: function (value, index, shouldBeVisible) {
            if (shouldBeVisible) {
                var mappedIndex = this.filterIndexOf(value, index > (this.original.peek().length / 2));

                this.transformedArray.splice(mappedIndex, 0, value);
                this.changes.push({ status: "added", index: mappedIndex, value: value });
            }
        },
        valueDeleted: function (value, index, shouldBeVisible) {
            if (shouldBeVisible) {
                var transform = this.transformedArray,
                    mappedIndex = indexOf(value, transform, index > (this.original.peek().length / 2));

                transform.splice(mappedIndex, 1);
                this.changes.push({ status: "deleted", index: mappedIndex, value: value });
            }
        },
        valueMoved: function (value, to, from, offset, shouldBeVisible) {
            if (shouldBeVisible) {
                var transform = this.transformedArray,
                    middleIndex = this.original.peek().length / 2,
                    deletedIndex = indexOf(value, transform, from > middleIndex);

                transform.splice(deletedIndex, 1);

                var addedIndex = this.filterIndexOf(value, to > middleIndex);
                transform.splice(addedIndex, 0, value);

                this.changes.push(
                    { status: "deleted", index: deletedIndex, moved: addedIndex, value: value },
                    { status: "added", index: addedIndex, moved: deletedIndex, value: value }
                );
            }
        },
        valueMutated: function (value, shouldBeVisible, currentlyVisible) {
            if (shouldBeVisible && !currentlyVisible) {
                this.valueAdded(value, 0, true);

            } else if (!shouldBeVisible && currentlyVisible) {
                this.valueDeleted(value, 0, true);
            }
        },
        filterIndexOf: function (value, reverse) {
            var observables = this.observables,
                originalArray = this.original.peek(),
                visibleCount = reverse ? 0 : -1,
                length = originalArray.length, i = length, j;

            while (--i) {
                j = reverse ? i : length - i - 1;

                if (originalArray[j] === value) {
                    break;
                }
                if (valueOf(observables[j])) {
                    visibleCount++;
                }
            }
            return reverse ? this.transformedArray.length - visibleCount : visibleCount + 1;
        }
    });

    ko.arrayTranforms.makeTransform({
        name: "map",
        init: function () {
            return ko.observableArray([]);
        },
        valueAdded: function (value, index, mappedValue) {
            this.transformedArray.splice(index, 0, mappedValue);
            this.changes.push({ status: "added", index: index, value: mappedValue });
        },
        valueDeleted: function (value, index, mappedValue) {
            this.transformedArray.splice(index, 1);
            this.changes.push({ status: "deleted", index: index, value: mappedValue });
        },
        valueMoved: function (value, to, from, offset, mappedValue) {
            this.transformedArray.splice(from, 1);
            this.transformedArray.splice(to, 0, mappedValue);

            this.changes.push(
                { status: "added", index: to, moved: from - offset, value: mappedValue },
                { status: "deleted", index: from - offset, moved: to, value: mappedValue }
            );
        },
        valueMutated: function (value, newMappedValue, oldMappedValue) {
            var index = indexOf(value, this.original.peek());
            this.transformedArray.splice(index, 1, newMappedValue);

            this.changes.push(
                { status: "deleted", index: index, value: oldMappedValue },
                { status: "added", index: index, value: newMappedValue }
            );
        }
    });

    var allOrAny = {
        init: function () {
            this.truthinessCount = 0;
            return ko.observable(this.getTruthiness());
        },
        valueAdded: function (value, index, truthiness) {
            this.valueMutated(null, truthiness, false);
        },
        valueDeleted: function (value, index, truthiness) {
            this.valueMutated(null, false, truthiness);
        },
        valueMutated: function (value, newTruthiness, oldTruthiness) {
            if (newTruthiness && !oldTruthiness) {
                this.truthinessCount++;
            } else if (oldTruthiness && !newTruthiness) {
                this.truthinessCount--;
            }
            this.transform(this.getTruthiness());
        }
    };

    ko.arrayTranforms.makeTransform(ko.utils.extend({
        name: "any",
        getTruthiness: function () {
            return this.truthinessCount > 0;
        }
    }, allOrAny));

    ko.arrayTranforms.makeTransform(ko.utils.extend({
        name: "all",
        getTruthiness: function () {
            return this.truthinessCount === this.observables.length;
        }
    }, allOrAny));

    ko.observableArray.fn.some = ko.observableArray.fn.any;
    ko.observableArray.fn.every = ko.observableArray.fn.all;
});
