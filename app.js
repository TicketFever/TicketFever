
/**
 * Module dependencies.
 */

var redis = require('redis');

DB = redis.createClient();

Prelude = require('prelude-ls');

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , frontend = require('./db/frontend')
  , backend = require('./db/backend');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/user/:fbid', frontend.getUser);
app.post('/createUser',frontend.createUser);
app.get('/event/:event_id',frontend.loadEvent);
app.post('/createEvent',frontend.createEvent);
app.get('/subscribeEvent/:event_id/:fbid',frontend.subscribeEvent);
app.get('/registerEvent',frontend.createEventPage);
app.post('/createTicket',frontend.createTicket);
app.get('/offer/:fbid/:ticket_id',frontend.loadOffer);
app.get('/downloads/:ticket_id',frontend.downloadTicket);

app.get('/:event_id', frontend.loadEvent);

backend.watchOffers();

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
