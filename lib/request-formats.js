var truncate = function(len, text) {
    text = (text == null || text == undefined) ? "" : text.toString();

    if (text.length > len) {
        text = text.substring(0, len);
    }	                               
    return text;                    
} 

exports.body = function(data) {
    var response = "",
        validRequestTypes = [
            'shipConfirm',
			'shipAccept'
        ];

    if(validRequestTypes.indexOf(data.requestType) == -1) return false;
    if(!data.license || !data.user || !data.password || !data.content) return false;

    response += "<?xml version='1.0' encoding='utf-8'?>";
    response += "<AccessRequest xml:lang='en-US'>";
	
    response += "<AccessLicenseNumber>" + data.license + "</AccessLicenseNumber>";
    response += "<UserId>" + data.user + "</UserId>";
    response += "<Password>" + data.password + "</Password>";

    response += "</AccessRequest>";
    response += data.content;

    return response;
};

/*
 * Core request type functions, create
 *
 */

/*
 
 {
	shipment: {
		shipper: {
			name: 'Company Name',
			shipperNumber: 'UPSACCTNNUM',
			address: {
				address1: 'Line 1',
				address2: '1234 Main St',
				address3: 'Suite',
				city: 'city',
				state: 'CA',
				zip: '12345',
				country: 'US'
			}
		},
		shipTo: {
			companyName: 'Company Name',
			address: {
				address1: 'Line 1',
				address2: '1234 Main St',
				address3: 'Suite',
				city: 'city',
				state: 'CA',
				zip: '12345',
				country: 'US'
			}
		}
		shipFrom: { // Optional
			companyName: 'Company Name',
			address: {
				address1: 'Line 1',
				address2: '1234 Main St',
				address3: 'Suite',
				city: 'city',
				state: 'CA',
				zip: '12345',
				country: 'US'
			}
		},
		payment: {
			accountNumber: 'UPSACCTNUM'	
		},
		service: {
			code: ''
		},
		confirmation: { // optional
			type: 'required' || 'adult'
		},
		package: [
			{
				description: '', // optional
				code: '01' // Defaults to '02', customer supplied package
			}
		]
	}
 }
 
 
 
 
*/

