var express = require('express');
var path = require('path');
// var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var FCM = require('fcm-node');
var serverKey = 'AIzaSyBi-6JXpT40KLFn4e6k0wLa9kdDFAbvnU0';
var fcm = new FCM(serverKey);
var request = require("request");
var firebase = require("firebase");
var senderID = '990776252040'
var toDevices;



var FirebaseTokenGenerator = require("firebase-token-generator");
var tokenGenerator = new FirebaseTokenGenerator("jzH5B1FovmV3vOHq5DprnDd3qqOVw2hw0XjmpWPB");
var serverToken = tokenGenerator.createToken(
  { uid: "flattingplus-webserver-the-best", some: "arbitrary", data: "here" },
  { admin: true }
);

var config = {
      apiKey: "AIzaSyBNxEIn9sIJnYU6lEbdNs98gKefh7eSMS4",
      authDomain: "flattingplus.firebaseapp.com",
      databaseURL: "https://flattingplus.firebaseio.com",
      storageBucket: "bucket.appspot.com",
    };
firebase.initializeApp(config);
var ref = firebase.database().ref();

var app = express();

var port = process.env.PORT || 8080;

app.use("/", express.static(__dirname + '/public'));//serve up the website

var pg = require('pg').native;
var connectionString = "postgres://gmjjkzeggzlbbf:t4oWQipbrMXWYFm0LBu529x1KE@ec2-54-235-104-63.compute-1.amazonaws.com:5432/d9r6u6eji1fjat";
var client = new pg.Client(connectionString);
client.connect();

pg.connect(connectionString, function (err, client, done) {
  if (err) {
    console.error('Could not connect to the database');
    console.error(err);
    return;
  }
  console.log('Connected to database');
});

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// function getFireIDs(groupName)
// {
//   //select firebaseid from users join UsersInGroup on useremail Where groupname=groupName
//   console.log("get firebase ids: " + groupName);
//   var q = "select firebaseid from users natural join usersingroup email Where groupname=$1";
//   var query = client.query(q, [groupName]);
//
//   var results = [];
//
//   //error handler for /get_users
//   query.on('error', function () {
//     console.log('Error, fail to get users from group: ' + groupName);
//   });
//
//   //stream results back one row at a time
//   query.on('row', function (row) {
//     console.log('Row ' + row);
//     results.push(row);
//   });
//
//   //After all data is returned, close connection and return results
//   query.on('end', function () {
//     toDevices = results.toString();
//     return results.toString();
//   });
// }

app.put('/add/user', function (req, res) {
  var name = req.body.name;
  var email = req.body.email;
  var flatGroup = req.body.group;
  var pic = req.body.pic;
  var fireToken = req.body.token;


  console.log("name: " + name + " email: " + email + " token: " + fireToken);
  var q = "insert into users (email,name, pic, flatgroup, firebaseid) values ($1,$2, $3, $4, $5) RETURNING email, name, flatgroup";
  var query = client.query(q, [email, name, pic, flatGroup, fireToken]);
  var results = [];

  //error handler for /add user
  query.on('error', function () {
    res.status(500).send('Error, fail to add user ' + name);
  });

  //stream results back one row at a time
  query.on('row', function (row) {
    results.push(row);
  });

  //after all the data is returned close connection and return result
  query.on('end', function () {
    // var ob = JSON.stringify(results);
    var obj = { email: results[0].email, name: results[0].name, flatgroup: results[0].flatgroup };
    res.json(obj);
    console.log("result: " + obj);
  });
});

//get user
app.get('/get/user', function (req, res) {
  var userEmail = req.query.email;
  var userPass = req.body.pass;
  console.log("get user, email: " + userEmail);
  var q = "SELECT * FROM users WHERE email=$1";
  var query = client.query(q, [userEmail]);

  var results = [];

  //error handler for /get_users
  query.on('error', function () {
    res.status(500).send('Error, fail to get users: ' + userEmail);
  });

  //stream results back one row at a time
  query.on('row', function (row) {
    console.log('Row ' + row);
    results.push(row);
  });

  //After all data is returned, close connection and return results
  query.on('end', function () {
    res.json(results);
    console.log("result: " + results[0]);
  });
});

