'use strict';

var fs = require('fs');
var request = require('request');

let regexArr = fs.readFileSync('./regex.txt').toString().split('\r\n');
let fileArr = fs.readFileSync('./websites.txt').toString().split('\r\n');
let finalObject = [];

let promise = new Promise(function(resolve, reject){
	for(let i=0; i<fileArr.length; i++){
	
		getHtml(fileArr[i]).then(function(response){

			
	
			let obj = {
				url: fileArr[i],
				html: response.html,
				regexArr: regexArr.reduce(function(o,v,i){o[v] = false; return o;},{}),
				redirect: response.redirect || false
			}
	
			for(let j=0; j<regexArr.length; j++){
				let matcher = new RegExp(regexArr[j], 'g');
				let matched = matcher.test(obj.html);
				obj.regexArr[regexArr[j]] = matched;
			}




			finalObject.push(obj);


			if (i == fileArr.length-1){
				resolve('good');
			}
			
		});

	}


});

promise.then(function(response){
	let fileName = 'output.csv';
	fs.unlinkSync(`./${fileName}`);
	let writer = fs.createWriteStream(`./${fileName}`, { flags: 'a'});
	writer.write('URL,' + regexArr.join(',') + ',Redirect\r\n');

	for(let i=0; i<finalObject.length; i++){

		let holder = finalObject[i];
		let redirect = holder.redirect.new || false;
		writer.write(holder.url + ',' + Object.keys(holder.regexArr).map(key => holder.regexArr[key]).join(',') + ',' + redirect + '\r\n');
	}

	writer.end();
});



function getHtml(url){
	return new Promise(function(resolve, reject){
		function recurse(url, redirectInput){
			request({ followRedirect: false, url: url}, function(error, response, html){
				if (error){

				console.log(error);
				reject(error);
				}
				else if (response.statusCode > 300 && response.statusCode < 400){

					recurse(response.headers.location, {old: url, new: response.headers.location} );

				}
				else{
					let returnObj = {html: html};

					if (redirectInput){
						returnObj['redirect'] = redirectInput;
					}
					

					resolve(returnObj);
				}

			});


		}

		recurse(url);

	});

}


