var Prelude = require('prelude-ls');

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

    createObj(exports.tables.users,callback,user.fbid,user);
});


exports.getUser = Prelude.curry(function(callback,fbid){

    DB.hget(exports.tables.users,fbid,getObjCallback(callback));
});

exports.getEvent = Prelude.curry(function(callback,eventId){

    DB.hget(exports.tables.events,eventId,getObjCallback(callback));
});

exports.createEvent = Prelude.curry(function(callback,event){

    createObjWithId(exports.tables.events,callback,event);
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

exports.createTicket = Prelude.curry(function(callback,ticket){

    createObjWithId(exports.tables.tickets,seqCallback(addToQueue(exports.tables.tickets,exports.ids.events),objResultCallback(callback)),ticket);
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

var offerMaker = Prelude.curry(function(eventId,tickets,err,res){

    if(!err){

	var subscribers = res;

	console.log(subscribers);
	console.log(tickets);

	var rmTickets = [];
	var rmSubs = [];
	var addOffers = [];

	var exp = Date.now() + 3600*1000;

	for(var i=0;i + 1<subscribers.length && i + 1<tickets.length;i=i+2){

	    var user = evalRes(subscribers[i]);
	    var ticket = evalRes(tickets[i]);

	    addOffers.push(user.fbid+':'+ticket.ticket_id + " " + JSON.stringify({'user':subscribers[i],'ticket':tickets[i],'expires':exp,'t_score':tickets[i+1],'s_score':subscribers[i+1]}));
	    rmTickets.push(tickets[i+1]);
	    rmSubs.push(subscribers[i+1]);
	}

	if(addOffers.length>0){

	    for(var i=0;i<rmTickets.length;i++){
		DB.zremrangebyscore(exports.queues.tickets+':'+eventId,rmTickets[i],rmTickets[i]);
		DB.zremrangebyscore(exports.queues.subscriptions+':'+eventId,rmSubs[i],rmSubs[i]);
	    }
	    DB.hmset(exports.tables.offers,addOffers);
	}
    }
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

var watchOffers = function(){

    DB.keys(exports.queues.tickets+':*',matchQueues)

}

exports.watchOffers = function(){


    watchOffers();

    setInterval(exports.watchOffers,5000);
}
