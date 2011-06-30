require.paths.unshift(__dirname);

var EventEmitter = require('events').EventEmitter;
var queryString = require('querystring'), requestFormats = require('request-formats');
var crypto = require('crypto'), https = require('https');
var xml2js = require('xml2js');

var host = {
	sandbox: 'wwwcie.ups.com',
	live: 'onlinetools.ups.com'
};

exports.createConnection = function(options) {
	var connection = new UPSShippingClient({
		host: host[options.host],
		path: '/ups.app/xml/',
		contentType: 'text/xml'
	}, options.auth);

	return new Client(options, connection);
};

var UPSShippingClient = function(options, auth) {
	this.request = function(/*method, */ request, callback) {
		var method;

		if(typeof arguments[0] === 'string') {
			method = arguments[0];
			request = arguments[1].body;
			callback = arguments[2];
		}
		else {
			method = 'ShipConfirm';
			request = request.body
		}

		//var requestString = queryString.stringify(request);
		var req = https.request({
			host: options.host,
			path: options.path + method,
			method: 'POST',
			headers: {
				'Content-Length': request.length,
				'Content-Type': options.contentType
			}
		});
		
		req.write(request);
		req.on('error', function() {});
		
		req.on('response', function(res) {
			var responseData = '';
			
			res.on('data', function(data) {
				data = data.toString();
				responseData += data;
			});

			res.on('end', function() {
				var parser = new xml2js.Parser(), response;
				
				parser.addListener('end', function(result) {
					callback(result);
				});
				
				parser.parseString(responseData);
			});
		});

		req.end();
	}
};

var Client = function(options, client) {
    var methods = {}, id = false, password = false, license = false;

    methods.shipConfirm = function(request) {
        return requestFormats.shipConfirm(request);
    };
	
	methods.shipAccept = function(request) {
		return requestFormats.shipAccept(request);
	};
	
    this.setLoginDetails = function(lic, userId, pass) {
        id = userId;
        password = pass;
		license = lic;
    };

    this.request = function(type, request) {
        var body = false, content = false;
        var emitter = new EventEmitter();

        if(!id || !password || !license) throw new Error('Username, license key, or password missing');

        content = methods[type](request);
		
        if(content.success) {
			if(type in methods && content) {
				body = requestFormats.body({
					requestType: type,
					license: license,
					user: id,
					password: password,
					content: content.body
				});
			}
			
            client.request({body: body}, function(response) {
                if(response.Response.ResponseStatusCode == '0') { 
					emitter.emit('failure', response.Response);
				}
				else {
					// ShipConfirm is a two step process
					if(type == 'shipConfirm') {
						var accept = methods.shipAccept({
							digest: response.ShipmentDigest
						});
						
						body = requestFormats.body({
							requestType: 'shipAccept',
							license: license,
							user: id,
							password: password,
							content: accept.body
						});
			            
						client.request('ShipAccept', {body: body}, function(response) {
							if(response.Response.ResponseStatusCode == '0') { 
								emitter.emit('failure', response.Response.Error);
							}
							else {
								emitter.emit('success', {
									fullResponse: response,
									tracking: response.ShipmentResults.PackageResults.TrackingNumber,
									label: response.ShipmentResults.PackageResults.LabelImage
								});
							}
						});
					}
					else {
						emitter.emit('success', response);
					}
				}
            });

            return emitter;
        }
        else {
            setTimeout(function() {
                emitter.emit('error', content.error);
            }, 10);
            
            return emitter;
        }
    };
};