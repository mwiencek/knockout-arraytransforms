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

                    this.valueMoved(value, to, from, valueOf(observableOrValue));
                }
            }

            if (status === "added") {
                if (moved === undefined) {
                    var observableOrValue = applyCallback(this, value, index);

                    observables.splice(index, 0, observableOrValue);
                    this.valueAdded(value, index, valueOf(observableOrValue));
                }
                offset++;

            } else if (status === "deleted") {
                if (moved === undefined) {
                    var observableOrValue = observables.splice(index + offset, 1)[0];

                    if (ko.isComputed(observableOrValue)) {
                        observableOrValue.dispose();
                    }
                    this.valueDeleted(value, index + offset, valueOf(observableOrValue));
                }
                offset--;
            }
        }

        notifyAbsoluteChanges(this);
    };

    function notifyAbsoluteChanges(state) {
        var changes = state.changes;

        if (changes && changes.length) {
            offset = 0;

            for (var i = 0, change; change = changes[i]; i++) {
                var status = change.status;

                if (status === "added") {
                    if (change.moved !== undefined) {
                        change.moved -= offset;
                    }
                    offset++;
                } else if (status === "deleted") {
                    change.index -= offset;
                    offset--;
                }
            }
            var transform = state.transform;
            transform.notifySubscribers(transform.peek());
            transform.notifySubscribers(changes, "arrayChange");
            state.changes = [];
        }
    }

    function valueOf(object) {
        return typeof object === "function" ? object.peek() : object;
    }

    function indexOf(value, array) {
        for (var i = 0, len = array.length; i < len; i++) {
            if (array[i] === value) return i;
        }
        return -1;
    }

    function noop() {}

    function exactlyEqual(a, b) { return a === b }

    function applyCallback(state, value, index) {
        var callback = state.callback;

        if (callback === undefined) {
            return value;
        }

        var owner = state, method = "callback";

        if (typeof callback !== "function") {
            owner = value;
            method = callback;
            callback = owner[method];

            if (typeof callback !== "function") {
                return callback;

            } else if (ko.isObservable(callback)) {
                watchValue(state, value, callback);
                return callback;
            }
        }

        var original = state.original,
            computedValue = ko.computed(function () {
                return owner[method](value, index === null ? indexOf(value, original.peek()) : index);
            });

        if (computedValue.isActive()) {
            index = null;
            computedValue.equalityComparer = exactlyEqual;
            watchValue(state, value, computedValue);
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
            notifyAbsoluteChanges(self);
        });
    }

    function makeTransform(proto) {
        function ArrayTransform(original, callback) {
            this.original = original;
            this.observables = [];
            this.callback = callback;
            this.transform = this.init();
        }

        ko.utils.extend(ArrayTransform.prototype, proto);

        ko.observableArray.fn[proto.name] = function (callback) {
            var state = new ArrayTransform(this, callback),
                transform = state.transform;

            if (ko.isObservable(transform) && transform.cacheDiffForKnownOperation) {
                state.changes = [];
                state.transformedArray = transform.peek();

                // Don't allow knockout to call trackChanges()
                // Writing to this normally isn't supported anyway
                transform.subscribe = ko.observableArray.fn.subscribe;
            }

            this.subscribe(applySequentialDiff, state, "arrayChange");

            var originalArray = this.peek(),
                initialChanges = [];

            for (var i = 0, len = originalArray.length; i < len; i++) {
                initialChanges.push({ status: "added", value: originalArray[i], index: i });
            }

            applySequentialDiff.call(state, initialChanges);
            return transform;
        };
    };

    makeTransform({
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
                mappedIndex = indexOf(value, transform);

            transform.splice(mappedIndex, 1);
            this.sortedKeys.splice(mappedIndex, 1);
            this.keyCounts[sortKey]--;
            this.changes.push({ status: "deleted", value: value, index: mappedIndex });
        },
        valueMoved: function (value, to, from, sortKey) {
            var oldIndex = indexOf(value, this.transformedArray),
                newIndex = this.sortedIndexOf(sortKey, value);

            if (oldIndex !== newIndex) {
                this.moveValue(value, sortKey, oldIndex, newIndex);
            }
        },
        valueMutated: function (value, newKey, oldKey) {
            var oldIndex = indexOf(value, this.transformedArray),
                newIndex = this.sortedIndexOf(newKey, value);

            if (oldIndex !== newIndex) {
                this.moveValue(value, newKey, oldIndex, newIndex, true);

                var keyCounts = this.keyCounts;
                keyCounts[oldKey]--;
                keyCounts[newKey] = (keyCounts[newKey] + 1) || 1;
            }
        },
        moveValue: function (value, sortKey, oldIndex, newIndex, isMutation) {
            var transform = this.transformedArray,
                sortedKeys = this.sortedKeys;

            transform.splice(oldIndex, 1);
            sortedKeys.splice(oldIndex, 1);

            // If we're here because of a move in the original array, rather
            // than a mutated value, then the observables array has already
            // been reordered, thus newIndex is correctly adjusted.
            if (isMutation && oldIndex < newIndex) {
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

    makeTransform({
        name: "filter",
        init: function () {
            this.mappedIndexes = [];
            return ko.observableArray([]);
        },
        valueAdded: function (value, index, shouldBeVisible) {
            var mapping = this.mappedIndexes, mappedIndex = 0;

            if (index > 0) {
                mappedIndex = mapping[index - 1] || 0;

                if (valueOf(this.observables[index - 1])) {
                    mappedIndex++;
                }
            }
            mapping.splice(index, 0, mappedIndex);

            if (shouldBeVisible) {
                this.transformedArray.splice(mappedIndex, 0, value);

                for (var i = index + 1, len = mapping.length; i < len; i++) {
                    mapping[i]++;
                }
                this.changes.push({ status: "added", index: mappedIndex, value: value });
            }
        },
        valueDeleted: function (value, index, shouldBeVisible) {
            var mapping = this.mappedIndexes, mappedIndex = mapping[index];
            mapping.splice(index, 1);

            if (shouldBeVisible) {
                this.transformedArray.splice(mappedIndex, 1);

                for (var i = index, len = mapping.length; i < len; i++) {
                    mapping[i]--;
                }
                this.changes.push({ status: "deleted", index: mappedIndex, value: value });
            }
        },
        valueMoved: function (value, to, from, shouldBeVisible) {
            this.valueDeleted(value, from, shouldBeVisible);
            this.valueAdded(value, to, shouldBeVisible);

            if (shouldBeVisible) {
                var changes = this.changes,
                    length = changes.length,
                    addition = changes[length - 1],
                    deletion = changes[length - 2];

                addition.moved = deletion.index;
                deletion.moved = addition.index;
            }
        },
        valueMutated: function (value, shouldBeVisible, currentlyVisible) {
            if (shouldBeVisible && !currentlyVisible) {
                this.valueAdded(value, indexOf(value, this.original.peek()), true);

            } else if (!shouldBeVisible && currentlyVisible) {
                this.valueDeleted(value, indexOf(value, this.original.peek()), true);
            }
        }
    });

    makeTransform({
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
        valueMoved: function (value, to, from, mappedValue) {
            this.transformedArray.splice(from, 1);
            this.transformedArray.splice(to, 0, mappedValue);

            this.changes.push(
                { status: "added", index: to, moved: from, value: mappedValue },
                { status: "deleted", index: from, moved: to, value: mappedValue }
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
        valueMoved: noop,
        valueMutated: function (value, newTruthiness, oldTruthiness) {
            if (newTruthiness && !oldTruthiness) {
                this.truthinessCount++;
            } else if (oldTruthiness && !newTruthiness) {
                this.truthinessCount--;
            }
            this.transform(this.getTruthiness());
        }
    };

    makeTransform(ko.utils.extend({
        name: "any",
        getTruthiness: function () {
            return this.truthinessCount > 0;
        }
    }, allOrAny));

    makeTransform(ko.utils.extend({
        name: "all",
        getTruthiness: function () {
            return this.truthinessCount === this.observables.length;
        }
    }, allOrAny));

    ko.observableArray.fn.some = ko.observableArray.fn.any;
    ko.observableArray.fn.every = ko.observableArray.fn.all;

    ko.arrayTransforms = {
        makeTransform: makeTransform
    };
});
