var fs = require('fs');
var gulp = require('gulp');
var shell = require('gulp-shell');
// var ts = require("gulp-typescript");
var merge = require('merge-stream');
var browserify = require('browserify');
const tsify = require('tsify');

var version = '0.0.1';
if (fs.existsSync("../VERSION")) {
    version = fs.readFileSync("../VERSION", 'utf8');
} else if (fs.existsSync("VERSION")) {
    version = fs.readFileSync("VERSION", 'utf8');
}
var copyfiles = ["./src/public/**/*.html", "./src/public/**/*.css", "./src/public/**/*.js", "./src/public/**/*.json",
    "./src/public/**/*.ico", "./src/public/**/*.eot", "./src/public/**/*.svg", "./src/public/**/*.ttf", "./src/public/**/*.woff"];

// var copyopenflowfiles = ["./node_modules/openflow-api/lib/browser/**/*.js", "./node_modules/common.js/client/common.js"];
var copyopenflowfiles = ["./node_modules/@openiap/openflow-api/lib/openflow-api.js"];

var destination = './dist/public';
gulp.task('copyfiles', function () {
    var web = gulp.src(copyfiles).pipe(gulp.dest(destination));
    var source = gulp.src(["./src/**/*.ts"]).pipe(gulp.dest(destination + "/src/"));
    var version = gulp.src('./VERSION').pipe(gulp.dest("./dist"));
    // var openflow = gulp.src(copyopenflowfiles).pipe(gulp.dest(destination + "/openflowapi/"));
    var openflow = gulp.src(copyopenflowfiles).pipe(gulp.dest(destination));
    return merge(web, source, version, openflow);
});
gulp.task('browserify', function () {
    // var bfi = browserify({
    //     entries: ['./src/public/app.ts'],
    //     debug: true,
    //     basedir: '.'
    // })
    //     .plugin(tsify, { noImplicitAny: false })
    // var files = ['./dist/public/app.js', './dist/public/app.js', './dist/public/CommonControllers.js', './dist/public/Controllers.js', './dist/public/Entities.js', './dist/public/WebSocketClientService.js'];
    // var bfi = browserify({
    //     entries: files,
    //     debug: true
    // })
    try {
        var bfi = browserify({
            entries: ['./src/public/app.ts'],
            debug: true,
            basedir: '.'
        })
            .plugin(tsify, { noImplicitAny: false })
            .bundle()
            .pipe(fs.createWriteStream('./dist/public/bundle.js'));
        return bfi;
    } catch (error) {
        console.error(error);
        return gulp.src('.')
    }
});

gulp.task("watch", function () {
    var web = gulp.watch(copyfiles.concat('./VERSION').concat("./src/**/*.ts").concat(copyopenflowfiles), gulp.series("copyfiles", "tsc", "browserify"));
    return web;
});

// 'tsc -p tsconfig.json',
gulp.task('tsc', shell.task([
]));
gulp.task('default', gulp.series('copyfiles', "tsc", "browserify", 'watch'));

// 'tsc -p tsconfig.json',
gulp.task('compose', shell.task([
    'gulp copyfiles',
    'echo "compile"',
    'echo "Build dockerhubname/tag"',
    'docker build -t dockerhubname/tag:edge .',
    'docker tag dockerhubname/tag:edge dockerhubname/tag:' + version,
    'echo "Push dockerhubname/tag"',
    'docker push dockerhubname/tag:' + version
]));