//update user
app.post('/update/user', function (req, res) {
  var userName = req.body.name;
  var userEmail = req.body.email;
  var userGroup = req.body.group;
  var userPic = req.body.pic;
  console.log(userName + " " + userEmail + " " + userGroup + " " + userPic);
  var q = "UPDATE users SET name=($1), flatgroup=($2), pic=($3) where email=($4)";
  var query = client.query(q, [userName, userGroup, userPic, userEmail]);
  var results = [];

  //error handler for /update_cart
  query.on('error', function () {
    res.status(500).send('Error, fail to update user:' + userName + ' email: ' + userEmail);
  });

  //stream results back one row at a time
  query.on('row', function (row) {
    results.push(row);
  });

  //after all the data is returned close connection and return result
  query.on('end', function () {
    var obj = {};

    // var obj = { groupname: results[0].groupname, email: results[0].email, name: results[0].name };
    res.json(obj);
    console.log("result: " + obj);
  });
});

app.get('/get/users', function (req, res) {
  var userName = req.body.name;

  var query = client.query("select * from users");
  var results = [];

  //error handler for /get_users
  query.on('error', function () {
    res.status(500).send('Error, fail to get users: ' + userName);
  });

  //stream results back one row at a time
  query.on('row', function (row) {
    results.push(row);
  });

  //After all data is returned, close connection and return results
  query.on('end', function () {
    res.json(results);
    console.log("result: " + results);
  });
});


//get group - where the user isnt already part of this group
app.get('/get/flatgroup', function (req, res) {
  var groupName = req.query.gname;
  var groupPass = req.query.pass;
  console.log("get group, name: " + groupName + " password: " + groupPass);
  var q = "SELECT * FROM flatgroup WHERE groupname=$1 and password=$2";
  var query = client.query(q, [groupName, groupPass]);

  var results = [];

  //error handler for /get_users
  query.on('error', function () {
    res.status(500).send('Error, fail to get group: ' + userEmail);
  });

  //stream results back one row at a time
  query.on('row', function (row) {
    results.push(row);
  });

  //After all data is returned, close connection and return results
  query.on('end', function () {
    res.json(results);
    console.log("result: " + results[0]);
  });
});



//Get group and add to usersingroup if creditentials match
app.get('/get/flatgroup/add', function (req, res) {
  var groupName = req.query.gname;
  var groupPass = req.query.pass;
  var email = req.query.email;
  var fireToken = req.query.token;
  console.log("get group, name: " + groupName + " password: " + groupPass + " email: " + email);
  var q = "SELECT * FROM flatgroup WHERE groupname=$1 and password=$2";
  var query = client.query(q, [groupName, groupPass]);

  var results = [];

  //error handler for /get_users
  query.on('error', function () {
    res.status(500).send('Error, fail to get group: ' + userEmail);
  });

  //stream results back one row at a time
  query.on('row', function (row) {
    results.push(row);
  });

  //After all data is returned, close connection and return results
  query.on('end', function () {
    if(results.length > 0)
    {

      console.log("About to send add device request to FCM");
      //Add user to device group
      request({
        url: 'https://android.googleapis.com/gcm/notification', //URL to hit
        //qs: {from: 'blog example', time: +new Date()}, //Query string data
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'key='+serverKey,
            'project_id': senderID
        },
        //Lets post the following key/values as form
        json: {
            "operation": "add",
            "notification_key_name": groupName,
            "notification_key": results[0].notificationid,

            // "notification_key": results['notificationid'],
            "registration_ids": [fireToken]
        }
      }, function(error, response, body){
      console.log('add device:' + results[0].notificationid);
      console.log('error: ' + error);
      console.log('body= ' + body);
      console.log('status = ' + response.statusCode);
        if(error) {
            console.log(error);
        } else {
          results.push(body);
            console.log('successfully added another device to ' + groupName + response.statusCode, body);
          }
});
    }
    addToUsersInGroup(groupName, email);
    res.json(results);
    console.log("result: " + results[0]);
  });
});

app.put('/add/group', function (req, res) {
  var flatGroup = req.body.group;
  var pass = req.body.gpass;
  var userEmail = req.body.email;
  var fireToken = req.body.token;
  var groupkey = '';

  console.log("about to register a new group with firebase");
request({
  url: 'https://android.googleapis.com/gcm/notification', //URL to hit
  //qs: {from: 'blog example', time: +new Date()}, //Query string data
  method: 'POST',
  headers: {
      'Content-Type': 'application/json',
      'Authorization': 'key='+serverKey,
      'project_id': senderID
  },
  //Lets post the following key/values as form
  json: {
      "operation": "create",
      "notification_key_name": flatGroup,
      "registration_ids": [fireToken]
  }
}, function(error, response, body){
console.log('error: ' + error);
console.log('body= ' + body);
console.log('status = ' + response.statusCode);
  if(error) {
      console.log(error);
  } else {
      console.log(response.statusCode, body);
      groupkey = body['notification_key'];
      // console.log("body['notification_key']: " + body['notification_key']);
      // key = body[0].notification_key;

      console.log("Key: " + groupkey);
      console.log("Group: " + flatGroup + " Pass: " + pass + " Email: " + userEmail + " Key: " + groupkey);

      var q = "insert into flatgroup (groupname,password, notificationid) values ($1, $2, $3) RETURNING groupname, password, notes, shoppinglist, calendar, money";
      // var q = "insert into flatgroup (groupname,password) "
      //     + "values ($1,$2) RETURNING id, groupname,password, notes, shoppinglist, calendar, money";
      var query = client.query(q, [flatGroup, pass, groupkey]);
      var results = [];

      //error handler for /add group
      query.on('error', function () {
        res.status(500).send('Error, fail to add to group:' + flatGroup + ' email: ' + userEmail);
      });
      //stream results back one row at a time
      query.on('row', function (row) {
        results.push(row);
      });

      //After all data is returned, close connection and return results
      query.on('end', function () {
        //Lets configure and request

        var obj = { groupname: results[0].groupname, password: results[0].password, notes: results[0].notes };
        addToUsersInGroup(flatGroup, userEmail);
        res.json(obj);
        console.log("result: " + obj);
      });
  }
});


});


