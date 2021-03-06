var mongoose = require( 'mongoose' );
var User = require('../models/user');
var jwt = require('jsonwebtoken'); 
var config = require('../config');

exports.signupAdmin = function(req, res, next){
    // Check for registration errors
     const name = req.body.name;
     const email = req.body.email;
     const username = req.body.username;
     const password = req.body.password;
     const usertype = req.body.usertype;

     if (!name || !email || !username || !password) {
         return res.status(201).json({ success: false, message: 'Posted data is not correct or incomplete.'});
     }
 
     User.findOne({ username: username }, function(err, existingUser) {
         if(err){ return res.status(201).json({ success: false, message:'Error processing request '+ err}); }
 
         // If user is not unique, return error
         if (existingUser) {
             return res.status(201).json({
                 success: false,
                 message: 'Username already exists.'
             });
         }
        // If no error, create account
        let oUser = new User({
                name: name,
                email: email,
                contactno: '-',
                bankaccno: '-',
                bankcode:'-',
                bankname: '-',
                username: username,
                password: password,
                usertype: usertype,
                status: 'STSACT',
                balance: 0,
                balance_idx:0,
                verified_no:'N',
                verified_email:'N',
                pmtmethod: null,
                ccno: null,
                ccholdername:null,
                ccissuerbank:null,
                expmth: null,
                expyr: null,
                ccvno: null
            });
        
        oUser.save(function(err, oUser) {
            if(err){ return res.status(201).json({ success: false, message:'Error processing request '+ err}); }
        
            res.status(200).json({
                success: true,
                message: 'User created successfully. You can now login as Admin.'
            });
        });
    });
}

exports.userlabelreport = function(req, res, next){
    const username = req.body.username || req.query.username;
    const name = req.body.name || req.query.name;
    const status = req.body.status || req.query.status;
    const usertype = 'LBL';
    var totalcount;

    let limit = parseInt(req.query.limit);
    let page = parseInt(req.body.page || req.query.page);
    let sortby = req.body.sortby || req.query.sortby;
    let query = {};

    if(!limit || limit < 1) {
	    limit = 10;
    }

    if(!page || page < 1) {
	    page = 1;
    }

    if(!sortby) {
	    sortby = 'name';
    }

    var offset = (page - 1) * limit;
    
    // returns all artists records for the label
    //query = { labelid:labelid, artistname:artistname };
    if (!status) {
        query = { username: new RegExp(username,'i'), name: new RegExp(name,'i'), usertype:usertype};
    }else{
        query = { username: new RegExp(username,'i'), name: new RegExp(name,'i'), usertype:usertype, status: status};
    }

    User.count(query, function(err, count){
        totalcount = count;
        //console.log('count: ' + count.toString());                
        if(count > offset){
            offset = 0;
        }
    });
    
    //console.log('offset: ' + offset);   
    var options = {
        select: 'name email contactno bankaccno bankname username status lastlogin balance',
        sort: sortby,
        offset: offset,
        limit: limit
    }

    User.paginate(query, options).then(function(result) {
        res.status(201).json({
            success: true, 
            data: result,
            totalcount: totalcount
        });
    });
  
}

