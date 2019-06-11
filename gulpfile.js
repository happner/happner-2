var gulp = require('gulp');
var jshint = require('gulp-jshint');

var lintSrc = [
 './lib/**/*.js',
 './test/**/*.js',
 './index.js'
];

gulp.task('lint', function () {
 return gulp.src(lintSrc, {allowEmpty: true})
   .pipe(jshint({ esversion: 6 }))
   .pipe(jshint.reporter('default'));
});
