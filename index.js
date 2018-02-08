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
    const allowedEscape = 'allowedEscape';

    if (!deploy_options_copy.recreate){
        return Promise.resolve();
    }

    //check if such step function is already exists
    return new Promise((resolve, reject) => {
        stepfunctions.listStateMachines({}, function (err, data) {
            if (err) {
                return reject(`StepFunctions listStateMachines Error:${err}\n${err.stack}`);
            }
            else
                var existingMachine = _.find(data.stateMachines, it => { return it.name == deploy_options_copy.function_name })
            if (!existingMachine)
                return reject(allowedEscape);
            else
                return resolve(existingMachine.stateMachineArn);
        });
    })
    //collect all running executions for state machine and delete them
    .then(existingMachineArn => {
        let promises = [];
        return new Promise((resolve, reject) => {
                stepfunctions.listExecutions({ stateMachineArn: existingMachineArn, statusFilter: 'RUNNING' }, (err, data) => {
                    if (err){
                        return reject("StepFunctions listExecutions Error: " + err.stack);
                    }
                    data.executions.forEach(it => promises.push( 
                            new Promise((res2, rej2) => {
                                stepfunctions.stopExecution( {executionArn: it.executionArn, cause: 're-deployment'}, (err, data) => {
                                    if (err) {
                                        console.log(err, err.stack);
                                        return rej2(err);
                                    }
                                    res2();
                                })
                            }) 
                    ));
                    return resolve(existingMachineArn);
                })
            })
            .then(existingMachineArn => {
                if(promises.length == 0){
                    return existingMachineArn;
                }

                return Promise.all(promises)
                .then(() => {
                    return existingMachineArn;
                })
            });

    })
    //delete state machine itself
    .then(existingMachineArn => {
        return new Promise((resolve, reject) => {
                stepfunctions.deleteStateMachine({ stateMachineArn: existingMachineArn }, function (err, data) {
                    if (err)
                        return reject("StepFunctions deleteStateMachine Error: " + err.stack);
                    else
                        //state_machine is in deleting state for some time, so need to wait
                        setTimeout(() => {
                            return resolve();
                        }, 60000);
                });

        })
    })
    .catch(err => {
        if (err === allowedEscape){
            return Promise.resolve();
        }
        return Promise.reject(new gutil.PluginError(PLUGIN_NAME, "Error: " + err));
    });

}


var _deploy_state_machine = function (deploy_options, existing_state_machines) {
    let deploy_options_copy = deploy_options;

    return new Promise((resolve, reject) => {
        if (!deploy_options_copy.function_body) {
            return reject(new gutil.PluginError(PLUGIN_NAME, 'Specified Step Function json file not found :('));
        }

        let stepfunctions = new AWS.StepFunctions();
        let deployed_state_machine = existing_state_machines.find(x => x.name ===  deploy_options.function_name);
        if (deployed_state_machine){
            var params = {
                stateMachineArn: deployed_state_machine.arn,
                definition: deploy_options_copy.function_body
            }
            stepfunctions.updateStateMachine(params, function (err, data) {
                if (err) {
                    return reject("StepFunctions createStateMachine Error: " + err.stack);
                }
                else
                    return resolve(data);
            });
        }
        else {
            var params = {
                definition: deploy_options_copy.function_body,
                name: deploy_options.function_name,
                roleArn: deploy_options_copy.role_arn
            };
            stepfunctions.createStateMachine(params, function (err, data) {
                if (err) {
                    return reject("StepFunctions createStateMachine Error: " + err.stack);
                }
                else
                    return resolve(data);
            });
        }
    });
}

var _list_state_machines = function () {
    return new Promise((resolve, reject) => {

        let stepfunctions = new AWS.StepFunctions();
        stepfunctions.listStateMachines({}, function (err, data) {
            if (err) {
                return reject("StepFunctions listStateMachines Error: " + err.stack);
            }
            else
                return resolve(data.stateMachines.map(x => {return {name: x.name, arn: x.stateMachineArn}}));
        });
    });
    
}

var _deploy = function (options) {

    let sf_files = [];

    return through.obj((file, enc, cb) => {

        if (file.isNull()) {
            return cb();
        }
        if (file.isStream()) {
            return cb(new gutil.PluginError(PLUGIN_NAME, 'Streaming is not supported'));
        }
        sf_files.push(file);
        cb();

    }, cb => {

        let promises = [];
        //iterating over sf_files array
        sf_files.forEach(it => {
            promises.push(new Promise((resolve, reject) => {
                let jsoned_file = JSON.parse(it._contents.toString());
                let role_arn = jsoned_file.role_arn || `StatesExecutionRole-${gconfig.region}`;
                let recreate = jsoned_file.recreate || false;
                let deploy_options = {
                    function_body: eval('`'+ JSON.stringify(jsoned_file.function_body) +'`'),
                    function_name: eval('`'+ jsoned_file.function_name +'`'),
                    recreate: recreate,
                    role_arn: eval('`'+ role_arn +'`'),
                };
                let existing_state_machines;

                return _remove_state_machine(deploy_options)
                    .then(() => {
                        return _list_state_machines();
                    })
                    .then((data) => {
                        existing_state_machines = data;
                        return _get_iam_role(deploy_options.role_arn);
                    })
                    .then(arn => {
                        deploy_options.role_arn = arn;
                        return _deploy_state_machine(deploy_options, existing_state_machines);
                    }).then((res) => {
                        console.log('State Machine result:' + JSON.stringify(res));
                        return resolve(null);
                    })

                    .catch(err => {
                       return reject(new gutil.PluginError(PLUGIN_NAME, "Error: " + err));
                    });
            }));

        });

        return Promise.all(promises)
        .then(() => {
            console.log('All Step Functions manipulation process finished without errors!');
            return cb(null);
        })
        .catch(err => {
            console.log('Some Step Functions manipulation process failed');
            return cb(err);

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
