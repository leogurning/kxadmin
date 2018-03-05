const mongoose = require( 'mongoose' );
const Msconfig = require('../models/masterconfig');
const config = require('../config');

const cloudinary = require('cloudinary');
// Imports the Google Cloud client library
const Storage = require('@google-cloud/storage');

const uploadpath = "kaxet/images/genres/";
const gcsuploadpath = "images/genres/";

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

cloudinary.config({ 
    cloud_name: config.cloud_name, 
    api_key: config.api_key, 
    api_secret: config.api_secret
});

// Creates a client gcp storage
const storage = new Storage({
    projectId: config.GCLOUD_PROJECT
});
const bucket = storage.bucket(config.CLOUD_BUCKET);
var getPublicUrl = function(filename) {
    return `https://storage.googleapis.com/${config.CLOUD_BUCKET}/${gcsuploadpath}${filename}`;
}

exports.genrephotoupload = function(req, res, next){
    var stats;
    const d = new Date();
    const ts = ("0" + d.getDate()).slice(-2) + ("0"+(d.getMonth()+1)).slice(-2) + 
                d.getFullYear() + ("0" + d.getHours()).slice(-2) + 
                ("0" + d.getMinutes()).slice(-2) + ("0" + d.getSeconds()).slice(-2);

    if(req.files.genreimage){
      var file = req.files.genreimage,
        name = ts;
        const gcsname = ts+'-'+file.name;
        const gcsfile = bucket.file(gcsuploadpath+gcsname);
        const stream = gcsfile.createWriteStream({
            metadata: {
              contentType: file.mimetype
            }
          });

        stream.on('error', (err) => {
            file.cloudStorageError = err;
            console.log("Genre Photo Upload Failed", err);
            return res.status(401).json({ success: false, 
                message:'Genre Photo Upload Failed on streaming upload.'
            });      
          });

        stream.on('finish', () => {
            file.cloudStorageObject = gcsname;
            gcsfile.makePublic().then(() => {
                file.cloudStoragePublicUrl = getPublicUrl(gcsname);
                console.log("Genre Photo Uploaded",gcsname);
                res.status(201).json({
                  success: true,
                  message: 'Genre Photo is successfully uploaded.',
                  filedata : {
                        genrephotopath: file.cloudStoragePublicUrl,
                        genrephotoname: file.cloudStorageObject
                    }
                });
                next();
            })
            .catch(err => {
                return res.status(401).json({ success: false, 
                    message:'Genre Photo Upload Failed on making public URL.'
                });      
            });
        });
        
        stream.end(file.data); 
    }    
}

/* exports.genrephotoupload = function(req, res, next){
    var stats;
    const d = new Date();
    const ts = ("0" + d.getDate()).slice(-2) + ("0"+(d.getMonth()+1)).slice(-2) + 
                d.getFullYear() + ("0" + d.getHours()).slice(-2) + 
                ("0" + d.getMinutes()).slice(-2) + ("0" + d.getSeconds()).slice(-2);

    if(req.files.genreimage){
      var file = req.files.genreimage,
        name = ts;
      cloudinary.v2.uploader.upload_stream(
        {public_id: name, folder: uploadpath,invalidate: true,resource_type: 'image'}, 
        function(err, result){
            if(err){
                console.log("Genre Photo Upload Failed", err);
                return res.status(401).json({ success: false, 
                  message:'Genre Photo Upload Failed.'
                });      
            }
            else {
                console.log("Genre Photo Uploaded",name);
                res.status(201).json({
                  success: true,
                  message: 'Genre Photo is successfully uploaded.',
                  filedata : {genrephotopath: result.secure_url,genrephotoname: result.public_id}
                });      
            }
        }).end(file.data);
    } else {
        return res.status(402).json({ success: false, 
            message:'No Genre Photo uploaded.',
            filedata : {genrephotopath: "",genrephotoname: ""}
          });
    };
} */

exports.genrephotodelete = function(req, res, next) {
    const genrephotoname = req.body.genrephotoname;

    if(genrephotoname){
        const gcsfile = bucket.file(gcsuploadpath+genrephotoname);
        gcsfile.delete()
        .then(() => {
            console.log("Delete Genre Photo Success",genrephotoname);
            res.status(201).json({
                success: true,
                message: 'Delete Genre Photo successful.'});    
        })
        .catch(err => {
            console.log("Delete Genre Photo Failed",genrephotoname,err);
            res.status(401).json({ success: false, 
              message:'Delete Genre Photo Failed.'
            });
        });
    }
    else {
        console.log("No File selected !");
        res.status(402).json({
            success: false,
            message: 'No File selected !'});    
    };
}

/* exports.genrephotodelete = function(req, res, next) {
    const genrephotoname = req.body.genrephotoname;

    if(genrephotoname){
        cloudinary.v2.uploader.destroy(genrephotoname,
          {invalidate: true, resource_type: 'image'}, 
        function(err, result){
          if(err){
            console.log("Delete Genre Photo Failed",genrephotoname,err);
            res.status(401).json({ success: false, 
              message:'Delete Genre Photo Failed.'
            });
          }
          else {
            console.log("Delete Genre Photo Success",genrephotoname);
            res.status(201).json({
                success: true,
                message: 'Delete Genre Photo successful.'});    
          }
        });
    }
    else {
        console.log("No File selected !");
        res.status(402).json({
            success: false,
            message: 'No File selected !'});    
    };
} */

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

        }
    }    
}

exports.delmsconfig = function(req, res, next) {
	Msconfig.remove({_id: req.params.id}, function(err){
        if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
        res.status(201).json({
            success: true,
            message: 'Ms Config removed successfully'
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
        // returns artists records based on query
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
        });
    }
}

exports.updatemsconfigfile = function(req, res, next){
    const adminid = req.params.id;
    const msconfigid = req.query.msconfigid;
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

    if(!sortby) {
	    sortby = 'group';
    }
    console.log('process initiated');
    // returns msconfigs records based on query
    query = { code: new RegExp(code,'i'),
              value: new RegExp(value,'i')
            };
    if (group) {
        query = merge(query, {group:group});
    }

    if (status) {
        query = merge(query, {status:status});
    }

    var options = {
        page: page,
        limit: limit,
        sortBy: sortby
    }
    console.log(query);
    var aggregate = Msconfig.aggregate();
    var olookup = {
            from: 'msconfig',
            localField: 'group',
            foreignField: 'code',
            as: 'msconfiggroup'
        };
    var oproject = {
        code:1,
        value: 1,
        group: 1,
        desc:1,
        "groupname": "$msconfiggroup.value",
        filepath:1,
        filename:1,
        status:1
    };
    var ounwind = 'msconfiggroup';
    //var osort = { "$sort": { sortby: 1}};
    aggregate.lookup(olookup).unwind(ounwind);
    aggregate.match(query);
    aggregate.project(oproject);
    //aggregate.sort(osort);

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
        // returns artists records based on query
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
        });
    }
}