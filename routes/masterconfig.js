const mongoose = require( 'mongoose' );
const Msconfig = require('../models/masterconfig');
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

exports.savemsconfig = function(req, res, next){
    const adminid = req.params.id;
    const code = req.body.code;
    const value = req.body.value;
    const group = req.body.group;
    const desc = req.body.desc;
    const filepath = req.body.filepath;
    const filename = req.body.filename;
    const status = req.body.status;
    const msconfigid = req.body.msconfigid;

    if (!adminid || !code || !value) {
        return res.status(422).send({ success: false, message: 'Main posted data is not correct or incompleted.' });
    } else {
		
        if (msconfigid) {
            //Edit config
            Msconfig.findById(msconfigid).exec(function(err, msconfig){
                if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                    
                if(msconfig) {
                    msconfig.value = value;
                    msconfig.group = group;
                    msconfig.desc = desc;
                    msconfig.status = status;
                    msconfig.lastupdate = new Date();
                    msconfig.updateby = adminid;
                    msconfig.objupdateby = adminid;                
                }
                msconfig.save(function(err) {
                    if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                    res.status(201).json({
                        success: true,
                        message: 'CONFIG updated successfully'
                    });
                    //Delete redis respective keys
                    rediscli.del('redis-'+group+'-grp',
                                 'redis-lis-'+group+'-grp', 
                                 'redis-'+code+group,
                                 'redis-lis-'+code+group,
                                 'redis-'+group+'ROOT');
                });
            });

        }else {
            // Add new config

            let Omsconfig = new Msconfig({
                code: code,
                value: value,
                group: group,
                desc: desc,
                filepath: filepath,
                filename: filename,
                status: status,
                createddt: new Date(),
                lastupdate: new Date(),
                updateby: adminid,
                objupdateby: adminid
            });

            Omsconfig.save(function(err) {
                if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                    
                res.status(201).json({
                    success: true,
                    message: 'Ms Config saved successfully'
                    });
                });
                //Delete redis respective keys
                rediscli.del('redis-'+group+'-grp',
                            'redis-lis-'+group+'-grp', 
                            'redis-'+code+group,
                            'redis-lis-'+code+group, 
                            'redis-'+group+'ROOT');
        }
    }    
}

exports.delmsconfig = function(req, res, next) {
    const msconfigid = req.params.id;
    
    //Edit config
    Msconfig.findById(msconfigid).exec(function(err, msconfig){ 
        if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
        
        if(msconfig) {
            let code = msconfig.code;
            let group = msconfig.group;
            //Delete redis respective keys
            rediscli.del('redis-'+group+'-grp', 
                        'redis-lis-'+group+'-grp', 
                        'redis-'+code+group, 
                        'redis-lis-'+code+group, 
                        'redis-'+group+'ROOT');
        }
        Msconfig.remove({_id: msconfigid}, function(err){
            if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
            res.status(201).json({
                success: true,
                message: 'Ms Config removed successfully'
            });
        });
    });
}

exports.getmsconfig = function(req, res, next){
	Msconfig.find({_id:req.params.id}).exec(function(err, msconfig){
        if(err) { 
            res.status(400).json({ success: false, message:'Error processing request '+ err }); 
        }
        res.status(201).json({
		    success: true, 
		    data: msconfig
	    });
    });
}

exports.getmsconfigbygroup = function(req, res, next){
    const group = req.params.group;
    const status = 'STSACT';
    const sortby = 'code';
    let query = {};

    if (!group) {
        return res.status(422).send({ error: 'Parameter data is not correct or incompleted.'});
    }else{
        let keyredis = 'redis-'+group+'-grp';
        //check on redis
        rediscli.get(keyredis, function(error,obj) {
            if (obj) {
                //console.log('key on redis..');
                res.status(201).json({
                    success: true, 
                    data: JSON.parse(obj)
                });                
            }else {
                //console.log('key not on redis..');
                // returns config records based on query
                query = { group:group, status: status};        
                var fields = { 
                    _id:0,
                    code:1, 
                    value:1 
                };

                var psort = { code: 1 };

                Msconfig.find(query, fields).sort(psort).exec(function(err, result) {
                    if(err) { 
                        res.status(400).json({ success: false, message:'Error processing request '+ err }); 
                    } 
                    res.status(201).json({
                        success: true, 
                        data: result
                    });
                    //set in redis
                    rediscli.set(keyredis,JSON.stringify(result), function(error) {
                        if (error) { throw error; }
                    });                    
                });
            }
        });
    }
}

exports.updatemsconfigfile = function(req, res, next){
    const adminid = req.params.id;
    const msconfigid = req.body.msconfigid;
    const filepath = req.body.filepath;
    const filename = req.body.filename;

    if (!adminid || !msconfigid) {
        return res.status(422).json({ success: false, message: 'Posted data is not correct or incompleted.'});
    } else {
	Msconfig.findById(msconfigid).exec(function(err, msconfig){
		if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
			
		if(msconfig){
            msconfig.filepath = filepath;
            msconfig.filename = filename;
            msconfig.lastupdate = new Date();
            msconfig.updateby = adminid;
            msconfig.objupdateby = adminid;
            let code = msconfig.code;
            let group = msconfig.group;
            //Delete redis respective keys
            rediscli.del('redis-'+code+group,'redis-lis-'+code+group);                
		}
		msconfig.save(function(err){
			if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err }); }
			res.status(201).json({
				success: true,
				message: 'Ms Config file details updated successfully'
			});
        });
	});
   }
}