function addToUsersInGroup(groupName, email)
{
  console.log("Add to users in group: " + groupName + " " + email);
  var q = "insert into usersInGroup (email,groupName) values ($1, $2) RETURNING email, groupName";
  // var q = "insert into flatgroup (groupname,password) "
  //     + "values ($1,$2) RETURNING id, groupname,password, notes, shoppinglist, calendar, money";
  var query = client.query(q, [email, groupName]);
  var results = [];

  //error handler for /add group
  query.on('error', function () {
    console.log('Error, fail to add to user to groups name:' + name + ' email: ' + email);
  });
  //stream results back one row at a time
  query.on('row', function (row) {
    results.push(row);
  });

  //After all data is returned, close connection and return results
  query.on('end', function () {
    var obj = { groupname: results[0].groupname, password: results[0].password, notes: results[0].notes };

    // res.json(obj);
    console.log("result: " + obj);
  });
}

//====================START NOTES==============================
app.put('/add/note', function (req, res) {
  var flatGroup = req.body.group;
  var title = req.body.notetitle;
  var content = req.body.notecontent;
  var owner = req.body.notecreator;
  var time = req.body.notetimestamp;
  console.log(title + ' groupname: ' + flatGroup + ' content: ' + content + ' owner: ' + owner + ' time: ' + time);

  var q = "insert into notes (groupname,content, creator, currtime, title) values ($1,$2, $3, $4, $5) RETURNING groupname, title, currtime, creator";
  var query = client.query(q, [flatGroup, content, owner, time, title]);
  var results = [];

  //error handler for /add user
  query.on('error', function () {
    res.status(500).send('Error, fail to add note ' + title);
  });

  //stream results back one row at a time
  query.on('row', function (row) {
    results.push(row);
  });

  //after all the data is returned close connection and return result
  query.on('end', function () {
    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: 'APA91bGEfolfEgd8ko3J63W3tb0dePR0cKNj-mGpOJeYu7ofcUFuH-1XLU2RBEUCDHGzdisJf1s7m3AeacmhUarsy4dWg47Of831neF-D09BepqpK-gU3BM',
        collapse_key: '0',
        data: {
            your_custom_data_key: 'your_custom_data_value'
        },
        notification: {
            title: 'New note added',
            body: content,
            icon: 'ic_launcher' //now required
        }
    };

    fcm.send(message, function(err, response){
        if (err) {
            console.log("Something has gone wrong! " + err);
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });


    var obj = { groupname: results[0].groupname, title: results[0].title, creator: results[0].creator };
    res.json(obj);
    console.log("result: " + obj);
  });
});


//get notes
app.get('/get/notes', function (req, res) {
  var groupName = req.query.gname;
  var date = req.query.date;
  console.log("get group, name: " + groupName);
  var q = "SELECT *  FROM notes WHERE groupname=$1 AND currtime > $2";
  var query = client.query(q, [groupName, date]);

  var results = [];

  //error handler for /get_users
  query.on('error', function () {
    res.status(500).send('Error, fail to get users: ' + userEmail);
  });

  //stream results back one row at a time
  query.on('row', function (row) {
    results.push(row);
  });
  //After all data is returned, close connection and return results
  query.on('end', function () {
    res.json(results);
    console.log("result: " + results[0]);
  });
});

//====================END NOTES==============================


