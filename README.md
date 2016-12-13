# gulp-aws-stepfunctions-deploy
__Version 0.0.3__


[![Build Status](https://travis-ci.org/dwyl/aws-sdk-mock.svg?branch=master)](https://github.com/YurgenUA/gulp-aws-stepfunctions-deploy)
[![Dependency Status](https://david-dm.org/dwyl/aws-sdk-mock.svg)](https://github.com/YurgenUA/gulp-aws-stepfunctions-deploy)
[![devDependency Status](https://david-dm.org/dwyl/aws-sdk-mock/dev-status.svg)](https://github.com/YurgenUA/gulp-aws-stepfunctions-deploy#info=devDependencies)

[![NPM](https://nodei.co/npm-dl/aws-sdk-mock.png?months=3)](https://github.com/YurgenUA/gulp-aws-stepfunctions-deploy/)


Package version [history](https://github.com/YurgenUA/gulp-aws-stepfunctions-deploy/blob/master/doku/HISTORY.md)

This package uses the [aws-sdk (node)](http://aws.amazon.com/sdk-for-node-js/).

[NPM](https://www.npmjs.com/package/gulp-aws-stepfunctions-deploy)

## Install

    npm install gulp-aws-stepfunctions-deploy

## Usage

### Including + Setting Up Config

```js
    var gulp = require('gulp');
    var aws-sf = require('gulp-aws-stepfunctions-deploy')(config);
```

...where config is something like...

```js
var config = {
    accessKeyId: "YOURACCESSKEY",
    secretAccessKey: "YOUACCESSSECRET"
}

//  ...or...

var config = JSON.parse(fs.readFileSync('private/awsaccess.json'));

//  ...or to use IAM settings...

var config = { useIAM: true };

// ...or to use IAM ...

var awssf = require('gulp-aws-stepfunctions-deploy')(
    {useIAM:true},
);

// or {} / null

```

The optional `config` argument can include any option available (like `region`) available in the [AWS Config Constructor](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property). By default all settings are undefined. 

**Per AWS best practices**, the recommended approach for loading credentials is to use the shared credentials file (`~/.aws/credentials`). You can also set the `aws_access_key_id` and `aws_secret_access_key` environment variables or specify values directly in the gulpfile via the `accessKeyId` and `secretAccessKey` options.  

If you want to use an AWS profile in your `~/.aws/credentials` file just set
the environment variable AWS_PROFILE with your profile name before invoking
your gulp task:

```sh
AWS_PROFILE=myprofile gulp upload
```

If you are using **IAM** settings, just pass the noted config (`{useIAM:true}`) in order to default to using IAM.  More information on using [IAM settings here](https://aws.amazon.com/documentation/iam/). 

Feel free to also include credentials straight into your `gulpfile.js`, though be careful about committing files with secret credentials in your projects!

Having AWS Key/Secrets may not be required by your AWS/IAM settings.  Errors thrown by the request should give your permission errors.


### Gulp Task

Create a task.

```js
gulp.task("deploy-step-function", function() {
    gulp.src("./dir/with/step_function/*.json")
        .pipe(awssf({
            //ArnRolePrefix //optional
            StepFunctionName: 'STRING_VALUE', //required 
            Recreate: true //optional
        }))
    .on( "end", function() { 
            console.log('end ');
        })
    .on( "error", function( err ) {
        console.log( err );
    })

    ;
});
```


## Options

**ArnRolePrefix** *(optional)*

Type: `string`

Set IAM Roled under which function executes. You can either specify desired IAM Role and omit to use pre-created `StatesExecutionRole-${gconfig.region}`


**StepFunctionName** *(required)*

Type: `string`

Step Function name.

**Recreate** *(optional)*

Type: `bool`

Default is false. If set, code check (and remove) function with name specified, before create new one.

### gulp-aws-stepfunctions-deploy-plugin options

## AWS-SDK References

* [AWS Config Constructor](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property)

----------------------------------------------------

## License

MIT