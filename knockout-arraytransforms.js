/**
 * @license knockout-arraytransforms 0.6.0 (https://github.com/mwiencek/knockout-arraytransforms)
 * Released under the X11 License; see the LICENSE file in the official code repository.
 */
(function (factory) {
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = factory(require('knockout'));
    } else if (typeof define === 'function' && define.amd) {
        define(['knockout'], factory);
    } else {
        factory(window.ko);
    }
})(function (ko) {
    'use strict';

    var uniqueID = 1;

    function TransformBase() {}

    TransformBase.prototype.init = function (original, callback, options) {
        this.mappedItems = [];
        this.original = original;
        this.callback = callback;
        this.state = this.getInitialState(options);

        var state = this.state;
        if (ko.isObservable(state) && state.cacheDiffForKnownOperation) {
            // Disallow knockout to call trackChanges() on this array
            // Writing to it normally isn't support anyway
            if (ko.version >= '3.3.0') {
                state.beforeSubscriptionAdd = ko.observableArray.fn.beforeSubscriptionAdd;
                state.afterSubscriptionRemove = ko.observableArray.fn.afterSubscriptionRemove;
            } else {
                state.subscribe = ko.observableArray.fn.subscribe;
            }
            this.previousState = this.state.peek().concat();
        }
    };

    TransformBase.prototype.applyChanges = function (changes) {
        var self = this;
        var mappedItems = this.mappedItems;
        var moves = Object.create(null);
        var minIndex = 0;
        var offset = 0;

        changes.forEach(function (change) {
            if (change.status === 'retained') {
                return;
            }

            var index = change.index;
            var isMove = change.moved !== undefined;
            var item = null;
            var from;

            minIndex = Math.min(minIndex, index);

            if (change.status === 'added') {
                from = change.moved + offset;

                if (isMove) {
                    item = moves[index];

                    if (!item) {
                        item = moves[index] = mappedItems[from];
                        mappedItems[from] = null;
                    }
                } else {
                    item = Object.create(null);
                    item.index = ko.observable(index);
                    item.index.isDifferent = isDifferent;
                    item.value = change.value;
                    self.mapValue(item);
                }

                mappedItems.splice(index, 0, item);
                self.valueAdded(change.value, index, item.mappedValue, item, isMove);
                offset++;
            } else if (change.status === 'deleted') {
                from = index + offset;

                if (isMove) {
                    item = moves[change.moved] || (moves[change.moved] = mappedItems[from]);
                } else {
                    item = mappedItems[from];
                    if (item.computed) {
                        item.computed.dispose();
                    }
                }

                mappedItems.splice(from, 1);
                self.valueDeleted(change.value, from, item.mappedValue, item, isMove);
                offset--;
            }
        });

        for (var i = minIndex, len = mappedItems.length; i < len; i++) {
            mappedItems[i].index(i);
        }

        this.notifyChanges();
    };

    TransformBase.prototype.notifyChanges = function () {
        var state = this.state.peek();

        if (state) {
            var changes = ko.utils.compareArrays(this.previousState, state, {sparse: true});
            if (changes.length) {
                this.previousState = state.concat();

                var original = this.original;
                var notifySubscribers = original.notifySubscribers;
                var previousOriginalArray = original.peek().concat();
                var pendingArrayChange = false;

                original.notifySubscribers = function (valueToNotify, event) {
                    if (event === 'arrayChange') {
                        pendingArrayChange = true;
                    } else {
                        notifySubscribers.apply(original, arguments);
                    }
                };

                this.state.notifySubscribers(state);
                this.state.notifySubscribers(changes, 'arrayChange');

                original.notifySubscribers = notifySubscribers;
                if (pendingArrayChange) {
                    changes = ko.utils.compareArrays(previousOriginalArray, original.peek(), {sparse: true});
                    if (changes.length) {
                        original.notifySubscribers(changes, 'arrayChange');
                    }
                }
            }
        }
    };

    TransformBase.prototype.mapValue = function (item) {
        var callback = this.callback;

        if (callback === undefined) {
            item.mappedValue = item.value;
            return;
        }

        var owner = this;
        var method = 'callback';

        if (typeof callback !== 'function') {
            owner = item.value;
            method = callback;
            callback = owner[method];

            if (typeof callback !== 'function') {
                item.mappedValue = callback;
                return;

            } else if (ko.isObservable(callback)) {
                this.watchItem(item, callback);
                return;
            }
        }

        var computedValue = ko.computed(function () {
            return owner[method](item.value, item.index);
        });

        if (computedValue.isActive()) {
            computedValue.equalityComparer = isEqual;

            this.watchItem(item, computedValue);
            item.computed = computedValue;

            return computedValue;
        }

        item.mappedValue = computedValue.peek();
    };

    TransformBase.prototype.watchItem = function (item, observable) {
        var self = this;

        item.mappedValue = observable.peek();

        observable.subscribe(function (newValue) {
            self.valueMutated(item.value, newValue, item.mappedValue, item);

            // Must be updated after valueMutated because sortBy/filter/etc.
            // expect/need the old mapped value
            item.mappedValue = newValue;

            self.notifyChanges();
        });
    };

    function isEqual(a, b) {
        return a === b;
    }

    function isDifferent(a, b) {
        return a !== b;
    }

    function createTransform(name, proto) {
        function Transform() {}

        Transform.prototype = new TransformBase();
        ko.utils.extend(Transform.prototype, proto);

        ko.observableArray.fn[name] = function (callback, options) {
            var transform = new Transform();
            transform.init(this, callback, options);

            var initialState = this.peek();
            this.subscribe(transform.applyChanges, transform, 'arrayChange');

            transform.applyChanges(
                initialState.map(function (value, index) {
                    return {status: 'added', value: value, index: index};
                })
            );

            return transform.state;
        };

        return Transform;
    }

    createTransform('sortBy', {
        getInitialState: function () {
            this.keyCounts = Object.create(null);
            this.sortedItems = [];
            return ko.observableArray([]);
        },
        valueAdded: function (value, index, sortKey, item, isMove) {
            var mappedIndex = this.sortedIndexOf(sortKey, value, item);
            var sortedItems = this.sortedItems;

            if (isMove) {
                // The item will exist twice in sortedItems, so we won't be
                // able to use indexOf later.
                var currentMappedIndex = sortedItems.indexOf(item);

                if (currentMappedIndex >= 0) {
                    item.previousMappedIndex = currentMappedIndex;
                }
            }

            var keyCounts = this.keyCounts;
            sortedItems.splice(mappedIndex, 0, item);
            keyCounts[sortKey] = (keyCounts[sortKey] || 0) + 1;
            this.state.peek().splice(mappedIndex, 0, value);

            var seen = uniqueID++;
            for (var i = mappedIndex, len = sortedItems.length; i < len; i++) {
                item = sortedItems[i];

                if (item.seen !== seen && item.previousMappedIndex !== undefined && item.previousMappedIndex >= mappedIndex) {
                    ++item.previousMappedIndex;
                }
                item.seen = seen;
            }
        },
        valueDeleted: function (value, index, sortKey, item, isMove) {
            var sortedItems = this.sortedItems, mappedIndex;

            if (isMove && item.previousMappedIndex !== undefined) {
                mappedIndex = item.previousMappedIndex;
                delete item.previousMappedIndex;
            } else {
                mappedIndex = sortedItems.indexOf(item);
            }

            sortedItems.splice(mappedIndex, 1);
            this.keyCounts[sortKey]--;
            this.state.peek().splice(mappedIndex, 1);

            var seen = uniqueID++;
            for (var i = mappedIndex, len = sortedItems.length; i < len; i++) {
                item = sortedItems[i];

                if (item.seen !== seen && item.previousMappedIndex !== undefined && item.previousMappedIndex > mappedIndex) {
                    --item.previousMappedIndex;
                }
                item.seen = seen;
            }
        },
        valueMutated: function (value, newKey, oldKey, item) {
            var keyCounts = this.keyCounts;
            var oldIndex = this.sortedItems.indexOf(item);
            var newIndex = this.sortedIndexOf(newKey, value, item);

            keyCounts[oldKey]--;
            keyCounts[newKey] = (keyCounts[newKey] || 0) + 1;

            // The mappedItems array hasn't been touched yet, so adjust for that
            if (oldIndex < newIndex) {
                newIndex--;
            }

            if (oldIndex !== newIndex) {
                var state = this.state.peek();
                var sortedItems = this.sortedItems;

                sortedItems.splice(oldIndex, 1);
                sortedItems.splice(newIndex, 0, item);

                state.splice(oldIndex, 1);
                state.splice(newIndex, 0, value);
            }
        },
        sortedIndexOf: function (key, value, item) {
            var sortedItems = this.sortedItems;
            var length = sortedItems.length;

            if (!length) {
                return 0;
            }

            var start = 0;
            var end = length - 1;
            var index;

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
                    if (!(mappedItem = mappedItems[i])) {
                        continue;
                    }
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

    var filterOrReject = {
        mappedIndexProp: 'mappedIndex',
        getInitialState: function () {
            return ko.observableArray([]);
        },
        filteredIndexOf: function (items, prop, index) {
            var previousItem;
            var mappedIndex = 0;

            if (index > 0) {
                previousItem = items[index - 1];
                mappedIndex = previousItem[prop] || 0;

                if (this.getVisibility(previousItem.mappedValue)) {
                    mappedIndex++;
                }
            }

            return mappedIndex;
        },
        valueAdded: function (value, index, visible, item) {
            visible = this.getVisibility(visible);

            var mappedItems = this.mappedItems;
            var mappedIndexProp = this.mappedIndexProp;

            if (visible) {
                for (var i = index + 1, len = mappedItems.length, tmp; i < len; i++) {
                    tmp = mappedItems[i];
                    if (tmp) {
                        tmp[mappedIndexProp]++;
                    }
                }
            }

            var mappedIndex = this.filteredIndexOf(mappedItems, mappedIndexProp, index);
            if (visible) {
                this.state.peek().splice(mappedIndex, 0, value);
            }
            item[mappedIndexProp] = mappedIndex;
        },
        valueDeleted: function (value, index, visible, item) {
            if (this.getVisibility(visible)) {
                var mappedItems = this.mappedItems;
                var mappedIndexProp = this.mappedIndexProp;
                var mappedIndex = this.filteredIndexOf(mappedItems, mappedIndexProp, index);

                // In normal cases, this item will already be spliced out of
                // mappedItems, because it was removed from the original array.
                // But in conjunction with groupBy, which uses filter
                // underneath, all of the groups share a single mappedItems
                // and use valueDelete here to "hide" an item from a group even
                // though it still exists in the original array. In that case,
                // increment index so that we only update the mappedItems
                // beyond the hidden one.

                if (mappedItems[index] === item) {
                    index++;
                }

                for (var i = index, len = mappedItems.length, tmp; i < len; i++) {
                    tmp = mappedItems[i];
                    if (tmp) {
                        tmp[mappedIndexProp]--;
                    }
                }

                this.state.peek().splice(mappedIndex, 1);
            }
        },
        valueMutated: function (value, shouldBeVisible, currentlyVisible, item) {
            var index = this.mappedItems.indexOf(item);
            this.valueAdded(value, index, shouldBeVisible, item);
            this.valueDeleted(value, index, currentlyVisible, item);
        }
    };

    var FilterTransform = createTransform('filter', ko.utils.extend({getVisibility: Boolean}, filterOrReject));

    createTransform('reject', ko.utils.extend({getVisibility: function (x) {return !x}}, filterOrReject));

    function GroupByFilterTransform(original, groupKey, mappedItems) {
        this.init(original);

        this.groupKey = groupKey;
        this.mappedItems = mappedItems;
        this.mappedIndexProp = 'mappedIndex.' + groupKey;
    }

    GroupByFilterTransform.prototype = new FilterTransform();

    GroupByFilterTransform.prototype.getVisibility = function (groupKey) {
        return String(groupKey) === this.groupKey;
    };

    createTransform('groupBy', {
        getInitialState: function () {
            this.groups = Object.create(null);
            return ko.observableArray([]);
        },
        applyChanges: function (changes) {
            var groups = this.groups;
            var deletions = false;
            var key;

            TransformBase.prototype.applyChanges.call(this, changes);

            for (key in groups) {
                groups[key].notifyChanges();

                if (!groups[key].state.peek().length) {
                    this.deleteGroup(key);
                    deletions = true;
                }
            }

            if (deletions) {
                this.notifyChanges();
            }
        },
        valueAdded: function (value, index, groupKey, item) {
            groupKey = String(groupKey);

            var groups = this.groups;
            var key;

            if (!groups[groupKey]) {
                var group = new GroupByFilterTransform(this.original, groupKey, this.mappedItems);
                groups[groupKey] = group;

                var object = Object.create(null);
                object.key = groupKey;
                object.values = group.state;

                this.state.peek().push(object);
            }

            for (key in groups) {
                groups[key].valueAdded(value, index, groupKey, item);
            }
        },
        valueDeleted: function (value, index, groupKey, item) {
            var groups = this.groups;
            var key;

            for (key in groups) {
                groups[key].valueDeleted(value, index, groupKey, item);
            }
        },
        valueMutated: function (value, newGroupKey, oldGroupKey, item) {
            var groups = this.groups;
            var index = this.mappedItems.indexOf(item);
            var group;
            var key;

            this.valueDeleted(value, index, oldGroupKey, item);
            this.valueAdded(value, index, newGroupKey, item);

            for (key in groups) {
                group = groups[key];

                group.notifyChanges();

                if (!group.state.peek().length) {
                    this.deleteGroup(key);
                }
            }
        },
        deleteGroup: function (groupKey) {
            var state = this.state.peek();

            delete this.groups[groupKey];

            for (var i = 0, len = state.length; i < len; i++) {
                if (state[i].key === groupKey) {
                    return state.splice(i, 1);
                }
            }
        }
    });

    createTransform('map', {
        getInitialState: function () {
            return ko.observableArray([]);
        },
        valueAdded: function (value, index, mappedValue) {
            this.state.peek().splice(index, 0, mappedValue);
        },
        valueDeleted: function (value, index) {
            this.state.peek().splice(index, 1);
        },
        valueMutated: function (value, newMappedValue, oldMappedValue, item) {
            this.state.peek()[this.mappedItems.indexOf(item)] = newMappedValue;
        }
    });

    var allOrAny = {
        getInitialState: function () {
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
            this.state(this.getTruthiness());
        }
    };

    createTransform('any', ko.utils.extend({
        getTruthiness: function () {
            return this.truthinessCount > 0;
        }
    }, allOrAny));

    createTransform('all', ko.utils.extend({
        getTruthiness: function () {
            return this.truthinessCount === this.mappedItems.length;
        }
    }, allOrAny));

    ko.observableArray.fn.some = ko.observableArray.fn.any;
    ko.observableArray.fn.every = ko.observableArray.fn.all;

    ko.arraytransforms = {
        createTransform: createTransform
    };

    // Deprecated aliases
    ko.arrayTransforms = ko.arraytransforms;
    ko.arrayTransforms.makeTransform = ko.arraytransforms.createTransform;

    return ko.arraytransforms;
});