//====================START MONEY==============================
app.put('/add/money', function (req, res) {
  var flatGroup = req.body.group;
  var title = req.body.notetitle;
  var content = req.body.notecontent;
  var owner = req.body.notecreator;
  var time = req.body.notetimestamp;
  console.log(title + ' groupname: ' + flatGroup + ' content: ' + content + ' owner: ' + owner + ' time: ' + time);

  var q = "insert into money (groupname,content, creator, currtime, title) values ($1,$2, $3, $4, $5) RETURNING groupname, title, currtime, creator";
  var query = client.query(q, [flatGroup, content, owner, time, title]);
  var results = [];

  //error handler for /add user
  query.on('error', function () {
    res.status(500).send('Error, fail to add money note ' + title);
  });

  //stream results back one row at a time
  query.on('row', function (row) {
    results.push(row);
  });

  //after all the data is returned close connection and return result
  query.on('end', function () {
    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: 'APA91bGEfolfEgd8ko3J63W3tb0dePR0cKNj-mGpOJeYu7ofcUFuH-1XLU2RBEUCDHGzdisJf1s7m3AeacmhUarsy4dWg47Of831neF-D09BepqpK-gU3BM',
        collapse_key: '0',
        data: {
            your_custom_data_key: 'your_custom_data_value'
        },
        notification: {
            title: 'New money item added',
            body: content,
            icon: 'ic_launcher' //now required
        }
    };

    fcm.send(message, function(err, response){
        if (err) {
            console.log("Something has gone wrong! " + err);
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });


    var obj = { groupname: results[0].groupname, title: results[0].title, creator: results[0].creator };
    res.json(obj);
    console.log("result: " + obj);
  });
});


//get money
app.get('/get/money', function (req, res) {
  var groupName = req.query.gname;
  var date = req.query.date;
  console.log("(money) get group, name: " + groupName);
  var q = "SELECT *  FROM money WHERE groupname=$1 AND currtime > $2";
  var query = client.query(q, [groupName, date]);

  var results = [];

  //error handler for /get notes
  query.on('error', function () {
    res.status(500).send('Error, fail to get money: ' + userEmail);
  });

  //stream results back one row at a time
  query.on('row', function (row) {
    results.push(row);
  });
  //After all data is returned, close connection and return results
  query.on('end', function () {
    res.json(results);
    console.log("result: " + results[0]);
  });
});

//====================END MONEY==============================


//====================START SHOPPING==============================
app.put('/add/shopping', function (req, res) {
  var flatGroup = req.body.group;
  var title = req.body.notetitle;
  var content = req.body.notecontent;
  var owner = req.body.notecreator;
  var time = req.body.notetimestamp;
  console.log(title + ' groupname: ' + flatGroup + ' content: ' + content + ' owner: ' + owner + ' time: ' + time);

  var q = "insert into shopping (groupname,content, creator, currtime, title) values ($1,$2, $3, $4, $5) RETURNING groupname, title, currtime, creator";
  var query = client.query(q, [flatGroup, content, owner, time, title]);
  var results = [];

  //error handler for /add user
  query.on('error', function () {
    res.status(500).send('Error, fail to add note ' + title);
  });

  //stream results back one row at a time
  query.on('row', function (row) {
    results.push(row);
  });

  //after all the data is returned close connection and return result
  query.on('end', function () {
    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: 'APA91bGEfolfEgd8ko3J63W3tb0dePR0cKNj-mGpOJeYu7ofcUFuH-1XLU2RBEUCDHGzdisJf1s7m3AeacmhUarsy4dWg47Of831neF-D09BepqpK-gU3BM',
        collapse_key: '0',
        data: {
            your_custom_data_key: 'your_custom_data_value'
        },
        notification: {
            title: 'New shopping item added',
            body: content,
            icon: 'ic_launcher' //now required
        }
    };

    fcm.send(message, function(err, response){
        if (err) {
            console.log("Something has gone wrong! " + err);
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });


    var obj = { groupname: results[0].groupname, title: results[0].title, creator: results[0].creator };
    res.json(obj);
    console.log("result: " + obj);
  });
});


//get shopping
app.get('/get/shopping', function (req, res) {
  var groupName = req.query.gname;
  var date = req.query.date;
  console.log("get group, name: " + groupName);
  var q = "SELECT *  FROM shopping WHERE groupname=$1 AND currtime > $2";
  var query = client.query(q, [groupName, date]);

  var results = [];

  //error handler for /get_users
  query.on('error', function () {
    res.status(500).send('Error, fail to get users: ' + userEmail);
  });

  //stream results back one row at a time
  query.on('row', function (row) {
    results.push(row);
  });
  //After all data is returned, close connection and return results
  query.on('end', function () {
    res.json(results);
    console.log("result: " + results[0]);
  });
});

//====================END SHOPPING==============================


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;

app.listen(port, function () {
  console.log("Flatting Plus app listening on port: " + port + "!");
});
