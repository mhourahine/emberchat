//configuration
App = Ember.Application.create({
	rootElement: '#application_root',
	LOG_TRANSITIONS: true
});

App.Store = DS.Store.extend({
  revision: 12
});

App.ready = function() {
	//set up message source
	var es = new EventSource('/message_stream');
    es.onmessage = function(e) { 
    	console.log("Message received: " + e.data);

    	var message_data = JSON.parse(e.data).message;
    	message = App.Message.createRecord(message_data);
		//message.get('transaction').commit(); - not committing back to server
    	
    };
    console.log('app is ready');
}


//models
App.Message = DS.Model.extend({
	username: DS.attr('string'),
	content: DS.attr('string'),
	createdAt: DS.attr('date')
});

//controllers
App.ApplicationController = Ember.Controller.extend();

App.ChatController = Ember.Controller.extend({
	postMessage: function(message) {
		var data = { message: { content: message }};
		$.post('/messages',JSON.stringify(data));
		this.set('newMessageField','');
	}
});

App.MessagesController = Ember.ArrayController.extend();

App.UserController = Ember.ObjectController.extend({
	logged_in: function() {
		//am I logged in?
		return (this.get('username') != '');
	},
});

//views
App.MessagesView = Ember.View.extend({
	template: 'messages',
	tagName: 'div',
	classNames: ['messages'],

	messageAdded: function() {
		//wait until all bindings updated (otherwise scroll will happen too soon)
		Ember.run.next(this, function() {
			this.scroll();
		});
	}.observes('controller.@each'),

	scroll: function() {
		if (this.get('state') == "inDOM") {
			var el = this.$();
			el.scrollTop(el.prop('scrollHeight')-el.height());
		}
	}
});


//routes
App.Router.map(function() {
	this.route('index', { path: '/' });
	this.route('chat',{ path: '/chat'});
});


App.ApplicationRoute = Ember.Route.extend({
	setupController: function() {
		console.log("ApplicationRoute setupController called.");
	},
	redirect: function() {
		var router = this;
		var current_user = router.controllerFor('user');

		//if UserController has not yet been initialized do so
		if (current_user.get('content') == null) {
			current_user.set('content',Ember.Object.create({username:""}));	
		}

		//if no user set, check server for logged in session
		if (! current_user.logged_in()) {
			$.get('/current_user',function(data) {
				user = JSON.parse(data);
				console.log(user);
				if (user != null) {
		 			current_user.set('content',Ember.Object.create(JSON.parse(data)));
		 			router.transitionTo('chat');	
				} else {
					router.transitionTo('index');
				}
			});
		}
	},
	events: {
		login: function(username) {
			
			var router = this;

			//"login" to server
			$.post('/login','username='+username, function() {
				console.log('Logged in successfully as ' + username);
				router.controllerFor('user').set('username',username);
				router.transitionTo('chat');	
			});
		},

		logout: function() {
			//send message to server to logout
			var router = this;
			this.controllerFor('user').get('content').set('username', "");
			$.post('/logout',function() {
				router.transitionTo('index');
			});
		}	
	}
});

App.IndexRoute = Ember.Route.extend({
	setupController: function() {
		console.log('set up index');
	},
	redirect: function() {
		if (this.controllerFor('user').logged_in()) {
			this.transitionTo('chat');
			return;
		}
	}
});

App.ChatRoute = Ember.Route.extend({
	setupController: function() {
		this.controllerFor('messages').set('model', App.Message.find());
	},
	redirect: function() {
		if (! this.controllerFor('user').logged_in()) {
			this.transitionTo('index');
		}
	}
});