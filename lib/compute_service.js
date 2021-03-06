var Promise = require('bluebird').Promise;
var path    = require('path');
var ec2     = require(path.join(__dirname, 'aws')).ec2;

/**
 * Class that manages running instances
 *
 */
function ComputeService () {}

ComputeService.prototype.startInstance = function(token, container_uri, type, vars, port) {
  return new Promise(function(resolve, reject) {

    // Grab the latest rippled testnet image
    var params = {
      Owners: ['self']
    };

    ec2.describeImagesAsync(params).then(function(data) {
      var rippled_image;
      for (var i=0; i<data.Images.length; i++) {
        // var name_prefix = 'rippled-testnet-{{tag}}';
        var name_prefix = 'rippled testnet ';
        if (name_prefix===data.Images[i].Name.slice(0, name_prefix.length)) {
          if (!rippled_image || 
              rippled_image.Name.slice(name_prefix.length) < data.Images[i].Name.slice(name_prefix.length)) {
            rippled_image = data.Images[i];
          }
        }
      }

      console.log('Starting instance of', rippled_image.Name);

      // Start the instance
      var params = {
        ImageId: rippled_image.ImageId,
        InstanceType: 'm1.small',
        MinCount: 1, MaxCount: 1,
    // TODO: Change these
        KeyName: 'bwilson',
        SecurityGroups: [
          'dummy-test',
        ],
        UserData: new Buffer('rippled_version: '+container_uri).toString('base64')
      };

      return ec2.runInstancesAsync(params);
    }).then(function(data) {
      var instance = {
        token: token,
        state: data.Instances[0].State.Name,
        ip_address: data.Instances[0].PrivateIpAddress,
        container_uri: container_uri
      }
      
      console.log("Created instance", data.Instances[0].InstanceId);

      // Tag instance with token
      var params = {
        Resources: [data.Instances[0].InstanceId],
        Tags: [{ Key: 'token', Value: token }]
      };
      return ec2.createTagsAsync(params).then(function() {
        return resolve(instance);
      });
    }).error(reject);
  });
};

ComputeService.prototype.getInstances = function() {}

ComputeService.prototype.getInstance = function(token) {}

ComputeService.prototype.stopInstance = function(token) {}

module.exports = ComputeService;