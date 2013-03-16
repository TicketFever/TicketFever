backend = require('./backend');


var serveEvent = Prelude.curry(function(resp,err,res){

    var info = {};

    info.info = {};
    info.info.event = res.result;
    console.log(res.resultCode);
    console.log(err);

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
		  'price':req.param('price')};

    console.log(req.param('eticket'));
});

