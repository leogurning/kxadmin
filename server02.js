const express 	= require('express');
const bodyParser  = require('body-parser');
const morgan      = require('morgan');
const mongoose    = require('mongoose');
var upload = require('express-fileupload');
const path = require('path');

const jwt    = require('jsonwebtoken'); 
const config = require('./config'); 

const user = require('./routes/user.js');

const masterconfig = require('./routes/masterconfig.js');
const songadm = require('./routes/songAdm.js');

const port = process.env.PORT || config.serverport;

mongoose.connect(config.database, function(err){
	if(err){
		console.log('Error connecting database, please check if MongoDB is running.');
	}else{
		console.log('Connected to database...');
	}
}); 

const app = express();
app.use(upload()); // configure middleware
// Enable CORS from client-side
app.use(function(req, res, next) {  
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Credentials");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if ('OPTIONS' === req.method) { res.send(204); } else { next(); }
  });

app.use(express.static(path.join(__dirname, 'public')));

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(require('body-parser').json({ type : '*/*' })); --> this can make error in JSON
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

// basic routes
app.get('/', function(req, res) {
	res.send('Kaxet admin API is running at http://legu.herokuapp:' + port + '/api');
});

app.post('/registerAdmin', user.signupAdmin);

// express router
var apiRoutes = express.Router();
app.use('/api', apiRoutes);
apiRoutes.post('/login', user.login);
apiRoutes.use(user.authenticate); // route middleware to authenticate and check token

// authenticated routes
apiRoutes.get('/', function(req, res) {
	res.status(201).json({ message: 'Welcome to the authenticated routes!' });
});

apiRoutes.get('/user/:id', user.getuserDetails); // API returns user details 
apiRoutes.put('/user/:id', user.updateUser); // API updates user details
apiRoutes.put('/password/:id', user.updatePassword); // API updates user password
apiRoutes.post('/userlabelreport', user.userlabelreport); // API display list user label
apiRoutes.put('/changelabelstatus/:id', user.changelabelstatus); // API updates status user label
apiRoutes.put('/changelabelbalance/:id', user.changelabelbalance); // API updates balance user label

apiRoutes.put('/cancelpublishsong/:id', songadm.cancelpublishsong); //API to cancel publishing song
apiRoutes.put('/publishsong/:id', songadm.publishsong); //API to publish song
apiRoutes.post('/songadm/aggreport', songadm.songaggregateAdm); //API to display list of song based on search criteria
apiRoutes.get('/songadm/:id', songadm.getsong); // API get song details of the label
apiRoutes.get('/songaggregate/:id', songadm.getsongaggregate); // API returns song details of given song id

apiRoutes.post('/genrephotoupload', masterconfig.genrephotoupload); //API to cancel publishing song
apiRoutes.post('/genrephotodelete', masterconfig.genrephotodelete); //API to cancel publishing song
apiRoutes.post('/msconfig/:id', masterconfig.savemsconfig); //API to cancel publishing song
apiRoutes.delete('/msconfig/:id', masterconfig.delmsconfig); //API to cancel publishing song
apiRoutes.put('/msconfig/:id', masterconfig.updatemsconfigfile); //API to publish song
apiRoutes.post('/mscfgaggreport', masterconfig.msconfigaggregate); //API to display list of song based on search criteria
apiRoutes.get('/msconfig/:id', masterconfig.getmsconfig); // API get song details of the label
apiRoutes.get('/msconfigagg/:id', masterconfig.getmsconfigaggregate); // API returns song details of given song id

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// kick off the server 
app.listen(port);

console.log('Kaxet admin app is listening at http://legu.herokuapp:' + port);