var Prelude = require('prelude-ls');

exports.tables = {'users':'users',
		  'events':'events'};

exports.ids = {'events':'event_id'};

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
