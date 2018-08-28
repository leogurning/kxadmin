const mongoose = require( 'mongoose' );
const Adjustment = require('../models/adjustment');
const Transaction = require('../models/transaction');
const config = require('../config');
var rediscli = require('../redisconn');

var ObjId = mongoose.Types.ObjectId;
var merge = function() {
  var obj = {},
      i = 0,
      il = arguments.length,
      key;
  for (; i < il; i++) {
      for (key in arguments[i]) {
          if (arguments[i].hasOwnProperty(key)) {
              obj[key] = arguments[i][key];
          }
      }
  }
  return obj;
};

exports.saveadjustment = function(req, res, next){
    const userid = req.params.id;
    const labelid = req.body.labelid;
    const amount = req.body.amount;
    const remarks = req.body.remarks;
    const username = req.body.username;
    const dbcr = req.body.dbcr;

    if (!labelid ||!amount ||!remarks ||!username || !dbcr ) {
        return res.status(422).send({ success: false, message: 'Main posted data is not correct or incompleted.' });
    } else {
        checkPendingAdj(labelid, function(err, adjresult) {
            if (err) { return res.status(400).json({success: false, message:err}); }            
            if (adjresult === 'NF') {
                // Add new transaction
                let oAdjustment = new Adjustment({
                    labelid: labelid,
                    amount: amount,
                    remarks: remarks,
                    dbcr: dbcr,
                    requestdt: new Date(),
                    requestby: username,
                    status: 'STSPEND',
                    objlabelid: labelid,
                    extfield1: 'Adjustment requested by '+username +' on '+new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
                });

                oAdjustment.save(function(err) {
                    if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                        
                    res.status(200).json({
                        success: true,
                        message: 'Request saved successfully with status Pending. \n Must be approved by finance admin.'
                    });
                    //Delete redis respective keys
                    //rediscli.del('redis-user-songpurchase-'+labelid, 'redis-user-songpurchasecnt-'+labelid);
                });
            } else {
                res.status(201).json({
                    success: false,
                    message: 'Proses error !. The label still have pending adjustment transaction. Please complete it first.'
                    //rname: rname.toUpperCase()
                });
            }
        });
    }
}

function checkPendingAdj(labelid, cb) {
    try {
        var query = {};
        query = {labelid: labelid, status:'STSPEND'};
        //query = {labelid: labelid, artistname: {$regex: pname, $options:"0i"}};
        //console.log(query);
        Adjustment.findOne(query).exec(function(err, result){
            if (err) { cb(err, null);}
            if (result) {
                //console.log(true);
                cb(null, 'FN');
            } else {
                //console.log(false);
                cb(null, 'NF');                
            }
        });        
    } catch (error) {
        //console.error(false, error.message);
        cb(error,null);
    }
}

