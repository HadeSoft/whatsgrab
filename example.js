var controller = require('./controller');

console.log("running");

// Setup spookyjs with target url
controller.setup('http://web.whatsapp.com', 'Gladstones')
.then(function (){
	
	// Start by getting qr code from web.whatsapp
	controller.start()
	.then(function (code){
		
		// Get qr code data value
		console.log("QR CODE:" + code);
		
		// Continue listening to spookyjs
		// Spookyjs will then wait for a
		// maxium of 20seconds qr code to be confirmed
		// then navigate to target channel
		controller.continue()
		.then(function (msgs){
			console.log(msgs);
			
			// Update every 'x' seconds
			setInterval(function (){
				// Get new messages
				controller.fetch()
				.then(function (msgs){
					console.log(msgs.new);
				})
			}, 10000);
			
		});
		
	})
	.fail(function (err){
		console.error(err);
	});
	
})
.fail(function (err){
	console.error(err);
});