'use strict';

const gulp = require('gulp');
const jasmine = require('gulp-jasmine');

gulp.task('unit-test', function () {
    return gulp.src([
        './tests/unit/**/*.js'
    ])
        .pipe(jasmine({
            verbose: true,
            includeStackTrace: true
        }))
        .on('error', function (err) {
            throw new Error(err);
        });
});

var awssf = require('./index.js')({});
gulp.task('deploy-step-functions', () => {
    return gulp.src('./samples/step-function-*.json')
        .pipe(awssf({}))
     .on( 'end', function() { 
        console.log('step function deployed');
    })
    .on( 'error', function( err ) {
        console.log( 'step function deployed with error', err );
    })
});