exports.adjustmentagg = function(req, res, next){
    const userid =  req.params.id;
    const labelid =  req.body.labelid || req.query.labelid;
    const status =  req.body.status || req.query.status;
    const fromamt = req.body.fromamt || req.query.fromamt;
    const toamt = req.body.toamt || req.query.toamt;
    const rptype = req.body.rptype || req.query.rptype;
    const from_dt = req.body.startdt || req.query.startdt;
    const to_dt = req.body.enddt || req.query.enddt;
    const fromdt = new Date(from_dt);
    const todt = new Date(to_dt);
    const msconfiggrp = 'TRFBLSTATUS';
    const msconfigsts = 'STSACT';

    var totalcount;
  
    let limit = parseInt(req.query.limit);
    let page = parseInt(req.body.page || req.query.page);
    let sortby = req.body.sortby || req.query.sortby;
    let query = {};
    //let qmatch = {};
  
    if(!limit || limit < 1) {
      limit = 10;
    }
  
    if(!page || page < 1) {
      page = 1;
    }
  
  /*   if(!sortby) {
      sortby = 'songname';
    } */
  
    if (!rptype) {
        return res.status(202).json({ success: false, message: 'Posted data is not correct or incompleted.'});
	}else if(rptype === 'opt2' && !from_dt && !to_dt){
		return res.status(202).json({ success: false, message: 'From or To date missing.'});
	}else if(fromdt > todt){   
		 return res.status(202).json({ success: false, message: 'From date cannot be greater than To date.'});
	}else{
        // returns songs records based on query
        query = {"msconfigdetails.group": msconfiggrp,
                "msconfigdetails.status": msconfigsts
            };

        if (fromamt && !toamt) {
            let pfromamt = parseInt(fromamt, 10);
            if (pfromamt < 0) {
                return res.status(202).json({ success: false, message: 'From amount cannot be negative.'});
            } else {
                query = merge(query, { amount:{$gte: pfromamt} });
            }
        } else if (!fromamt && toamt) {
            let ptoamt = parseInt(toamt, 10);
            if (ptoamt < 0) {
                return res.status(202).json({ success: false, message: 'TO amount cannot be negative.'});
            } else {
                query = merge(query, { amount:{$lte: ptoamt} });
            }
        } else if (fromamt && toamt) {
            let pfromamt = parseInt(fromamt, 10);
            let ptoamt = parseInt(toamt, 10);
            if (pfromamt < 0 || ptoamt < 0) {
                return res.status(202).send({ success: false, message: 'Amount cannot be negative.'});                
            } else {
                if (pfromamt > ptoamt) {
                    return res.status(202).send({ success: false, message: 'From amount cannot be greater than To amount.'});
                } else {
                    query = merge(query, { amount:{$gte: pfromamt, $lte: ptoamt} });
                }
            }
        }

        if (rptype === 'opt1'){
			// returns records for the current month
			let oDt = new Date();
			let month = oDt.getUTCMonth() + 1; //months from 1-12
			let year = oDt.getUTCFullYear();

			let fdt = new Date(year + "/" + month + "/1");
			let tdt = new Date(year + "/" + month + "/31");
            query = merge(query, { requestdt:{$gte: fdt, $lte: tdt} });

		} else if (rptype === 'opt2'){
            // return records within given date range
            fromdt.setDate(fromdt.getDate());
            fromdt.setHours(0,0,0);
            todt.setDate(todt.getDate());
            todt.setHours(23,59,59);
            query = merge(query, { requestdt:{$gte: fromdt, $lte: todt} });

		} else if (rptype === 'opt3') {
            // returns today expense records for the user
            let ptodt = new Date();
            //let dt = ptodt.getUTCDate() + 1;
            let dt = ptodt.getDate();
			let month = ptodt.getMonth() + 1; //months from 1-12
			let year = ptodt.getFullYear();
            let pfromdt = new Date(year + "/" + month + "/" + dt);
            pfromdt.setHours(0,0,0);
            let todt = new Date(year + "/" + month + "/" + dt);
            todt.setHours(23,59,59);
            query = merge(query, { requestdt:{$gte: pfromdt, $lte: todt} });
        }
        
        if (labelid) {
            query = merge(query, {labelid:labelid});
        }

        if (status) {
            query = merge(query, {status: status});
        }

        if(!sortby) {
            var options = {
                page: page,
                limit: limit
            }
        }
        else {
            var options = {
                page: page,
                limit: limit,
                sortBy: sortby
            }
        }

        var aggregate = Adjustment.aggregate();  

        var olookuplb = {
            from: 'user',
            localField: 'objlabelid',
            foreignField: '_id',
            as: 'labeldetails'
        };
        var olookupc = {
            from: 'msconfig',
            localField: 'status',
            foreignField: 'code',
            as: 'msconfigdetails'
          };          

        var ounwindc = 'msconfigdetails';
        var ounwindlb = 'labeldetails';

        var oproject = { 
            _id:1,
            labelid:1,
            "label":"$labeldetails.name",
            amount:1,
            dbcr:1,
            requestdt:1,
            requestby:1,
            approvedt:1,
            approveby:1,
            status:1,
            "stsvalue": "$msconfigdetails.value",
            objlabelid:1
        };

        aggregate.lookup(olookupc).unwind(ounwindc);
        aggregate.match(query);
        aggregate.lookup(olookuplb).unwind(ounwindlb);

        aggregate.project(oproject);      
        if(!sortby) {
            var osort = { requestdt: -1, label:1};
            aggregate.sort(osort);
        }
        Adjustment.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
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
      
}

exports.getadjustmentagg = function(req, res, next){
    const adjid =  req.params.id;
    const msconfiggrp = 'TRFBLSTATUS';
    const msconfigsts = 'STSACT';
  
    if (!adjid ) {
        return res.status(202).json({ success: false, message: 'Posted data is not correct or incompleted.'});
	}else{
        // returns songs records based on query
        query = {_id: new mongoose.Types.ObjectId(adjid), 
                "msconfigdetails.group": msconfiggrp,
                "msconfigdetails.status": msconfigsts
            };

        var aggregate = Adjustment.aggregate();  
        var olookuplb = {
            from: 'user',
            localField: 'objlabelid',
            foreignField: '_id',
            as: 'labeldetails'
        };
        var olookupc = {
            from: 'msconfig',
            localField: 'status',
            foreignField: 'code',
            as: 'msconfigdetails'
          };          
            
        var ounwindc = 'msconfigdetails';
        var ounwindlb = 'labeldetails';

        var oproject = { 
            _id:1,
            labelid:1,
            "label":"$labeldetails.name",
            amount:1,
            dbcr:1,
            requestdt:1,
            requestby:1,
            approvedt:1,
            approveby:1,
            status:1,
            "stsvalue": "$msconfigdetails.value",
            remarks:1,
            extfield1:1,
            extfield2:1,
            objlabelid:1
        };

        aggregate.lookup(olookupc).unwind(ounwindc);
        aggregate.match(query);
        aggregate.lookup(olookuplb).unwind(ounwindlb);
        aggregate.project(oproject);      
        aggregate.exec(function(err, result) {
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
                    data: result
                });
            }
        })
    }
      
}

