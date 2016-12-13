'use strict';

const gulp = require('gulp');

gulp.task('unit-testing', function () {
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