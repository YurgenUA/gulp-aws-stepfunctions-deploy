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