var Prelude = require('prelude-ls');
var nodemailer = require('nodemailer');
var fs = require('fs');

exports.smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
        user: "ticketfever2013@gmail.com",
        pass: "ticketfever1320"
    }
});

exports.pdfs = 'public/pdfs/';

exports.tables = {'users':'users',
		  'events':'events',
		  'tickets':'tickets',
		  'subscriptions':'subscriptions',
		  'offers':'offers'};

exports.queues = {'tickets':'ticket_queue',
		  'subscriptions':'subscriptions_queue'};

exports.qScore = {'tickets':'ticketScore','subscriptions':'subscriptionScore'};

exports.ids = {'events':'event_id',
	       'tickets':'ticket_id',
	       'subscriptions':'subscription_id'};

exports.resultStatus = {'OBJ_EXISTS':'OBJ_EXISTS',
			'OBJ_CREATED':'OBJ_CREATED',
			'CREATE_OBJ_ERR':'CREATE_OBJ_ERR',
			'OBJ_NOT_FOUND':'OBJ_NOT_FOUND',
			'DB_ERROR':'DB_ERROR'};

var createResult = Prelude.curry(function(resultStatus,result){
    return {'resultStatus':resultStatus,'result':result}
});

var evalRes = Prelude.curry(function(res){
    return eval("("+res+")");
});

var getObjCallback = Prelude.curry(function(callback,err,obj){

    if(err){
	callback(err,createResult(exports.resultStatus.DB_ERROR,null));
    }else if(obj){
	callback(null,createResult(exports.resultStatus.OBJ_EXISTS,evalRes(obj)));
    }else{
	callback(null,createResult(exports.resultStatus.OBJ_NOT_FOUND,null));
    }
});

var createDBObjCallback = Prelude.curry(function(obj,callback,err,res){
    
    if(err){
	callback(err,createResult(exports.resultStatus.DB_ERROR,null));
    }else{
	callback(null,createResult(exports.resultStatus.OBJ_CREATED,obj));
    }
});
	

var createObjCallback = Prelude.curry(function(table,objId,obj,callback,err,res){

    if(err){
	callback(err,createResult(exports.resultStatus.DB_ERROR,null));
    }else if(res){
	callback(null,createResult(exports.resultStatus.OBJ_EXISTS,evalRes(res)));
    }else{
	DB.hset(table,objId,JSON.stringify(obj),createDBObjCallback(obj,callback));
    }
});

var createObj = Prelude.curry(function(table,callback,objId,obj){

    DB.hget(table,objId,createObjCallback(table,objId,obj,callback));
});

var createObjWithIdCallback = Prelude.curry(function(callback,table,obj,err,res){
    
    if(err){
	callback(err,createResult(exports.resultStatus.OBJ_NOT_FOUND,null));
    }else{

	obj[exports.ids[table]] = res;
	createObj(table,callback,res,obj);	
    }
});

var createObjWithId = Prelude.curry(function(table,callback,obj){
    
    DB.incr(exports.ids[table],createObjWithIdCallback(callback,table,obj));
});

exports.createUser = Prelude.curry(function(callback,user){

    //Validate user

    createObj(exports.tables.users,callback,user.id,user);
});


exports.getUser = Prelude.curry(function(callback,id){

    DB.hget(exports.tables.users,id,getObjCallback(callback));
});

exports.getEvent = Prelude.curry(function(callback,eventId){

    DB.hget(exports.tables.events,eventId,getObjCallback(callback));
});

exports.createEvent = Prelude.curry(function(callback,event){

    event.event_id = event.event_nickname;

    createObj(exports.tables.events,callback,event.event_nickname,event);
});

exports.getOffer = Prelude.curry(function(callback,offerId){

    DB.hget(exports.tables.offers,offerId,getObjCallback(callback));
});

var getObjFromResult = Prelude.curry(function(result){

    if(result && result.result)
	return result.result;
    else
	return null;
});

var seqCallback = Prelude.curry(function(callback1,callback2,error,result){
    
    if(error){
	callback2(error,result)
    }else{	
	callback1(callback2,result);
    }
});

var addToQueueCallback = Prelude.curry(function(callback,objectRef,qRef,obj,error,score){
    
    if(error){
	
    }else{
	DB.zadd(exports.queues[objectRef]+':'+obj[qRef],score,JSON.stringify(obj),callback(obj,null));
    }
});
	       

var addToQueue = Prelude.curry(function(objectRef,qRef,callback,result){

    var obj = getObjFromResult(result);
    console.log(obj);

    if(obj && result.resultStatus == exports.resultStatus.OBJ_CREATED){

	DB.incr(exports.qScore[objectRef]+':'+obj[qRef],addToQueueCallback(callback,objectRef,qRef,obj));
    }else{
	callback(obj,result.resultStatus,null,result);
    }
});

var objResultCallback = Prelude.curry(function(cb,obj,code,error,result){

	if(error){
	    cb(error,createResult(exports.resultStatus.DB_ERROR,null));
	}else{

	    if(code){
		cb(null,createResult(code,obj));
	    }else{

		cb(null,createResult(exports.resultStatus.OBJ_CREATED,obj));
	    }
	}
    });	

