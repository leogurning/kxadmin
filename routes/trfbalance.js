const mongoose = require( 'mongoose' );
const Trfbalance = require('../models/trfbalance');
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

exports.pendingtrfbalancereqagg = function(req, res, next){
    const userid =  req.params.id;
    const labelid =  req.body.labelid || req.query.labelid;
    const status = 'STSPEND';
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
            query = merge(query, {status:status});
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

        var aggregate = Trfbalance.aggregate();  

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
            insref:1,
            bankaccno: 1,
            bankaccname:1,
            bankname: 1,
            requestdt:1,
            status:1,
            "stsvalue": "$msconfigdetails.value"
        };

        aggregate.lookup(olookupc).unwind(ounwindc);
        aggregate.match(query);
        aggregate.lookup(olookuplb).unwind(ounwindlb);

        aggregate.project(oproject);      
        if(!sortby) {
            var osort = { requestdt: -1, label:1};
            aggregate.sort(osort);
        }
        Trfbalance.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
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

exports.updatestatustrfbalance = function(req, res, next){
    const trfbalancereqid = req.params.id;
    const status = req.body.status;
  
    if (!trfbalancereqid || !status) {
        return res.status(422).json({ success: false, message: 'Posted data is not correct or incompleted.'});
    } else {
        Trfbalance.findById(trfbalancereqid).exec(function(err, trfbalancereq){
            if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                
            if(trfbalancereq){
                trfbalancereq.status = status;
                trfbalancereq.remarks = 'rejected by admin on '+new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                trfbalancereq.save(function(err){
                    if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err }); }
                    res.status(201).json({
                      success: true,
                      message: 'Transfer Request updated successfully'
                    });
                    //Delete redis respective keys
                    //rediscli.del('redis-user-pendingsongpurchase-cnt-'+labelid);
                });  
            }
        });
    }
}

exports.gettrfbalancereqagg = function(req, res, next){
    const trfreqid =  req.params.id;
    const msconfiggrp = 'TRFBLSTATUS';
    const msconfigsts = 'STSACT';
  
    if (!trfreqid ) {
        return res.status(202).json({ success: false, message: 'Posted data is not correct or incompleted.'});
	}else{
        // returns songs records based on query
        query = {_id: new mongoose.Types.ObjectId(trfreqid), 
                "msconfigdetails.group": msconfiggrp,
                "msconfigdetails.status": msconfigsts
            };

        var aggregate = Trfbalance.aggregate();  
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
            insref:1,
            bankaccno: 1,
            bankaccname:1,
            bankname: 1,
            requestdt:1,
            status:1,
            "stsvalue": "$msconfigdetails.value",
            transferdt:1,
            transferslippath:1,
            transferslipname:1,
            bankref:1,
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

exports.completetrfbalance = function(req, res, next){
    const trfbalancereqid = req.params.id;
    const bankref = req.body.bankref;
    const transferdt = req.body.transferdt;
    const remarks = req.body.remarks; 
    const status = req.body.status;
    const adminuser = req.body.adminuser;
    const adminuserid = req.body.adminuserid;
    const trfdt = new Date(transferdt);

    if (!trfbalancereqid || !bankref || !transferdt || !status) {
        return res.status(422).json({ success: false, message: 'Posted data is not correct or incompleted.'});
    } else {
        Trfbalance.findById(trfbalancereqid).exec(function(err, trfbalancereq){
            if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                
            if(trfbalancereq){
                trfdt.setDate(trfdt.getDate());
                trfdt.setHours(23,59,59);
                let labelid = trfbalancereq.labelid;
                let amount = trfbalancereq.amount;
                trfbalancereq.bankref = bankref;
                trfbalancereq.transferdt = trfdt;
                trfbalancereq.status = status;
                trfbalancereq.remarks = remarks;
                trfbalancereq.extfield1 = 'compeleted by user: ' + adminuser+ ' on '+new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')+ '. Userid: '+ adminuserid;
                trfbalancereq.save(function(err){
                    if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err }); }
                    let oTransaction = new Transaction({
                        labelid: labelid,
                        purchaseid: bankref,
                        producttype: 'BANK TRANSFER',
                        dbcr: '-',
                        amount: amount,
                        transactiondt: trfdt,
                        objlabelid: labelid,
                        //objpurchaseid: bankref
                    });
            
                    oTransaction.save(function(err) {
                        if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                            
                        res.status(201).json({
                            success: true,
                            message: 'Transfer Request updated successfully'
                          });
                        //Delete redis respective keys
                        //rediscli.del('redis-user-songpurchase-'+labelid, 'redis-user-songpurchasecnt-'+labelid);
                    });
                });  
            }
        });
    }
}

exports.trfbalancereqagg = function(req, res, next){
    const userid =  req.params.id;
    const labelid =  req.body.labelid || req.query.labelid;
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

        
        query = merge(query, {status:{ $ne: 'STSPEND' }});
        console.log(query);

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

        var aggregate = Trfbalance.aggregate();  

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
            insref:1,
            bankaccno: 1,
            bankaccname:1,
            bankname: 1,
            requestdt:1,
            status:1,
            "stsvalue": "$msconfigdetails.value"
        };

        aggregate.lookup(olookupc).unwind(ounwindc);
        aggregate.match(query);
        aggregate.lookup(olookuplb).unwind(ounwindlb);

        aggregate.project(oproject);      
        if(!sortby) {
            var osort = { requestdt: -1, label:1};
            aggregate.sort(osort);
        }
        Trfbalance.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
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

exports.editposttrfbalance = function(req, res, next){
    const trfbalancereqid = req.params.id;
    const bankref = req.body.bankref;
    const transferdt = req.body.transferdt;
    const remarks = req.body.remarks; 
    const adminuser = req.body.adminuser;
    const adminuserid = req.body.adminuserid;
    const trfdt = new Date(transferdt);

    if (!trfbalancereqid || !bankref || !transferdt) {
        return res.status(422).json({ success: false, message: 'Posted data is not correct or incompleted.'});
    } else {
        Trfbalance.findById(trfbalancereqid).exec(function(err, trfbalancereq){
            if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                
            if(trfbalancereq){
                trfdt.setDate(trfdt.getDate());
                trfdt.setHours(23,59,59);
                trfbalancereq.bankref = bankref;
                trfbalancereq.transferdt = trfdt;
                trfbalancereq.remarks = remarks;
                trfbalancereq.extfield1 = 'Data edited by user: ' + adminuser+ ' on '+new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')+ '. Userid: '+ adminuserid +'\n'+trfbalancereq.extfield1;
                trfbalancereq.save(function(err){
                    if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err }); }
                    
                    res.status(201).json({
                        success: true,
                        message: 'Data Transfer Request updated successfully'
                    });

                });  
            }
        });
    }
}