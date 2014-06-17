// knockout-arrayTransforms 0.3.0 (https://github.com/mwiencek/knockout-arrayTransforms)
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

    var transformClasses = emptyObject(),
        arrayChangeEvent = "arrayChange";

    function applyChanges(changes) {
        var mappedItems = this.mappedItems,
            moves = emptyObject(),
            offset = 0;

        for (var i = 0, change; change = changes[i]; i++) {
            var status = change.status;

            if (status === "retained") {
                continue;
            }

            var index = change.index,
                moved = change.moved,
                value = change.value,
                item = change.mappedItem,
                tmpItem;

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
                    item = mappedItems[from];
                    mappedItems.splice(from, 1)
                    mappedItems.splice(to, 0, item);

                    if (to > from) {
                        for (var j = from; j < to; j++) {
                            tmpItem = mappedItems[j];
                            tmpItem.index(tmpItem.index.peek() - 1);
                        }
                    } else {
                        for (var j = to + 1; j <= from; j++) {
                            tmpItem = mappedItems[j];
                            tmpItem.index(tmpItem.index.peek() + 1);
                        }
                    }

                    this.valueMoved(value, to, from, item.mappedValue, item);
                }
            }

            if (status === "added") {
                if (moved === undefined) {
                    item = emptyObject();
                    item.index = ko.observable(index);
                    item.value = value;
                    mapValue(this, item);
                    mappedItems.splice(index, 0, item);

                    for (var j = index + 1, len = mappedItems.length; j < len; j++) {
                        tmpItem = mappedItems[j];
                        tmpItem.index(tmpItem.index.peek() + 1);
                    }

                    this.valueAdded(value, index, item.mappedValue, item);
                }
                offset++;

            } else if (status === "deleted") {
                if (moved === undefined) {
                    item = mappedItems.splice(index + offset, 1)[0];
                    if (item.computed) {
                        item.computed.dispose();
                    }

                    for (var j = index + offset + 1, len = mappedItems.length; j < len; j++) {
                        tmpItem = mappedItems[j];
                        tmpItem.index(tmpItem.index.peek() - 1);
                    }

                    this.valueDeleted(value, index + offset, item.mappedValue, item);
                }
                offset--;
            }
        }
    };

    function spliceIn(state, index, value) {
        var transform = state.transform, array = state.transformedArray;
        array.splice(index, 0, value);
        transform.notifySubscribers(array);
        transform.notifySubscribers([{ status: "added", index: index, value: value }], arrayChangeEvent);
    }

    function spliceOut(state, index, value) {
        var transform = state.transform, array = state.transformedArray;
        array.splice(index, 1);
        transform.notifySubscribers(array);
        transform.notifySubscribers([{ status: "deleted", index: index, value: value }], arrayChangeEvent);
    }

    function spliceToFrom(state, to, from, addedValue) {
        var transform = state.transform,
            array = state.transformedArray,
            deletedValue = array[from];

        array.splice(from, 1);
        array.splice(to, 0, addedValue);
        transform.notifySubscribers(array);

        var deletion = { status: "deleted", index: from, value: deletedValue },
            addition = { status: "added", index: to, value: addedValue },
            changes = from <= to ? [deletion, addition] : [addition, deletion];

        if (addedValue === deletedValue) {
            deletion.moved = addition.index;
            addition.moved = deletion.index;
        }

        transform.notifySubscribers(changes, arrayChangeEvent);
    }

    function emptyObject() {
        return Object.create ? Object.create(null) : {};
    }

    function noop() {}

    function exactlyEqual(a, b) { return a === b }

    function mapValue(state, item) {
        var callback = state.callback;

        if (callback === undefined) {
            item.mappedValue = item.value;
            return;
        }

        var owner = state, method = "callback";

        if (typeof callback !== "function") {
            owner = item.value;
            method = callback;
            callback = owner[method];

            if (typeof callback !== "function") {
                item.mappedValue = callback;
                return;

            } else if (ko.isObservable(callback)) {
                watchItem(state, item, callback);
                return;
            }
        }

        var computedValue = ko.computed(function () {
            return owner[method](item.value, item.index);
        });

        if (computedValue.isActive()) {
            computedValue.equalityComparer = exactlyEqual;
            watchItem(state, item, computedValue);
            return computedValue;
        } else {
            item.mappedValue = computedValue.peek();
        }
    }

    function watchItem(self, item, observable) {
        item.mappedValue = observable.peek();

        observable.subscribe(function (newValue) {
            var oldValue = item.mappedValue;
            item.mappedValue = newValue;
            self.valueMutated(item.value, newValue, oldValue, item);
        });
    }

    function makeTransform(proto) {
        function TransformState(original, callback, options) {
            this.original = original;
            this.mappedItems = [];
            this.callback = callback;

            var transform = this.transform = this.init(options);
            if (ko.isObservable(transform) && transform.cacheDiffForKnownOperation) {
                // Disallow knockout to call trackChanges() on this array
                // Writing to it normally isn't support anyway
                transform.subscribe = ko.observableArray.fn.subscribe;

                this.transformedArray = transform.peek();
            }
        }

        TransformState.prototype.applyChanges = applyChanges;
        ko.utils.extend(TransformState.prototype, proto);
        transformClasses[proto.name] = TransformState;

        ko.observableArray.fn[proto.name] = function (callback, options) {
            var state = new TransformState(this, callback, options),
                originalArray = this.peek(),
                initialChanges = [];

            this.subscribe(function (changes) { state.applyChanges(changes) }, null, arrayChangeEvent);

            for (var i = 0, len = originalArray.length; i < len; i++) {
                initialChanges.push({ status: "added", value: originalArray[i], index: i });
            }

            state.applyChanges(initialChanges);
            return state.transform;
        };
    };

    makeTransform({
        name: "sortBy",
        init: function () {
            this.keyCounts = emptyObject();
            this.sortedItems = [];
            return ko.observableArray([]);
        },
        valueAdded: function (value, index, sortKey, item) {
            var mappedIndex = this.sortedIndexOf(sortKey, value, item),
                sortedItems = this.sortedItems,
                keyCounts = this.keyCounts;

            item.mappedIndex = mappedIndex;
            sortedItems.splice(mappedIndex, 0, item);
            keyCounts[sortKey] = (keyCounts[sortKey] || 0) + 1;

            for (var i = mappedIndex + 1, len = sortedItems.length; i < len; i++) {
                sortedItems[i].mappedIndex++;
            }

            spliceIn(this, mappedIndex, value);
        },
        valueDeleted: function (value, index, sortKey, item) {
            var mappedIndex = item.mappedIndex,
                sortedItems = this.sortedItems;

            sortedItems.splice(mappedIndex, 1);
            this.keyCounts[sortKey]--;

            for (var i = mappedIndex, len = sortedItems.length; i < len; i++) {
                sortedItems[i].mappedIndex--;
            }

            spliceOut(this, mappedIndex, value);
        },
        valueMoved: function (value, to, from, sortKey, item) {
            var oldIndex = item.mappedIndex,
                newIndex = this.sortedIndexOf(sortKey, value, item);

            if (oldIndex !== newIndex) {
                this.moveValue(value, sortKey, oldIndex, newIndex, item);
            }
        },
        valueMutated: function (value, newKey, oldKey, item) {
            // Revert to the old key temporarily, since it's already sorted,
            // otherwise the binary search won't work
            item.mappedValue = oldKey;

            var oldIndex = item.mappedIndex,
                newIndex = this.sortedIndexOf(newKey, value, item);

            item.mappedValue = newKey;

            if (oldIndex !== newIndex) {
                this.moveValue(value, newKey, oldIndex, newIndex, item, true);

                var keyCounts = this.keyCounts;
                keyCounts[oldKey]--;
                keyCounts[newKey] = (keyCounts[newKey] || 0) + 1;
            }
        },
        moveValue: function (value, sortKey, oldIndex, newIndex, item, isMutation) {
            var sortedItems = this.sortedItems,
                transformedArray = this.transformedArray;

            // If we're here because of a move in the original array, rather
            // than a mutated value, then the mappedItems array has already
            // been reordered, thus newIndex is correctly adjusted.
            if (isMutation && oldIndex < newIndex) {
                newIndex--;
            }

            sortedItems.splice(oldIndex, 1);
            sortedItems.splice(newIndex, 0, item);
            item.mappedIndex = newIndex;

            if (newIndex > oldIndex) {
                for (var i = oldIndex; i < newIndex; i++) {
                    sortedItems[i].mappedIndex--;
                }
            } else {
                for (var i = newIndex + 1; i <= oldIndex; i++) {
                    sortedItems[i].mappedIndex++;
                }
            }

            spliceToFrom(this, newIndex, oldIndex, value);
        },
        sortedIndexOf: function (key, value, item) {
            var sortedItems = this.sortedItems,
                length = sortedItems.length;

            if (!length) {
                return 0;
            }

            var start = 0, end = length - 1, index;

            while (start <= end) {
                index = (start + end) >> 1;

                if (sortedItems[index].mappedValue < key) {
                    start = index + 1;
                } else if ((end = index) === start) {
                    break;
                }
            }

            // Keep things stably sorted. Only incurs a cost if there are
            // multiple of this key.
            var count = this.keyCounts[key], offset = 0;

            if (count) {
                var mappedItems = this.mappedItems, mappedItem;

                for (var i = 0; i < length; i++) {
                    mappedItem = mappedItems[i];

                    if (mappedItem === item) {
                        break;
                    }
                    if (mappedItem.mappedValue === key) {
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

    function updateFilterMapping() {
        var mappedItems = this.mappedItems,
            mappedIndexProp = this.mappedIndexProp,
            transformedArray = this.transformedArray,
            previousArray = transformedArray.concat(),
            currentItem,
            mappedIndex = 0;

        for (var i = 0, len = mappedItems.length; i < len; i++) {
            currentItem = mappedItems[i];
            currentItem[mappedIndexProp] = mappedIndex;

            if (this.getVisibility(currentItem.mappedValue)) {
                transformedArray[mappedIndex++] = currentItem.value;
            }
        }
        var changes = ko.utils.compareArrays(previousArray, transformedArray, { sparse: true });
        this.transform.notifySubscribers(transformedArray);
        this.transform.notifySubscribers(changes, arrayChangeEvent);
    }

    makeTransform({
        name: "filter",
        mappedIndexProp: "mappedIndex",
        init: function () {
            return ko.observableArray([]);
        },
        valueAdded: function (value, index, visible) {
            visible && this.updateMapping();
        },
        valueDeleted: function (value, index, visible, item) {
            visible && this.makeInvisible(value, index, item[this.mappedIndexProp]);
        },
        valueMoved: function (value, to, from, visible) {
            visible && this.updateMapping();
        },
        valueMutated: function (value, shouldBeVisible, currentlyVisible, item) {
            if (shouldBeVisible && !currentlyVisible) {
                this.updateMapping();

            } else if (!shouldBeVisible && currentlyVisible) {
                this.makeInvisible(value, item.index.peek(), item[this.mappedIndexProp]);
            }
        },
        makeInvisible: function (value, index, mappedIndex) {
            var mappedItems = this.mappedItems,
                mappedIndexProp = this.mappedIndexProp;

            for (var i = index, len = mappedItems.length; i < len; i++) {
                mappedItems[i][mappedIndexProp]--;
            }

            spliceOut(this, mappedIndex, value);
        },
        updateMapping: updateFilterMapping,
        getVisibility: Boolean
    });

    function getGroupVisibility(groupKey) {
        return String(groupKey) === this.groupKey;
    }

    makeTransform({
        name: "groupBy",
        init: function () {
            this.groups = emptyObject();
            return ko.observableArray([]);
        },
        applyChanges: function (changes) {
            var groups = this.groups;

            applyChanges.call(this, changes);

            for (var key in groups) {
                if (!groups[key].transformedArray.length) {
                    this.deleteGroup(key);
                }
            }
        },
        valueAdded: function (value, index, groupKey, item) {
            groupKey = String(groupKey);

            var groups = this.groups;

            if (!groups[groupKey]) {
                var group = new transformClasses.filter(this.original);
                groups[groupKey] = group;

                group.groupKey = groupKey;
                group.mappedItems = this.mappedItems;
                group.mappedIndexProp = "mappedIndex." + groupKey;
                group.getVisibility = getGroupVisibility;

                var object = emptyObject();
                object.key = groupKey;
                object.values = group.transform;

                spliceIn(this, this.transformedArray.length, object);
            }

            groups[groupKey].valueAdded(value, index, true, item);
        },
        valueDeleted: function (value, index, groupKey, item) {
            this.groups[groupKey].valueDeleted(value, index, true, item);
        },
        valueMoved: function (value, to, from, groupKey, item) {
            this.groups[groupKey].valueMoved(value, to, from, true, item);
        },
        valueMutated: function (value, newGroupKey, oldGroupKey, item) {
            var groups = this.groups,
                oldGroup = groups[oldGroupKey];

            oldGroup.makeInvisible(value, item.index.peek(), item[oldGroup.mappedIndexProp]);
            groups[newGroupKey].updateMapping();

            if (!oldGroup.transformedArray.length) {
                this.deleteGroup(String(oldGroupKey));
            }
        },
        deleteGroup: function (groupKey) {
            var transformedArray = this.transformedArray;

            delete this.groups[groupKey];

            for (var i = 0, len = transformedArray.length; i < len; i++) {
                if (transformedArray[i].key === groupKey) {
                    return spliceOut(this, i, transformedArray[i]);
                }
            }
        }
    });

    makeTransform({
        name: "map",
        init: function () {
            return ko.observableArray([]);
        },
        valueAdded: function (value, index, mappedValue) {
            spliceIn(this, index, mappedValue);
        },
        valueDeleted: function (value, index, mappedValue) {
            spliceOut(this, index, mappedValue);
        },
        valueMoved: function (value, to, from, mappedValue) {
            spliceToFrom(this, to, from, mappedValue);
        },
        valueMutated: function (value, newMappedValue, oldMappedValue, item) {
            var index = item.index.peek();
            spliceToFrom(this, index, index, newMappedValue);
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
            return this.truthinessCount === this.mappedItems.length;
        }
    }, allOrAny));

    ko.observableArray.fn.some = ko.observableArray.fn.any;
    ko.observableArray.fn.every = ko.observableArray.fn.all;

    ko.arrayTransforms = {
        makeTransform: makeTransform
    };
});