exports.msconfigaggregate = function(req, res, next){
    const code = req.body.code || req.query.code;
    const value = req.body.value || req.query.value;
    const group = req.body.group || req.query.group;
    const status = req.body.status || req.query.status;
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

/*     if(!sortby) {
	    sortby = 'group';
    } */
    console.log('process initiated');
    // returns msconfigs records based on query
    query = { code: new RegExp(code,'i'),
              value: new RegExp(value,'i'),
              "msconfigsts.status": 'STSACT',
              "msconfigsts.group": 'CSTATUS'
            };
    if (group) {
        query = merge(query, {group:group});
    }

    if (status) {
        query = merge(query, {status:status});
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
    console.log(query);
    var aggregate = Msconfig.aggregate();
    var olookup = {
            from: 'msconfig',
            localField: 'group',
            foreignField: 'code',
            as: 'msconfiggroup'
        };
    var olookup1 = {
            from: 'msconfig',
            localField: 'status',
            foreignField: 'code',
            as: 'msconfigsts'
        };        
    var oproject = {
        code:1,
        value: 1,
        group: 1,
        desc:1,
        "groupname": "$msconfiggroup.value",
        filepath:1,
        filename:1,
        status:1,
        "stsvalue": "$msconfigsts.value"
    };
    var ounwind = 'msconfiggroup';
    var ounwind1 = 'msconfigsts';
    var osort = { group:1, code:1 };
    aggregate.lookup(olookup1).unwind(ounwind1).match(query);
    aggregate.lookup(olookup).unwind(ounwind);
    aggregate.project(oproject);
    if(!sortby) {
        aggregate.sort(osort);
    }
    Msconfig.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
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

exports.getmsconfigaggregate = function(req, res, next){
    
    const msconfigid = new mongoose.Types.ObjectId(req.params.id);
    let query = {};
    
    if (!msconfigid) {
        return res.status(422).send({ error: 'Parameter data is not correct or incompleted.'});
    }else{
        query = { _id:msconfigid };
    }     
  
    var aggregate = Msconfig.aggregate();
    var olookup = {
        from: 'msconfig',
        localField: 'group',
        foreignField: 'code',
        as: 'msconfiggroup'
    };
    var olookup1 = {
      from: 'user',
      localField: 'objupdateby',
      foreignField: '_id',
      as: 'userdetails'
    };
    var ounwind = 'msconfiggroup';
    var ounwind1 = 'userdetails';
  
    var oproject = { 
        _id:1,
        code:1,
        value:1,
        group:1,
        desc: 1,
        "groupname": "$msconfiggroup.value",
        "username": "$userdetails.name",
        filepath:1,
        filename:1,
        status:1,
        lastupdate:1,
        updateby:1,
        objupdateby:1,
      };
        
    aggregate.match(query).lookup(olookup).unwind(ounwind);
    aggregate.lookup(olookup1).unwind(ounwind1);  
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
    });  
}

exports.getmsconfigvalue = function(req, res, next){
    const code = req.params.code;
    const group = req.query.group;
    const status = 'STSACT';
    const sortby = 'code';
    let query = {};

    if (!code || !group) {
        return res.status(422).send({ error: 'Parameter data is not correct or incompleted.'});
    }else{
        let keyredis = 'redis-'+code+group;
        //check on redis
        rediscli.get(keyredis, function(error,obj) { 
            if (obj) {
                //console.log('key on redis...');
                res.status(201).json({
                    success: true, 
                    data: JSON.parse(obj)
                }); 
            } else {
                //console.log('key NOT on redis...');
                // returns config value records based on query
                query = { code:code, group:group, status: status};        
                var fields = { 
                    _id:0,
                    code:1, 
                    value:1 
                };

                var psort = { code: 1 };

                Msconfig.find(query, fields).sort(psort).exec(function(err, result) {
                    if(err) { 
                        res.status(400).json({ success: false, message:'Error processing request '+ err }); 
                    } 
                    res.status(201).json({
                        success: true, 
                        data: result
                    });
                    //set in redis
                    rediscli.set(keyredis,JSON.stringify(result), function(error) {
                        if (error) { throw error; }
                    });                    
                });
            }
        });
    }
}
exports.getmsconfiggroup = function(req, res, next){

    const group = 'GROUP';
    const root = 'ROOT';
    const status = 'STSACT';
    const sortby = 'code';
    let query = {};

    let keyredis = 'redis-'+group+root;
    rediscli.get(keyredis, function(error,obj) { 
        if (obj) {
            //console.log('key on redis...');
            res.status(201).json({
                success: true, 
                data: JSON.parse(obj)
            });         
        } else {
            //console.log('key NOT on redis...');
            // returns config group records based on query
            query = { $or:[{group:group},{group:root}], status: status};
            var fields = { 
                _id:0,
                code:1, 
                value:1 
            };

            var psort = { code: 1 };

            Msconfig.find(query, fields).sort(psort).exec(function(err, result) {
                if(err) { 
                    res.status(400).json({ success: false, message:'Error processing request '+ err }); 
                } 
                res.status(201).json({
                    success: true, 
                    data: result
                });
                //set in redis
                rediscli.set(keyredis,JSON.stringify(result), function(error) {
                    if (error) { throw error; }
                });                    
            });
        }    
    });
}