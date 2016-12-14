# gulp-aws-stepfunctions-deploy
__Version 0.1.0__


[![Build Status](https://travis-ci.org/YurgenUA/gulp-aws-stepfunctions-deploy.svg?branch=master)](https://github.com/YurgenUA/gulp-aws-stepfunctions-deploy)

[![NPM](https://nodei.co/npm-dl/gulp-aws-stepfunctions-deploy.png?months=3)](https://github.com/YurgenUA/gulp-aws-stepfunctions-deploy/)


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
gulp.task("deploy-step-function", () => {
    return gulp.src("./dir/with/step_functions/*.json")
        .pipe(awssf({}))
    .on( "end", function() { 
            console.log('end ');
        })
    .on( "error", function( err ) {
        console.log( err );
    })

    ;
});
```

### Step Function files

json file format following:

```json
{
  "function_name": "step-function-parallel",
  "recreate": true,
  "role_arn" : "StatesExecutionRole-eu-west-1",
  "function_body": {
      ...
  }
}
```


## Options

**role_arn** *(optional)*

Type: `string`

Set IAM Roled under which function executes. You can either specify desired IAM Role and omit to use pre-created `StatesExecutionRole-${gconfig.region}`


**function_name** *(required)*

Type: `string`

Step Function name.

**recreate** *(optional)*

Type: `bool`

Default is false. If set, code check (and remove) function with name specified, before create new one.

**function_body** *(optional)*

Type: `string`

Function body content


### gulp-aws-stepfunctions-deploy-plugin options

## AWS-SDK References

* [AWS Config Constructor](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property)

----------------------------------------------------

## License

MIT