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
	this.request = function(/*method,*/ request, callback) {
		var method = (typeof arguments[0] == 'string') ? arguments[0] : 'ShipConfirm';
		var requestString = queryString.stringify(request);
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
			res.on('data', function(data) {
				var parser = new xml2js.Parser(), response;
				data = data.toString();
				
				parser.addListener('end', function(result) {
					callback(result);
				});
				
				parser.parseString(data);
			});
		});

		req.end();
	}
};

var Client = function(options, client) {
    var methods = {}, id = false, key = false;

    methods.createCustomerProfile = function(request) {
        if(!request.merchantCustomerId && !request.description && !request.email) return false;
        return requestFormats.createCustomerProfile(request);
    };
	
    methods.shipConfirm = function(request) {
        return requestFormats.shipConfirm(request);
    };
	
	methods.shipAccept = function() {
		return requestFormats.shipAccept(request);
	}
	
    this.setLoginDetails = function(loginId, transKey) {
        id = loginId;
        key = transKey;
    };

    this.request = function(type, request) {
        var body = false, content = false;
        var emitter = new EventEmitter();

        if(!id || !key) throw new Error('Username, license key, or password missing');

        content = methods[type](request);

        if(type in methods && content) {
            body = requestFormats.body({
                requestType: type,
                login: id,
                transactionKey: key,
                content: content
            });
        }
		
		//Temp for debugging
        //console.log(body.replace(/>/g, '>\n').replace(/</g, '\n<'));
		
        if(body) {
            client.request(body, function(response) {
                if(response.messages.resultCode == 'Error') {
					response.code = response.messages.message.code;
					emitter.emit('failure', response);
				}
				else {
					response.code = response.messages.message.code;
					//emitter.emit('success', response);
				}
            });

            return emitter;
        }
        else {
            setTimeout(function() {
                emitter.emit('error', 'Invalid request');
            }, 10);
            
            return emitter;
        }
    };
};