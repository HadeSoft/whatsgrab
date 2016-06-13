var Spooky 	= require('spooky');
var Q		= require('q');

var spooky;
var c = {
	channel: "Gladstones",
	defer: null,
	qr: null,
	messages: {},
	timeout: 22000,
	loadtime: 15000,
	yourUsername: "Ben"
};

c.setup = function (url){
	var defer = Q.defer();
	
	console.log("Starting SpookyJS...");
	
	spooky = new Spooky({
		casper: {
			logLevel: 'debug',
			verbose: true,
			pageSettings: {
				userAgent: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.84 Safari/537.36"
			}
		},
		child: {
			'ignore-ssl-errors': true,
			'ssl-protocol': 'tlsv1',
			// engine: 'slimerjs'
		}
	}, function (err){

		if (err) {
			e = new Error('Failed to start SpookyJS');
			e.details = err;
			defer.reject(e);
			throw e;
		}
		
		spooky.start(url);
		// spooky.then([{commands: scraper}, function (){
		// 	window.coms = commands;
		// }]);
		console.log("SpookyJS Ready");
		
		// Initialise Casperjs
		spooky.then([{config: c}, function (){
			// Casper Context
			window.c = config;
			
			console.log("Pinging CasperJS");
			this.emit('report', "Running CasperJS");
			
			this.emit('report', this.evaluate(function (){
				return document.title;
			}));

		}]);

		spooky.then(function (){
			
			// Get QR Code data value
			this.wait(window.c.loadtime, function (){
				var qrDetails = this.evaluate(function (){
					var els = document.querySelectorAll('img');
					
					var results = [];
					
					Array.prototype.forEach.call(els, function (el){
						if (el.hasAttribute('src')) {
							var title = el.hasAttribute('alt') ? el.getAttribute('alt') : null;
							results.push({
								url: el.getAttribute('src'),
								text: title
							});
						}
					});
					
					return results;
				});
				
				this.emit('checkpoint', {
					name: "qr",
					value: qrDetails[0].text
				});
			});
			
		});
		
		spooky.then(function (){
			
			// Wait for qr to be validated
			this.wait(window.c.timeout, function (){
				this.emit('report', "QR Code lifetime over");
			});
			
		});
		
		spooky.then(function (){
			
			this.wait(window.c.loadtime, function (){
				// Click on target channel
				this.click("//span[contains(., '" + window.c.channel + "')]");
			});
			
			this.wait(1000, function (){
				// Get all messages HTML and extract to json
				var msgs = this.evaluate(function (defaultAuthor){
					
					var pane = document.querySelector('.message-list');
					var rawMessages = pane.querySelectorAll('.msg');
					
					// A message will either be:
					// - From you (no author),
					// - From system (ignored),
					// - From group (with author),
					// - Contain preview image,
					// - Contain image and caption,
					// - Continuation message (author from previous message)

					// List of all messsages retrieved in json format
					var messageList = [];
					// Used to link continuation msgs to author
					var messageLink = '';

					for (var i = 0; i < rawMessages.length; i++) {
						var message = {
							author: '',
							text: '',
							image: '',
							time: ''
						}
						var rawMessage = rawMessages[i];
						var rmCheck = rawMessage.querySelector('.message');

						// System Message
						if (rmCheck.classList.contains('message-system'))
							continue;
						
						if (rmCheck.classList.contains('message-in')) {
							var author = rmCheck.querySelector('.emojitext').innerHTML;
							// Message has no author, refer to previous message
							if (messageLink != '')
								author = messageLink;

							var content = rmCheck.querySelector('.message-text').querySelector('.emojitext');

							// Emoji Capture
							for (node in content.childNodes) {
								if (typeof node === 'string') {
									// Text content
									message.text += node;
								} else {
									// Emoji
									message.text += node.getAttribute('alt');
								}
							}
						}

						// Message chain has finished, clear messageLink
						if (rmCheck.classList.contains('tail'))
							messageLink = "";
						else if (rawMessage.classList.contains('msg-continuation') && messageLink == '')
							messageLink == author;
						

						messageList.push(message);
					}
					
					return messageList;

				}, window.c.yourUsername);

				this.emit('report', msgs);
			});
			
		});
		
		defer.resolve();
	});
	
	spooky.on('error', function (e, stack){
		console.error(e);
		
		if (stack) {
			console.log(stack);
		}
		
		c.defer.reject(e);
	});

	spooky.on('report', function (greeting){
		console.log(greeting);
	});

	spooky.on('console', function (log){
		console.log(log);
	});
	
	return defer.promise;
};

c.start = function (){
	c.defer = Q.defer();
	
	spooky.on('checkpoint', function (varible){
		c[varible.name] = varible.value;
		
		console.log("Checkpoint Reached, var [" + varible.name + "] updated");
		console.log("Call continue() or kill()!");
		
		c.defer.resolve();
	})
	
	spooky.on('complete', function (res){
		c.kill(res);
	});
	
	spooky.run();

	console.log("Running SpookyJS");
	
	return c.defer.promise;
};

c.continue = function (){
	c.defer = Q.defer();
	
	console.log("Continuing to listen to spookyjs");
	
	return c.defer.promise;
}

c.kill = function (res){
	console.log("Run Complete, killing spookyjs");
	spooky.destroy();
	c.defer.resolve(res);
}

c.test = function (){
	var test = require('./package.json');
	console.log("You are using: " + test.version);
}

module.exports = c;