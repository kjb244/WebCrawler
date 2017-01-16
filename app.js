'use strict';

var fs = require('fs');
var request = require('request');

//for proxy
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

//read in files and declare variables

let regexArr = fs.readFileSync('./inputs/regex.txt').toString().split('\r\n').filter(String);
let fileArr = fs.readFileSync('./inputs/websites.txt').toString().split('\r\n').filter(String);
let cookies = fs.readFileSync('./inputs/cookies.txt').toString().split('\r\n').filter(String);
let recurseNoLink = '`````';
let recurseContext = '';
let outputFileName = '';

let cntr = 0;
let promises = [];
for(let i in fileArr){
	promises.push(getHtml(fileArr[i]));
}

Promise.all(promises).then(function(response){
	for(let i=0; i<response.length; i++){

		//if error (redirected too many times or bad url) then continue and log it
		if (response[i].error == true){
			console.log('error url ', fileArr[i]);
			continue;
		}

		let obj = {
			url: fileArr[i],
			html: response[i].html,
			//put regex array into object with regex expression as key and false as value
			regexArr: regexArr.reduce(function(accum, curr, idx, arr){ accum[curr]  = false; return accum;}, {}),
			redirect: response[i].redirect || false
		}

		for(let j in regexArr){
			let matcher = new RegExp(regexArr[j], 'g');
			let matched = matcher.test(obj.html);
			let times = (obj.html.match(matcher) || []).length;
			obj.regexArr[regexArr[j]] = matched + "-" + times;
		}

		//write file
		writeFile(obj, i);

		
	}


}).catch(function(response){
	console.log('error in promise', response);
});


function getHtml(url){
	return new Promise(function(resolve, reject){

		function recurse(url, redirectInput, index){
			index = index || 0;
			var j = request.jar();

			for(let i=0; i<cookies.length; i++){
				let holder = request.cookie(cookies[i].trim());
				j.setCookie(holder, url);
			}

			request({ followRedirect: false, url: url, jar: j}, function(error, response, html){
				cntr++;
				console.log(cntr);
				console.log(url);

				if(error){
					console.log('error with reqeust', error);
					resolve({error: true});
				}
				else if (index >5){
					console.log('too many redirects');
					resolve({error: true});
				}
				else if (response.statusCode > 300 && response.statusCode < 400){
					let loc = response.headers.location;
					if(!response.headers.location.includes(recurseNoLink)){
						loc = recurseContext + loc;
					}
					recurse(loc, {old: url, new: loc}, ++index);
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

		recurse(url, null);

	});
}




function writeFile(response, index){
	console.log('writing index ' + index);

	if (index ==0){
		let dt = new Date();
		dt = dt.getTime();
		outputFileName = `output${dt}.csv`;
		let header = convertArrToCsv(['URL', regexArr, 'Redirect']);
		fs.writeFileSync(`./outputs/${outputFileName}`, header);
	}

	let holder = response;
	let redirect = holder.redirect.new || false;
	let regexMatches = Object.keys(holder.regexArr).map(key => holder.regexArr[key]);
	let contents = convertArrToCsv([holder.url, regexMatches, redirect]);
	fs.appendFileSync(`./outputs/${outputFileName}`, contents);
}

function convertTo1DArray(arr, finalArr){
	var finalArr = finalArr || [];
	for(let i=0; i<arr.length; i++){
		if (Array.isArray(arr[i])){
			convertTo1DArray(arr[i], finalArr)
		}
		else{
			finalArr.push(arr[i]);
		}

	}

	return finalArr;

	
	
}

function convertArrToCsv(arr){
	arr = convertTo1DArray(arr);
	let finalArr = [];
	for(let i=0; i<arr.length; i++){
		finalArr[i] = convertStringToCsv(arr[i]);
	}


	return finalArr.join(',') + '\r\n';
	
}

function convertStringToCsv(inp){

	inp = inp.toString();
	return inp.includes(',') == true ? `"${inp}"` : inp;
}





