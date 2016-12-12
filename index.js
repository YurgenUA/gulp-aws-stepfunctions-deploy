'use strict'
/****
    gulp-aws-stepfunctions-deploy
    gulp plugin for uploading Step Functions to the AWS
****/

const gutil = require('gulp-util');
const AWS = require('aws-sdk');
const path = require('path');
const _ = require('underscore');
const through = require('through2');
const PluginError = gutil.PluginError;

let gulpPrefixer;

const PLUGIN_NAME = 'gulp-aws-stepfunctions-deploy';

let gconfig;

var _get_iam_role = function (arn_role_prefix) {
    let arn_role_prefix_copy = arn_role_prefix;
    return new Promise((resolve, reject) => {
        var params = {
            RoleName: arn_role_prefix_copy
        };
        let iam = new AWS.IAM();
        iam.getRole(params, function (err, data) {
            if (err)
                reject(err);
            else
                resolve(data.Role.Arn);
        });
    });
}

var _remove_state_machine = function (deploy_options) {
    let deploy_options_copy = deploy_options;
    let stepfunctions = new AWS.StepFunctions();
    return new Promise((resolve, reject) => {
        if (!deploy_options_copy.recreate)
            return resolve();

        return new Promise((res, rej) => {
            stepfunctions.listStateMachines({}, function (err, data) {
                if (err) {
                    return rej("StepFunctions listStateMachines Error: " + err.stack);
                }
                else
                var existingMachine = _.find(data.stateMachines, it => {return it.name == deploy_options_copy.function_name})
                if (!existingMachine)
                    return res();
                else
                    return res(existingMachine.stateMachineArn);
            });
        })
        .then((existingMachineArn) => {
            if (!existingMachineArn){
                return resolve();
            }
            else{
                stepfunctions.deleteStateMachine({stateMachineArn: existingMachineArn}, function(err, data) {
                if (err) 
                    return reject("StepFunctions deleteStateMachine Error: " + err.stack);
                else
                    //state_machine is in deleting state for some time, so need to wait
                    setTimeout(() => {
                        return resolve();
                    }, 60000);
                });

            }
        })

    });
}


var _deploy_state_machine = function (deploy_options) {
    let deploy_options_copy = deploy_options;

    return new Promise((resolve, reject) => {
        if (!deploy_options_copy.file){
            return reject(new gutil.PluginError(PLUGIN_NAME, 'Specified Step Function json file not found :('));
        }

        var params = {
            definition: deploy_options_copy.file._contents.toString() ,
            name: deploy_options.function_name,
            roleArn: deploy_options_copy.role_arn
        };
        let stepfunctions = new AWS.StepFunctions();
        stepfunctions.createStateMachine(params, function (err, data) {
            if (err) {
                return reject("StepFunctions createStateMachine Error: " + err.stack);
            }
            else
                return resolve(data);
        });
    });
}

var _deploy = function (options) {

    let arn_role_prefix = options.ArnRolePrefix || `StatesExecutionRole-${gconfig.region}`;
    
    if (!_.has(options, 'Recreate') && !options.Recreate) {
        options.Recreate = false;
    }
    

    let step_function_name = options.StepFunctionName;

    let sf_file;

    return through.obj((file, enc, cb) => {

        if (file.isNull()) {
            return cb();
        }
        if (file.isStream()) {
            return cb(new gutil.PluginError(PLUGIN_NAME, 'Streaming is not supported'));
        }
        if (!sf_file) {
            sf_file = file;
        }
        cb();

    }, cb => {
        let deploy_options = {file: sf_file, function_name: step_function_name, recreate: options.Recreate};

        return _remove_state_machine(deploy_options)
            .then(() =>{
                return _get_iam_role(arn_role_prefix);
            })
            .then(arn => {
                deploy_options.role_arn = arn; 
                return _deploy_state_machine(deploy_options)
            }).then((res) => {
                console.log('State Machine result:' + JSON.stringify(res));
                return cb(null);
            })

            .catch(err => {
                return cb(new gutil.PluginError(PLUGIN_NAME, "Error: " + err));
            });

    });
}


// ===== EXPORTING MAIN PLUGIN FUNCTION =====
// `config` now takes the paramters from the AWS-SDK constructor:
// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property

module.exports = function (config) {
    var aws_config = {};

    if (_.isUndefined(config)) {
        config = {};
    }

    //  If using IAM
    if (_.has(config, 'useIAM') && config.useIAM) {
        config = {};
    }

    if (!_.has(config, 'region') && !config.region) {
        config.region = 'eu-west-1';
    }


    //  Intentionally not mandating the accessKeyId and secretAccessKey as they
    //  will be loaded automatically by the SDK from either environment variables
    //  or the credentials file.
    //  http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html

    // Configure the proxy if an environment variable is present.

    if (process.env.HTTPS_PROXY) {
        gutil.log("Setting https proxy to %s", process.env.HTTPS_PROXY);

        if (!aws_config.httpOptions) {
            aws_config.httpOptions = {};
        }

        var HttpsProxyAgent = require('https-proxy-agent');

        aws_config.httpOptions.agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
    }

    //  Update the global AWS config if we have any overrides
    AWS.config.update(_.extend({}, config, aws_config));

    gconfig = config;
    return _deploy;
};