exports.createTicket = Prelude.curry(function(callback,file,ticket){

    console.log(ticket);

    var fun = Prelude.curry(function(callback,file,error,result){
	
	if(!error){
	    fs.createReadStream(file.path).pipe(fs.createWriteStream(exports.pdfs + result.result.ticket_id));
	    callback(error,result);
	}else
	    callback(error,result);
    });

    createObjWithId(exports.tables.tickets,seqCallback(addToQueue(exports.tables.tickets,exports.ids.events),objResultCallback(fun(callback,file))),ticket);
});

exports.subscribe = Prelude.curry(function(callback,subscription){
    
    var callback2 = Prelude.curry(function(cb,obj,error,result){

	if(error){
	    cb(error,createResult(exports.resultStatus.DB_ERROR,null));
	}else{
	    cb(null,createResult(exports.resultStatus.OBJ_CREATED,obj));
	}
    });

    subscription[exports.ids.subscriptions] = subscription.fbid + ':' + subscription.event_id;    

    createObj(exports.tables.subscriptions,seqCallback(addToQueue(exports.tables.subscriptions,exports.ids.events),objResultCallback(callback)),subscription.subscription_id,subscription);
});

var sendNotification = Prelude.curry(function(offer,err,res){

    var user = JSON.parse(res);
    
    console.log(offer);

    var offerurl = "http://localhost:3000/offer/"+user.id+"/"+offer.ticket.ticket_id;

    var mailOptions = {
	from: "TicketFever <ticketfever@gmail.com>", // sender address
	to: user.email, // list of receivers
	subject: "Ticket offer", // Subject line
	text: "There is a ticket for you. To view this offer go to: " + offerurl, // plaintext body
	html: "<b>There is a ticket available for you. To view this offer go to <a href=\""+offerurl+"\">"+offerurl+"</a></b>" // html body
    }

    // send mail with defined transport object
    exports.smtpTransport.sendMail(mailOptions, function(error, response){
	if(error){
	    console.log(error);
	}else{
	    console.log("Message sent: " + response.message);
	}
	// if you don't want to use this transport object anymore, uncomment following line
	//smtpTransport.close(); // shut down the connection pool, no more messages
    });

});

var offerMaker = Prelude.curry(function(eventId,tickets,err,res){

    if(!err){

	var subscribers = res;

	//console.log(subscribers);
	//console.log(tickets);

	var rmTickets = [];
	var rmSubs = [];
	var addOffers = [];

	var exp = Date.now() + 3600*1000;

	for(var i=0;i + 1<subscribers.length && i + 1<tickets.length;i=i+2){

	    var user = evalRes(subscribers[i]);
	    var ticket = evalRes(tickets[i]);

	    addOffers.push({'user':user,'ticket':ticket,'expires':exp,'t_score':tickets[i+1],'s_score':subscribers[i+1]});
	    rmTickets.push(tickets[i+1]);
	    rmSubs.push(subscribers[i+1]);
	}

	if(addOffers.length>0){	    

	    for(var i=0;i<rmTickets.length;i++){
		DB.zremrangebyscore(exports.queues.tickets+':'+eventId,rmTickets[i],rmTickets[i]);
		DB.zremrangebyscore(exports.queues.subscriptions+':'+eventId,rmSubs[i],rmSubs[i]);
	    }

	    

	    for(var i=0;i<addOffers.length;i++){
		DB.hset(exports.tables.offers,addOffers[i].user.fbid+':'+addOffers[i].ticket.ticket_id,JSON.stringify(addOffers[i]));
		console.log(addOffers[i]);

		DB.hget(exports.tables.users,addOffers[i].user.fbid,sendNotification(addOffers[i]));		
	    }
	}
    }

    exports.checkFlag = true;
});

var matchOffers = Prelude.curry(function(eId,err,res){

    if(!err)
	DB.zrangebyscore(exports.queues.subscriptions+':'+eId,'-inf','+inf',"withscores",offerMaker(eId,res));
});

//var 

var matchQueues = Prelude.curry(function(err,res){

    if(!err){

	var queues = res;
	for(var i=0;i<queues.length;i++){

	    var eId = queues[i].substr(queues[i].indexOf(":")+1);
	    
	    DB.zrangebyscore(queues[i],"-inf","+inf","withscores",matchOffers(eId));
	}
    }
});

var checkOffers = function(){

    DB.keys(exports.queues.tickets+':*',matchQueues)

}

var deleteExpired = Prelude.curry(function(err,res){

    var cTime = Date.now();

    if(!err){
	var del = [];

	for(var i=0;i<res.length;i++){

	    var obj = evalRes(res[i]);

	    if(cTime > obj.expires){

		del.push(obj)
	    }
	}

	for(var i=0;i<del.length;i++){

	    DB.zadd(exports.queues.tickets+':'+del[i].ticket.event_id,del[i].t_score,JSON.stringify(del[i].ticket));
	    DB.zadd(exports.queues.subscriptions+':'+del[i].user.event_id,del[i].t_score,JSON.stringify(del[i].user));
	    DB.hdel(exports.tables.offers,del[i].user.id+':'+del[i].ticket.ticket_id);
	}	
    }
});

var expireOffers = function(){

    DB.hvals(exports.tables.offers,deleteExpired);
}

var doOffers = function(){

    
    console.log("fdas");

    checkOffers();
    expireOffers();


    setTimeout(doOffers,5000);

}

exports.watchOffers = function(){

    doOffers();
}