exports.labelaggreport = function(req, res, next){
    const username = req.body.username || req.query.username;
    const name = req.body.name || req.query.name;
    const status = req.body.status || req.query.status;
    const verified_email = req.body.veremail || req.query.veremail;
    const usertype = 'LBL';
    const msconfiggrp = 'STATUS';
    const msconfigsts = 'STSACT';
    var totalcount;

    let limit = parseInt(req.query.limit);
    let page = parseInt(req.body.page || req.query.page);
    let sortby = req.body.sortby || req.query.sortby;
    let query = {};

    if(!limit || limit < 1) {
	    limit = 10;
    }

    if(!page || page < 1) {
	    page = 1;
    }
    
    // returns all artists records for the label
    //query = { labelid:labelid, artistname:artistname };
    if (!status) {
        if (!verified_email) {
            query = { username: new RegExp(username,'i'), name: new RegExp(name,'i'), usertype:usertype, "msconfigdetails.group": msconfiggrp, "msconfigdetails.status": msconfigsts};
        } else {
            query = { username: new RegExp(username,'i'), name: new RegExp(name,'i'), usertype:usertype, "msconfigdetails.group": msconfiggrp, "msconfigdetails.status": msconfigsts, verified_email:verified_email};
        }
    }else{
        if (!verified_email) {
            query = { username: new RegExp(username,'i'), name: new RegExp(name,'i'), usertype:usertype, "msconfigdetails.group": msconfiggrp, "msconfigdetails.status": msconfigsts, status: status};
        } else {
            query = { username: new RegExp(username,'i'), name: new RegExp(name,'i'), usertype:usertype, "msconfigdetails.group": msconfiggrp, "msconfigdetails.status": msconfigsts, status: status, verified_email:verified_email};
        }        
    }

    if(!sortby) {
        var options = {
            page: page,
            limit: limit
        }
    } else {
        var options = {
            page: page,
            limit: limit,
            sortBy: sortby
        }
    }
    var aggregate = User.aggregate();        
    var olookup = {
      from: 'msconfig',
      localField: 'status',
      foreignField: 'code',
      as: 'msconfigdetails'
    };
    var ounwind = 'msconfigdetails';
    var oproject = { 
        _id:1,
        username: 1,
        name:1,
        email:1,
        contactno:1,
        bankaccno:1,
        bankname:1,
        status:1,
        "stsvalue": "$msconfigdetails.value",
        verified_email:1,
        verified_no:1,
        lastlogin:1,
        balance:1
      };
    aggregate.lookup(olookup).unwind(ounwind);
    aggregate.match(query);  
    aggregate.project(oproject);      
    if(!sortby) {
        var osort = { name: 1, username:1};
        aggregate.sort(osort);
    }
    User.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
        if(err) 
        {
            res.status(400).json({
                success: false, 
                message: err.message
            });
        }
        else
        { 
            res.status(201).json({
                success: true, 
                data: results,
                npage: pageCount,
                totalcount: count
            });
        }
      })
}

exports.pendinglabelaggreport = function(req, res, next){
    const username = req.body.username || req.query.username;
    const name = req.body.name || req.query.name;
    const status = 'STSPEND';
    const verified_email = 'Y';
    const usertype = 'LBL';
    const msconfiggrp = 'STATUS';
    const msconfigsts = 'STSACT';
    var totalcount;

    let limit = parseInt(req.query.limit);
    let page = parseInt(req.body.page || req.query.page);
    let sortby = req.body.sortby || req.query.sortby;
    let query = {};

    if(!limit || limit < 1) {
	    limit = 10;
    }

    if(!page || page < 1) {
	    page = 1;
    }
    
    // returns all artists records for the label
    //query = { labelid:labelid, artistname:artistname };
    query = { username: new RegExp(username,'i'), 
            name: new RegExp(name,'i'), 
            usertype:usertype, 
            "msconfigdetails.group": msconfiggrp, 
            "msconfigdetails.status": msconfigsts, 
            status: status, 
            verified_email:verified_email};
    
    if(!sortby) {
        var options = {
            page: page,
            limit: limit
        }
    } else {
        var options = {
            page: page,
            limit: limit,
            sortBy: sortby
        }
    }
    var aggregate = User.aggregate();        
    var olookup = {
      from: 'msconfig',
      localField: 'status',
      foreignField: 'code',
      as: 'msconfigdetails'
    };
    var ounwind = 'msconfigdetails';
    var oproject = { 
        _id:1,
        username: 1,
        name:1,
        email:1,
        contactno:1,
        bankaccno:1,
        bankname:1,
        status:1,
        "stsvalue": "$msconfigdetails.value",
        verified_email:1,
        verified_no:1,
        lastlogin:1,
        balance:1
      };
    aggregate.lookup(olookup).unwind(ounwind);
    aggregate.match(query);  
    aggregate.project(oproject);      
    if(!sortby) {
        var osort = { name: 1, username:1};
        aggregate.sort(osort);
    }
    User.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
        if(err) 
        {
            res.status(400).json({
                success: false, 
                message: err.message
            });
        }
        else
        { 
            res.status(201).json({
                success: true, 
                data: results,
                npage: pageCount,
                totalcount: count
            });
        }
      })
}

