/* Module of prototypes for implementing the observer pattern. 
 * 
 * Depends on underscore.js
 *
 */

var observer = (function() { // module namespace

    // Define 'observable' prototype. 
    // 'observable' provides a simple subscribeable message channel.
    var observable = {
        
        init: function init(sender) {
            if (sender) {
                this._sender = sender;
            }
            else {
                this._sender = this;
            }
            return this;
        },
        
        notify: function notify(message) {
            var self = this;
            if (this._subscribers) {
                _.each(this._subscribers, function(func) {
                    func(self._sender, message);
                });
            }
        },
        
        subscribe: function subscribe(func) {
            if (!('_subscribers' in this)) {
                this._subscribers = [];
            }
            if (this._subscribers.indexOf(func) > -1) {
                throw new Error("Already subscribed");
            }
            this._subscribers.push(func);
        }
    }
    // End definition of "observable" prototype


    // Define "observableField" prototype (inherits from "observable")
    /* 'observableField' allows us to create an object which stores a 
     * value, and notifies its subscribers when that value is changed. 
     * This allows us to create javascript objects with observable
     * properties.
     */
    var observableField = _.extend(Object.create(observable), {
           
        setValidator: function(func) {
            this._validator = func;
            return this;
        },
        
        set: function set(value) {
            if (this._validator && !this._validator(value)) {
                throw new Error("invalid value")
            }
            if (value !== this._data) {
                this._data = value;
                this.notify(value);
            }
            return this;
        },
        
        get: function get() {
            return this._data;
        },

    });
    // End "observableField" prototype definition

    // Define Computed observable prototype (inherits from observable)
    /* A 'computed' object has a similar interface and function to
     * 'observableField', but its value is calculated from the value of
     * other observableField objects. When those objects change, the
     * value of 'computed' is automatically recalculated 
     */
    var computed = _.extend(Object.create(observable), {

        configure: function(dependencies, func) {
            self = this;
            this._dependencies = dependencies;
            this._algorithm = func;
            _.each(this._dependencies, function(observable) {
                observable.subscribe(self.compute.bind(self));
            });
            this.compute();
            return this;
        },
        
        compute: function() {
            var args = _.map(this._dependencies, function(dep) {
                return dep.get();
            });
            var val = this._algorithm.apply(this, args);
            this._cache = val;
            this.notify(val);
            return this;
        },
        
        get: function() {
            return this._cache;
        }
    });

    // End definition of "computed"
    
    // Testing function
    function test() {
        
        var obs, source, obf, obf2, obf3, dataOb, validator, new_val, dep1, dep2, deps, alg, comp;
        
        console.log("tests for observer module");
        
        // observable prototype, subscribe method
        obs = Object.create(observable);
        obs.subscribe(function() {})
        console.log("test 1", obs._subscribers.length === 1) // test 1
        obs.subscribe(function() {})
        console.log("test 2", obs._subscribers.length === 2) // test 2
        obs.subscribe(function() {})
        console.log("test 3", obs._subscribers.length === 3) // test 3
        
        // observable prototype, notify method
        obs = Object.create(observable);
        
        message_text = "this is a message";
        
        obs.subscribe(function(sender, message) {
            console.log("test 4", message === message_text);
        });
        obs.subscribe(function(sender, message) {
            console.log("test 5", message === message_text);
        });
        obs.subscribe(function(sender, message) {
            console.log("test 6", message === message_text);
        });
        obs.notify("this is a message");
        
        // observable, init method
        
        obs = Object.create(observable).init();
        obs.subscribe(function(sender, message) {
            console.log("test 7", sender === obs);
        });
        obs.notify("")
        
        source = {x: 1};
        obs = Object.create(observable).init(source);
        obs.subscribe(function(sender, message) {
            console.log("test 8", sender === source);
        });
        obs.notify("")
        
        // observable field, set method
        obf = Object.create(observableField).init().set(1);
        console.log("test 9", obf._data === 1);
        obf2 = Object.create(observableField).init().set("hello");
        console.log("test 10", obf2._data === "hello");
        dataOb = {x:1, y:2};
        obf3 = Object.create(observableField).init().set(dataOb);
        console.log("test 11", obf3._data === dataOb);
        
        // observable field, setValidator method
        validator = function() {};
        obs = Object.create(observableField).init().setValidator(validator);
        console.log("test 12", obs._validator === validator);
        
        // observable field, set method with validation
        validator = function(n) { return n === 5 };
        obs = Object.create(observableField).init().setValidator(validator);
        try {
            obs.set(10)
        } catch (e) {
            if (e.message === "invalid value") {
                console.log("test 13", true);
            } else {
                throw e;
            }
        }
        console.log("test 14", !('_data' in obs))
        
        obs.set(5);
        console.log("test 15", obs._data === 5);
        
        // observable field, get method
        obs = Object.create(observableField).init()
        obs.set(10);
        console.log("test 16", obs.get() === 10);
        
        obs.set("hello");
        console.log("test 17", obs.get() === "hello");
        
        // obserable field, subscriber response
        
        obf = Object.create(observableField).init()
        new_val = "new value";
        
        obf.subscribe(function(sender, message) {
            console.log("test 18", message === new_val);
        });    
        obf.subscribe(function(sender, message) {
            console.log("test 19", message === new_val);
        });
        obf.subscribe(function(sender, message) {
            console.log("test 20", message === new_val);
        });
        obf.notify(new_val);
        
        // computed, configure
        
        dep1 = Object.create(observableField).init().set(6);
        dep2 = Object.create(observableField).init().set(8);
        
        deps = [dep1, dep2];
        alg = function(n1, n2) { return n1 + n2 };

        comp = Object.create(computed).init().configure(deps, alg)
        console.log("test 21", comp._dependencies === deps && comp._algorithm === alg)
        
        // computed, compute
        
        console.log("test 22", comp._cache === 14)
        
        // computed, get
        
        console.log("test 23", comp.get() === 14)
        
        // computed, recalculation when depencies change
        
        dep1.set(11);
        console.log("test 24", comp.get() === 19)
        
        dep2.set(20);
        console.log("test 25", comp.get() === 31)
        
        // computed, subscriber response
        
        comp.subscribe(function(sender, message) {
            console.log("test 26", message === 22);
        });
        dep1.set(2);
        
        console.log("end tests for observer module, last test was test 26");
        
    }
    
    return {
        observable: observable,
        observableField: observableField,
        computed: computed,
        test: test
    };

}())
