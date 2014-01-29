var TodoApp = (function() {

    var model = (function() {
        
        var observable = observer.observable;
        var observableField = observer.observableField;
        
        // Define task prototype;
        var task = {
            
            init: function init(text) {
                this.text = Object.create(observableField).init(this).set(text).setValidator(function(val) {
                    return typeof val === typeof "";
                });
                this.complete = Object.create(observableField).init(this).set(false).setValidator(function(val) {
                    return typeof val === typeof true;
                });
                this.priority = Object.create(observableField).init(this).set(1).setValidator(function(val) {
                    return typeof val === typeof 1;
                });
                return this;
            },
            
            toString: function() {
                return "task: [ text: '" + this.text.get() + "', completed: " + this.complete.get() + ", priority: " + this.priority.get() + " ]"
            },

        };

        var taskList = {
            
            init: function init() {
                this._tasks = [];
                this.events = {};
                
                this.events.taskAdded = Object.create(observable).init(this);
                this.events.taskRemoved = Object.create(observable).init(this);
                
                /* The following event is not used by the view, which has 
                subviews which observe their corresponding task models.
                This event is meant to be exposed as part of the external
                for the app */
                this.events.taskChanged = Object.create(observable).init(this);
                
                return this;
            },
            
            addTask: function addTask(text) {
                var newtask = Object.create(task).init(text);
                this._tasks.push(newtask);
                this.events.taskAdded.notify(newtask)
                
                // link up to taskChanged event
                var self = this;
                var subscriberFactory = function(changeName) {
                    return function() {
                        self.events.taskChanged.notify({
                            task: newtask,
                            change: changeName 
                        });
                    }
                }
                
                newtask.text.subscribe(subscriberFactory("text"));
                newtask.complete.subscribe(subscriberFactory("complete"));
                newtask.priority.subscribe(subscriberFactory("priority"));
                
                return newtask;
            },
            
            removeTask: function removeTask(i) {
                if (typeof i !== "number" && typeof i !== "object") {
                    throw new Error("Item to remove must be specified as a task object or a numerical index")
                }
                if (typeof i === "object") {
                    i = this._tasks.indexOf(i);
                    if (i === -1) {
                        throw new Error("Task not found");
                    }
                }
                var task = this._tasks.splice(i, 1)[0];
                this.events.taskRemoved.notify({"task": task, "index": i});
            },
            
            clear: function() {
                var self = this;
                while(this._tasks.length > 0) {
                    this.removeTask(0);
                }
            },
            
            countComplete: function countComplete() {
                return this._tasks.filter(function(task) {
                    return task.complete.get();
                }).length;
            },
            
            getLength: function getLength() {
                return this._tasks.length;
            },
            
            get: function get(i) {
                if (!(_.isNumber(i))) {
                    throw new Error("Number index required");
                }
                return this._tasks[i];
            },
            
            toString: function() {
                return _.map(this._tasks, function(todo) {
                    return todo.toString()
                }).join("\n");
            },
            
            /* Functions to fill the tasklist from an array of
               descriptors, or retrieve the contents of the tasklist
               as an array of descriptors. e.g.
               { text: "task 1", complete: true, priority: 5 } */
            
            getDescriptors: function() { 
                return _.map(this._tasks, function(t) {
                    return {
                        text: t.text.get(),
                        complete: t.complete.get(),
                        priority: t.priority.get(),
                    };
                });
            },
            
            fillFromDescriptors: function(descriptors) {
                var self = this;
                _.each(descriptors, function(desc) {
                    if (typeof desc === "string") {
                        self.addTask(desc);
                    } else {
                        var newtask = self.addTask(desc.text);
                        if ('complete' in desc) {
                            newtask.complete.set(desc.complete);
                        }
                        if ('priority' in desc) {
                            newtask.priority.set(desc.priority);
                        }
                    }
                    
                });
            }
            
        };
        
        function test() {
            
            var task1, list, taskForRemoval;
            
            console.log("Tests for model module");
            
            // task, init
            task1 = Object.create(task).init("Wash the dishes");
            console.log("test 1", task1.text.get() === "Wash the dishes");
            console.log("test 2", task1.complete.get() === false);
            console.log("test 3", task1.priority.get() === 1);
            
            // taskList, init
            
            list = Object.create(taskList).init();
            
            // task, subscriber response
            
            list.addTask("walk the dog")
            list.get(0).priority.subscribe(function(sender, message) {
                console.log("test 4", message === 5);
            });
            list.get(0).priority.set(5);
                
            // taskList, addTask, getLength
            
            list = Object.create(taskList).init();
            list.addTask("Do the washing up");
            console.log("test 5", list.get(0).text.get() === "Do the washing up"); 
            list.addTask("Walk the dog");
            console.log("test 6", list.get(1).text.get() === "Walk the dog");
            console.log("test 7", list.getLength() === 2);
            
            // taskList, removeTask, getLength
            
            list.removeTask(0)
            console.log("test 8", list.getLength() === 1);
            console.log("test 9", list.get(0).text.get() === "Walk the dog");        
            taskForRemoval = list.get(0);
            list.removeTask(taskForRemoval);
            console.log("test 10", list.getLength() === 0);
            
            // taskList, countComplete
                
            list.addTask("A");
            list.addTask("B");
            list.addTask("C");
            console.log("test 11", list.countComplete() === 0);
            
            list.get(1).complete.set(true);
            console.log("test 12", list.countComplete() === 1);
            
            // taskList, taskAdded event
            
            list.events.taskAdded.subscribe(function(sender, message) {
                console.log("task 13", sender === list && message.task.text.get() === "D")
            });
            list.events.taskAdded.subscribe(function(sender, message) {
                console.log("task 14", sender === list && message.task.text.get() === "D")
            });
            list.addTask("D");
            
            // taskList, taskRemoved event
            list.events.taskRemoved.subscribe(function(sender, message) {
                console.log("task 15", sender === list && message.task.text.get() === "D" && message.index === 3)
            });
            list.events.taskRemoved.subscribe(function(sender, message) {
                console.log("task 16", sender === list && message.task.text.get() === "D" && message.index === 3)
            });
            list.removeTask(3);
            
        }
        
        return {
            task: task,
            taskList: taskList,
            test: test
        };


    }());

    var view = (function() {
        
        var observable = observer.observable;
        
        var todoView = {
            
            init: function(model) {
                this._model = model
                
                this.events = {}
                this.events.checkboxChanged = Object.create(observable).init(this);
                this.events.deleteButtonClicked = Object.create(observable).init(this);
                this.events.textEditBoxBlur = Object.create(observable).init(this);
                
                this.createDom();
                
                var self = this;
                
                // attach listeners to html controls
                this._controls.text.on("blur", function(e) {
                    self.events.textEditBoxBlur.notify(this.textContent);
                });
                this._controls.checkbox.on("change", function() {
                    self.events.checkboxChanged.notify($(this).is(':checked'));
                });
                this._controls.deleteButton.on("click", function() {
                    self.events.deleteButtonClicked.notify();
                });
                
                // attach listeners to model
                this._model.text.subscribe(function(sender, message) {
                    if (message !== self._controls.text.text()) {
                        self._controls.text.text(message);
                    }
                });
                this._model.complete.subscribe(function(sender, message) {
                    if (message !== self._controls.checkbox.is(':checked')) {
                        self._controls.checkbox.prop("checked", message);
                    }
                    if (message === true) {
                        self._controls.text.addClass("done");
                    } else if (message === false) {
                        self._controls.text.removeClass("done");
                    }
                });
                
                return this;
            },
            
            // create dom element and controls
            createDom: function() {
                this._el = $('<div>');
                this._controls = {};
                this._controls.checkbox = $('<input>', { type: 'checkbox' }).appendTo(this._el);
                this._controls.text = $('<div>', { 
                    contenteditable: 'true', 
                    "class": "taskText"
                }).text(this._model.text.get())
                  .appendTo(this._el);
                this._controls.deleteButton = $('<a>', { href: 'javaScript:void(0);' })
                    .text('[x]')
                    .appendTo(this._el);
                
                // make it so that "enter" blurs the editable task text
                this._controls.text.on("keypress", function(e) {
                    if (e.keyCode === 13) {
                        e.preventDefault();
                        this.blur();
                    }
                });
            },
            
            getEl: function() {
                return this._el;
            },
            
            getModel: function() {
                return this._model;
            }
            
        };
        
        var todoListView = { // CURRENTLY WORKING ON
            init: function(model) {
                this._model = model
                
                this._subViews = [];
                
                var self = this;
                
                // events that controller can subscribe to
                this.events = {}
                this.events.addButtonClicked = Object.create(observable).init(this);
                this.events.newTodoCreated = Object.create(observable).init(this);
                
                this.createDom();
                
                // attach listeners to model
                this._model.events.taskAdded.subscribe(function(sender, taskmodel) {
                    self._addSubview(taskmodel);
                });
                
                this._model.events.taskRemoved.subscribe(function(sender, message) {
                    // find view that needs removing
                    var viewToRemove = self._subViews.filter(function(subview) { 
                        return subview.getModel() === message.task;
                    })[0];
                                    
                    // remove view from list of subviews
                    var index = self._subViews.indexOf(viewToRemove);
                    if (index !== -1) {
                        self._subViews.splice(index, 1);
                    }
                    
                    // remove view from dom
                    viewToRemove.getEl().remove();
                    
                });
                
                return this;
            },
            
            _findSubview: function(taskmodel) {
                
            },
            
            _addSubview: function(taskmodel) {
                var newview = Object.create(todoView).init(taskmodel);
                this._subViews.push(newview);
                newview.getEl().appendTo(this._el);
                
                // notify list controller that new todoView has been created, so it can create controller for it
                var message = {
                    view: newview,
                    model: taskmodel
                };
                this.events.newTodoCreated.notify(message);
            },
            
            createDom: function() {
                this._el = $('<div>');
            },
            
            getEl: function() {
                return this._el;
            },
        };
        
        var addBoxView = {
            
            init: function(listmodel) {
                this._model = listmodel;
                
                // events for controller to watch
                this.events = {}
                this.events.textEntered = Object.create(observable).init(this);
                
                this.createDom();
                
                var self = this;
                // attach listeners to html controls
                this._controls.textbox.on("keypress", function(e) {
                    if (e.keyCode === 13) {
                        e.preventDefault();
                        self.events.textEntered.notify($(this).val());
                        $(this).val('');
                    }
                });
                
                return this;
            },
            
            createDom: function() {
                this._el = $('<div>');
                this._controls = {};
                this._controls.textbox = $('<input>', {
                    type: "text"
                }).addClass("enter").appendTo(this._el);
            },
            
            getEl: function() {
                return this._el;
            },
            
        };
        
        return {
            todoView: todoView,
            todoListView: todoListView,
            addBoxView: addBoxView,
        }
        
    }());

    var controller = (function() {
        
        var todoController = {
            
            init: function init(view, model, parent) {
                this._view = view;
                this._model = model;
                this._parent = parent // parent controller (deferred to for deleting a task)
                
                var self = this;
                
                // watch for gui events from the view
                this._view.events.textEditBoxBlur.subscribe(function(sender, message) {
                    if (message !== self._previousText) {
                        self._previousText = message;
                        self._model.text.set(message);
                    }
                });
                
                this._view.events.checkboxChanged.subscribe(function(sender, message) {
                    self._model.complete.set(message);
                });
                
                return this;
            }
            
        };
        
        var todoListController = { // WORKING ON THIS
        
            init: function(view, model) {
                
                this._view = view;
                this._model = model;
                
                var self = this;
                
                // watch view for new todoView creation
                           
                this._view.events.newTodoCreated.subscribe(function(sender, message) {
                    
                    // create controller for new view
                    Object.create(controller.todoController).init(message.view, message.model, self)
                    
                    // assign handler for new view's delete button
                    message.view.events.deleteButtonClicked.subscribe(function() {
                        self._model.removeTask(message.model);
                    });
                });
                
                return this;
            },
            
        }
        
        var addBoxController = {
            
            init: function(view, model) {
                this._view = view;
                this._model = model;
                var self = this;
                
                this._view.events.textEntered.subscribe(function(sender, message) {
                    self._model.addTask(message);
                });
            }
            
        }
        
        return {
            todoController: todoController,
            todoListController: todoListController,
            addBoxController: addBoxController,
        };
        
    }());    
    
    function run(container) {
        var listmodel = Object.create(model.taskList).init(); // no use for this yet
        var listview = Object.create(view.todoListView).init(listmodel);
        var listcontroller = Object.create(controller.todoListController).init(listview, listmodel);
            
        var addview = Object.create(view.addBoxView).init(listmodel);
        var addcontroller = Object.create(controller.addBoxController).init(addview, listmodel);
                   
        $(addview.getEl()).appendTo(container);
        $(listview.getEl()).appendTo(container);
        
        return {
            load: function(descriptorArray) {
                listmodel.fillFromDescriptors(descriptorArray);
                return this;
            },
            dump: function() {
                return listmodel.getDescriptors();
            },
            loadJSON: function(JSONstring) {
                var desc = JSON.parse(JSONstring)
                listmodel.fillFromDescriptors(desc);
                return this;
            },
            dumpJSON: function() {
                return JSON.stringify(listmodel.getDescriptors());
            },
            model: listmodel,
        };
        
    }
    
    return {
        model: model,
        view: view,
        controller: controller,
        run: run,
    };
    
}());
