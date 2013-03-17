backend = require('./backend');


var serveEvent = Prelude.curry(function(resp,err,res){

    var info = {};

    info.info = {};
    info.info.event = res.result;
    console.log(info);

    resp.render('event',info);

    
});

exports.loadEvent = Prelude.curry(function(req,resp){

    var event_id = req.params.event_id;

    backend.getEvent(serveEvent(resp),event_id);
});


exports.createEventPage = Prelude.curry(function(req,resp){

    resp.render('create_event',{});
});


var createObjectCallback = Prelude.curry(function(resp,err,res){

    resp.status(200);
    resp.write(JSON.stringify(res));    
    resp.end();
});

exports.createEvent = Prelude.curry(function(req,resp){

   backend.createEvent(createObjectCallback(resp),req.param('event')); 
});

exports.subscribeEvent = Prelude.curry(function(req,resp){

   var event_id = req.params.event_id;
   var fbid = req.params.fbid;
   backend.subscribe(createObjectCallback(resp),{'event_id': event_id, 'fbid': fbid});
});

exports.createUser = Prelude.curry(function(req,resp){

    backend.createUser(createObjectCallback(resp),req.param('user'));
});

var getObjectCallback = Prelude.curry(function(resp,err,res){

    resp.status(200);
    resp.write(JSON.stringify(res));    
    resp.end();
});

exports.getUser = Prelude.curry(function(req,resp){

    var fbid = req.params.fbid;

    backend.getUser(getObjectCallback(resp),fbid);
});

exports.createTicket = Prelude.curry(function(req,resp){

    var ticket = {'name':req.param('name'),
		  'last_name':req.param('last_name'),
		  'e_mail':req.param('e_mail'),
		  'account_no':req.param('account_no'),
		  'bank_no':req.param('bank_no'),
		  'event_id':req.param('event_id'),
		  'event_nickname':req.param('event_id'),
		  'price':req.param('price')
		 };

    var file = req.files;

    backend.createTicket(createObjectCallback(resp),file.eticket,ticket);
});


var loadOfferResponse = Prelude.curry(function(resp,offer,err,res){
    var info = {'info':{}};
    info.info.event = res.result;
    console.log(info);
    info.info.ticket = offer.ticket;

    console.log(info.info.event);

    var date = Date.now();
    var expDate = new Date(offer.expires);

    var exp = (expDate - date)/1000;
    var expires = {};
    expires.hours = Math.floor(exp/3600);
    expires.minutes = Math.floor((exp - (expires.hours*3600))/60);
    expires.seconds = Math.floor(exp - expires.hours*3600 - expires.minutes*60);

    info.info.ticket.expires = expires;

    info.info.user = offer.user;

    resp.render('offer',info);
    
});

var loadOfferCallback = Prelude.curry(function(resp,err,res){

    if(!err){

	var offer = res.result;

	backend.getEvent(loadOfferResponse(resp,offer),offer.ticket.event_id);
	
    }else{

	
    }
});

exports.loadOffer = Prelude.curry(function(req,resp){

    var offer_id = req.params.fbid + ':' + req.params.ticket_id;

    backend.getOffer(loadOfferCallback(resp),offer_id);
});
