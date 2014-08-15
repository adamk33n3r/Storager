/**
 * Created by Adam on 8/13/2014.
 * Enhancements to Storage
 *
 * Storager is a wrapper around HTML5's localStorage. It supplies a centralized system for cross-window/tab data
 * storage. A key feature of Storager is the ability to listen on any key.
 *
 * TODO: Add TTL?
 * TODO: Add functionality to data structures to provide methods to Storager. Useful for listeners which right now
 *       only get copies of the data. Would be able to pop off of array and have that reflect in storage.
 */

var _setItem = Storage.prototype.setItem;
var _getItem = Storage.prototype.getItem;

Storage.prototype.setItem = function (key, value) {
    if (this === window.localStorage) {
        _setItem.apply(this, [key, JSON.stringify(value)]);
    } else
        _setItem.apply(this, arguments);
};

Storage.prototype.getItem = function (key) {
    if (this === window.localStorage) {
        var value = JSON.parse(_getItem.apply(this, arguments));
        return value;
    } else
        _getItem.apply(this, arguments);
};

var storager = {
    _initialized: false,
    _app_name: "storager_app",
    _vars: {},
    _defaults: {},
    init: function (vars) {
        /**
         * vars should be an obj containing the elements app_name, global and local.
         *
         * global variables will be initialized in localStorage and will be accessible from different windows.
         * local variables will be initialized in a local data structure and will not be accessible from different windows.
         *
         * both should be an array of objects in the following format:
         * [{name: "name", value: "value"}, {name: "version", value: "1.1.4"}]
         * name must be string
         * value can be any native JS type, null, undefined, boolean, integer, string, array, object
         *
         * Example:
         * {
         *     global: [
         *         { name: "global_var", value: 56 }
         *     ],
         *     local: [
         *         { name: "local_var1", value: "cool_value" },
         *         { name: "local_var2", value: "this is sweet" }
         *     ]
         * }
         */
        // If you have already called init, return.
        if (this._initialized) return;
        this._initialized = true;
        this._defaults = vars;
        this._app_name = vars.app_name;

        // Add a listener to storage and add the handler.
        window.addEventListener("storage", this._handle_storage);

        // Initialize local variables.
        if (vars.local)
            vars.local.forEach(function (val) {
                storager._vars[val.name] = val.value;
            });

        // If global variables have already been initialized, return.
        console.log("checking if vars are there already:",window.localStorage);
        if (vars.global[0].name in window.localStorage) return;

//        // Set global initialized flag so that other tabs don't initialize global variables.
//        this.set("storager.initialized", true);

        // Initialize global variables.
        if (vars.global)
            vars.global.forEach(function (val) {
                console.log("setting: " + val.name + " to: " + val.value);
                storager.set(val.name, val.value);
            });
    },
    reset: function (global, local, wipe) {
        if (wipe) {
            window.localStorage.clear();
            this._vars = {};
        }

        if (global) {
            // Initialize global variables.
            if (this._defaults.global)
                this._defaults.global.forEach(function (val) {
                    storager.set(val.name, val.value);
                });
        }

        if (local) {
            // Initialize local variables.
            if (this._defaults.local)
                this._defaults.local.forEach(function (val) {
                    storager._vars[val.name] = val.value;
                });
        }
    },
    _check_if_init: function () {
        if (!this._initialized) throw "Data structure not initialized. Call storager.init() first. storager.init() should only be called once!";
        return true;
    },
    _handle_storage: function (e) {
        var type = e.key;
        var event = new CustomEvent(storager._app_name + "." + type, {
            "detail": {
                "from": JSON.parse(e.oldValue),
                "to": JSON.parse(e.newValue),
                "data": JSON.parse(e.newValue), //alias
                "page": e.url
            },
            "cancelable": true
        });
        window.dispatchEvent(event);
    },
    get: function (key, local) {
        // Should add caching to this so I am not parsing over and over.
        // Probably have internal data structure and use _handle_storage to update it.
        // Then have this function just return the internal data structure data
        console.log("storager module still needs caching...");
        this._check_if_init();
        if (local)
            return this._vars[key];
        else
            return window.localStorage.getItem(key);
    },
    set: function (key, value, local) {
        this._check_if_init();
        if (local)
            this._vars[key] = value;
        else
            window.localStorage.setItem(key, value)
    },
    getLocal: function (key) {
        return this.get(key, true);
    },
    setLocal: function (key, value) {
        this.set(key, value, true);
    },
    delete: function (key) {
        // Could add TTL to this method
        delete window.localStorage[key];
    },
    push: function (key, value) {
        this._check_if_init();
        var data = this.get(key);
        data.push(value);
        this.set(key, data);
    },
    pop: function (key) {
        var data = this.get(key);
        var ret_val = data.pop();
        this.set(key, data);
        return ret_val;
    },
    dequeue: function (queue_name, method) {
        var queue = this.get(queue_name + "_queue");
        var data = queue[method];
        var ret_val = data.shift();
        queue[method] = data;
        this.set(queue_name + "_queue", queue);
        return ret_val;
    },
    addToObj: function (storage_key, key, value) {
        this._check_if_init();
        var obj = this.get(storage_key);
        obj[key] = value;
        this.set(key, obj);
    },
    listenTo: function (key, callback) {
        // Events will be dispatched on every set. Use this function to listen to those events.
        window.addEventListener(this._app_name + "." + key, callback);
    },
    listenToQueue: function (queue_name, callback) {
        this.listenTo(queue_name + "_queue", callback);
    },
    addToQueue: function (queue_name, method, data) {
        this._check_if_init();
        var queue = this.get(queue_name + "_queue") || {};
//        if (!(queue_name in queue)) queue[queue_name] = {};
        if (!(method in queue)) queue[method] = [];
        queue[method].push(data);
        this.set(queue_name + "_queue", queue);
    },
    getQueue: function (window, method) {
        this._check_if_init();
        return this.get(window + "_queue")[method];
    }
};