exports.shipConfirm = function(data) {
    var response = "", err = false, insert;
    
    if(data.refId != undefined) {
        response += "<refId>";
        response += data.refId;
        response += "</refId>";
    }
	
    response += "<ShipmentConfirmRequest>";
		response += "<Request>";
			
			response += "<RequestAction>";
			response += "ShipConfirm";
			response += "</RequestAction>";
			
			if(!data.validate) return { success: false, error: 'Missing Validation type' };

			response += "<RequestOption>";
			response += data.validate;
			response += "</RequestOption>";
			
		response += "</Request>";
		
		response += "<Shipment>";
			if(!data.shipment) return { success: false, error: 'Missing Shipment' };
			
			if(data.shipment.description) {
				response += "<Description>";
				response += data.shipment.description;
				response += "</Description>";
			}
			
			// TO DO: Add ReturnService
			
			if(!data.shipment.shipper)  return { success: false, error: 'Missing Shipper' };
			var shipper = data.shipment.shipper;
			response += "<Shipper>";
			
				response += "<Name>";
				response += shipper.name;
				response += "</Name>";

				if(shipper.attentionName) {
					response += "<AttentionName>";
					response += shipper.attentionName;
					response += "</AttentionName>";
				}
				
				response += "<ShipperNumber>";
				response += shipper.shipperNumber || '';
				response += "</ShipperNumber>";
				
				if(shipper.phone) {
					response += "<PhoneNumber>";
					response += shipper.phone;
					response += "</PhoneNumber>";
				}
				
				if(!shipper.address)  return { success: false, error: 'Missing Shipper Address' };
				
				response += buildAddress(shipper.address);

			response += "</Shipper>";

			if(!data.shipment.shipTo)  return { success: false, error: 'Missing Ship To' };
			var shipTo = data.shipment.shipTo;
			response += "<ShipTo>";
			
				response += "<CompanyName>";
				response += shipTo.companyName;
				response += "</CompanyName>";

				if(shipTo.attentionName) {
					response += "<AttentionName>";
					response += shipTo.attentionName;
					response += "</AttentionName>";
				}
				
				if(shipTo.phone) {
					response += "<PhoneNumber>";
					response += shipTo.phone;
					response += "</PhoneNumber>";
				}
				
				if(!shipTo.address)  return { success: false, error: 'Missing Ship To Address' };
				
				response += buildAddress(shipTo.address);

			response += "</ShipTo>";

			if(data.shipment.shipFrom) {
				var shipFrom = data.shipment.shipFrom;
				response += "<ShipFrom>";

				if(shipFrom.companyName) {
					response += "<CompanyName>";
					response += shipFrom.companyName;
					response += "</CompanyName>";
				}	

				if(shipFrom.attentionName) {
					response += "<AttentionName>";
					response += shipFrom.attentionName;
					response += "</AttentionName>";
				}
				
				if(shipFrom.phone) {
					response += "<PhoneNumber>";
					response += shipFrom.phone;
					response += "</PhoneNumber>";
				}
					
					response += buildAddress(shipFrom.address);
				response += "</ShipFrom>";
			}
		
			if(!data.shipment.payment)  return { success: false, error: 'Missing Shipment Payment' };
			var payment = data.shipment.payment;
			
			response += "<PaymentInformation>";
			
				response += "<Prepaid>";
				
					response += "<BillShipper>";
						response += "<AccountNumber>";
						response += payment.accountNumber
						response += "</AccountNumber>";
					response += "</BillShipper>";
					
				response += "</Prepaid>";
			
			response += "</PaymentInformation>";

			if(!data.shipment.service)  return { success: false, error: 'Missing Shipment Service' };
			var service = data.shipment.service;
			response += "<Service>";
			response += "<Code>";
				//TO DO: Add more codes
				var code;
				switch(service.code.toLowerCase()) {
					case 'next day air':
						code = '01';
					break;
					case '2ndday air':
						code = '02';
					break;
					case 'ground':
						code = '03';
					break;
					default:
						 return { success: false, error: 'Invalid service code' };
					break;
				}
				response += code;
			response += "</Code>";
			response += "</Service>";

			// TO DO: ShipmentServiceOptions (note: return label may come from here, pg 26?)
			response += "<ShipmentServiceOptions>";

			if(data.shipment.confirmation) {
				response += "<DeliveryConfirmation>";
				response += "<DCISType>";
					response += (data.shipment.confirmation.type == 'required') ? '1' : '2';
				response += "</DCISType>";
				response += "</DeliveryConfirmation>";
			}
			response += "</ShipmentServiceOptions>";
			
			if(!data.shipment.package)  return { success: false, error: 'Missing Shipment Packages' };
			
			data.shipment.package.forEach(function(val) {
				response += "<Package>";
				insert = buildPackageInternals(val);
				if(insert) response += insert;
				else err = 'Bad Package Internals';
				response += "</Package>";
			});
			
		response += "</Shipment>";

		//TODO: Add alternate label types;
		response += "<LabelSpecification>";
			
			response += "<LabelPrintMethod>";
				response += "<Code>";
				response += 'GIF';
				response += "</Code>";
			response += "</LabelPrintMethod>";
			
			response += "<HTTPUserAgent>";
				response += "Mozilla/4.5";
			response += "</HTTPUserAgent>";

			response += "<LabelImageFormat>";
				response += "<Code>";
				response += 'GIF';
				response += "</Code>";
			response += "</LabelImageFormat>";
			
		response += "</LabelSpecification>";
		
    response += "</ShipmentConfirmRequest>";
    
    return (err) ? {success: false, error: err } : { success: true, body: response };
};

exports.shipAccept = function(val) {
	var response = '';
	
    response += "<ShipmentAcceptRequest>";
		response += "<Request>";
			response += "<RequestAction>";
				response += "ShipAccept";
			response += "</RequestAction>";
		response += "</Request>";
		response += "<ShipmentDigest>";
			response += val.digest;
		response += "</ShipmentDigest>";
    response += "</ShipmentAcceptRequest>";
	
	return { success: true, body: response };
};

/*
 * Reusable internal structure functions
 *
 */

var buildPackageInternals = function(val) {
	var response = '';

	if(val.description) {
		response += "<Description>";
		response += val.description;
		response += "</Description>";
	}
	
	response += "<PackagingType>";
		response += "<Code>";
			response += val.code || '02';
		response += "</Code>";
	response += "</PackagingType>";
	
	response += "<PackageWeight>";
		response += "<Weight>";
		response += "4";
		response += "</Weight>";
	response += "</PackageWeight>";
	
	//TODO: Package weight
	//TODO: Insurance
	
	return response;
};

var buildAddress = function(val) {
	var response = "";
	
	response += "<Address>";
		response += "<AddressLine1>";
		response += val.address1;
		response += "</AddressLine1>";

		response += "<AddressLine2>";
		response += val.address2;
		response += "</AddressLine2>";

		response += "<AddressLine3>";
		response += val.address3;
		response += "</AddressLine3>";
		
		response += "<City>";
		response += val.city;
		response += "</City>";

		response += "<StateProvinceCode>";
		response += val.state;
		response += "</StateProvinceCode>";

		response += "<PostalCode>";
		response += val.zip;
		response += "</PostalCode>";
		
		response += "<CountryCode>";
		response += val.country;
		response += "</CountryCode>";
	response += "</Address>";
	
	return response;
}