exports.pendinglabelcount = function(req, res, next){
    const username = req.body.username || req.query.username;
    const name = req.body.name || req.query.name;
    const status = req.body.status || req.query.status;
    const verified_email = req.body.veremail || req.query.veremail;
    const usertype = 'LBL';

    let query = {};

    
    // returns all artists records for the label
    //query = { labelid:labelid, artistname:artistname };
    if (!status) {
        query = { username: new RegExp(username,'i'), name: new RegExp(name,'i'), verified_email:verified_email, usertype:usertype};
    }else{
        query = { username: new RegExp(username,'i'), name: new RegExp(name,'i'), verified_email:verified_email, usertype:usertype, status: status};
    }
    console.log(query);
    User.count(query, function(err, count){
        if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err }); }
        
        res.status(201).json({
            success: true,
            totalcount: count
        }); 
    });
}

exports.changelabelstatus = function(req, res, next){
    const labelid = req.params.id;
    const status = req.body.status;

    if (!labelid) {
        return res.status(422).json({ success: false, message: 'Parameter data is not correct or incompleted.'});
    } else {
        User.findById(labelid).exec(function(err, user){
            if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                
            if(user){
                user.status = status;
                user.save(function(err){
                  if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err }); }
                  res.status(201).json({
                      success: true,
                      message: 'Label status has been changed successfully'
                  });
                });
            }
        });
    }
}

exports.changelabelbalance = function(req, res, next){
    const labelid = req.params.id;
    const balance = req.body.balance;

    if (!labelid) {
        return res.status(422).json({ success: false, message: 'Parameter data is not correct or incompleted.'});
    } else {
        User.findById(labelid).exec(function(err, user){
            if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                
            if(user){
                user.balance = balance;
                user.save(function(err){
                  if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err }); }
                  res.status(201).json({
                      success: true,
                      message: 'Label balance has been changed successfully'
                  });
                });
            }
        });
    }
}

exports.getlabellist = function(req, res, next){
    const usertype = 'LBL';
    const status = 'STSACT';
    const sortby = 'name';
    let query = {};

    // returns artists records based on query
    query = { usertype:usertype, status: status};        
    var fields = { 
        _id:1, 
        name:1 
    };

    var psort = { name: 1 };

    User.find(query, fields).sort(psort).exec(function(err, result) {
        if(err) { 
            res.status(400).json({ success: false, message:'Error processing request '+ err }); 
        } 
        res.status(201).json({
            success: true, 
            data: result
        });
    });

}

// --------------- SHARED USER FUNCTION !!!!! ------------------------------------------------------------------
exports.authenticate = function(req, res, next){
    // check header or url parameters or post parameters for token
	var token = req.headers['authorization'];
    //console.log(token);
	if (token) {
		jwt.verify(token, config.secret, function(err, decoded) {			
			if (err) {
				return res.status(201).json({ success: false, message: 'Authenticate token expired, please login again.', errcode: 'exp-token' });
			} else {
				req.decoded = decoded;	
				next();
			}
		});
	} else {
		return res.status(201).json({ 
			success: false, 
			message: 'Fatal error, Authenticate token not available.',
            		errcode: 'no-token'
		});
	}
}

exports.signupSuper = function(req, res, next){
    // Check for registration errors
     const name = req.body.name;
     const email = req.body.email;
     const username = req.body.username;
     const password = req.body.password;

     if (!name || !email || !username || !password) {
         return res.status(201).json({ success: false, message: 'Posted data is not correct or incomplete.'});
     }
 
     User.findOne({ username: username }, function(err, existingUser) {
         if(err){ return res.status(201).json({ success: false, message:'Error processing request '+ err}); }
 
         // If user is not unique, return error
         if (existingUser) {
             return res.status(201).json({
                 success: false,
                 message: 'Username already exists.'
             });
         }
        // If no error, create account
        let oUser = new User({
                name: name,
                email: email,
                contactno: '-',
                bankaccno: '-',
                bankcode:'-',
                bankname: '-',
                username: username,
                password: password,
                usertype: 'SUP',
                status: 'STSACT',
                balance: 0,
                balance_idx:0,
                verified_no:'N',
                verified_email:'N',
                pmtmethod: null,
                ccno: null,
                ccholdername:null,
                ccissuerbank:null,
                expmth: null,
                expyr: null,
                ccvno: null
            });
        
        oUser.save(function(err, oUser) {
            if(err){ return res.status(201).json({ success: false, message:'Error processing request '+ err}); }
        
            res.status(200).json({
                success: true,
                message: 'User created successfully. You can now login as Superuser.'
            });
        });
    });
}