exports.updatestatusadjustment = function(req, res, next){
    const adjid = req.params.id;
    const status = req.body.status;
    const adminuser = req.body.adminuser;
    const adminuserid = req.body.adminuserid;

    var stsvalue, rmks, labelid, dbcr, amount;
    if (!adjid || !status) {
        return res.status(422).json({ success: false, message: 'Posted data is not correct or incompleted.'});
    } else {
        Adjustment.findById(adjid).exec(function(err, adj){
            if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                
            if(adj){
                rmks = adj.remarks;
                labelid = adj.labelid;
                dbcr = adj.dbcr;
                amount = adj.amount;
                if (status == 'STSRJCT') {
                    stsvalue = 'Rejected';
                } else if (status == 'STSCMPL') {
                    stsvalue = 'Completed';
                    adj.approvedt = new Date();  
                    adj.approveby = adminuser;  
                }
                adj.status = status;
                adj.extfield1 = 'admin: '+ adminuser+' update status to ' + stsvalue + ' on '+new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') +' \n ' + adj.extfield1;
                adj.save(function(err){
                    if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err }); }
                    if (status == 'STSCMPL') {
                        //Add transaction
                        let oTransaction = new Transaction({
                            labelid: labelid,
                            purchaseid: rmks,
                            producttype: 'ADJUSTMENT',
                            dbcr: dbcr,
                            amount: amount,
                            transactiondt: new Date(),
                            objlabelid: labelid,
                            //objpurchaseid: bankref
                        });
                
                        oTransaction.save(function(err) {
                            if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                                
                            res.status(201).json({
                                success: true,
                                message: 'Adjustment completed successfully'
                              });
                            //Delete redis respective keys
                            //rediscli.del('redis-user-songpurchase-'+labelid, 'redis-user-songpurchasecnt-'+labelid);
                        });
                    } else {
                        res.status(201).json({
                        success: true,
                        message: 'Adjustment has been rejected !'
                        });
                    }
                    //Delete redis respective keys
                    //rediscli.del('redis-user-pendingsongpurchase-cnt-'+labelid);
                });  
            }
        });
    }
}

exports.editadjustment = function(req, res, next){
    const adjid = req.params.id;
    const amount = req.body.amount;
    const dbcr = req.body.dbcr;
    const remarks = req.body.remarks; 
    const adminuser = req.body.adminuser;
    const adminuserid = req.body.adminuserid;

    if (!adjid || !amount || !dbcr || !remarks) {
        return res.status(422).json({ success: false, message: 'Posted data is not correct or incompleted.'});
    } else {
        Adjustment.findById(adjid).exec(function(err, adj){
            if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                
            if(adj){
                adj.amount = amount;
                adj.dbcr = dbcr;
                adj.remarks = remarks;
                adj.extfield1 = 'Data edited by user: ' + adminuser+ ' on '+new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') +' \n '+adj.extfield1;
                adj.save(function(err){
                    if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err }); }
                    
                    res.status(201).json({
                        success: true,
                        message: 'Data Adjustment updated successfully'
                    });

                });  
            }
        });
    }
}