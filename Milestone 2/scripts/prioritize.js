var fs = require('fs'),
    xml2js = require('xml2js'),
    child = require('child_process');
var parser = new xml2js.Parser(),
    Bluebird = require('bluebird'),
    LineReaderSync = require("line-reader-sync"),
    linebyline = require('line-by-line'),
    path = __dirname;

var columnify = require('columnify')
var buildBase = 'var/lib/jenkins/jobs/iTrustReports/builds'
var testReports = 'surefire-reports'
    // var testReports = 'archive/iTrust2/target/surefire-reports'
calculatePriority();

function readResults(result) {
    var tests = [];
    for (var i = 0; i < result.testsuite['$'].tests; i++) {
        var testcase = result.testsuite.testcase[i];
        tests.push({
            name: testcase['$'].name,
            time: testcase['$'].time,
            status: testcase.hasOwnProperty('failure') ? "failed" : "passed"
        });
    }
    return tests;
}

function sortByFailure(a, b) {
    // failure on top
    if (a.failed > b.failed) {
        return -1;
    }
    if (a.failed < b.failed) {
        return 1
    }
    return sortByTime(a, b);
}

function sortByTime(a, b) {
    // long times on top
    if (a.time > b.time) {
        return -1;
    }
    if (a.time < b.time) {
        return 1;
    }
    return 0;
}

function collectFiles() {
    child.execSync(`find /${buildBase}/*/${testReports} -type f -name '*.xml' > ${path}/tests.txt`);
    lineReader = new LineReaderSync("tests.txt");
    var listOfFiles = lineReader.toLines();
    // console.log("Number of source files edited: " + listOfFiles.length);
    return listOfFiles;
}

async function calculatePriority() {
    var listOfFiles = collectFiles();
    if (listOfFiles.length == 0) {
        return;
    }
    var i = 0
    var testcases = []
    var set = []
    while (i < listOfFiles.length) {
        var file = listOfFiles[i];
        var contents = fs.readFileSync(file)
        let xml2json = await Bluebird.fromCallback(cb => parser.parseString(contents, cb));
        readResults(xml2json).forEach(e => {
            // console.log(e);
            if (!set.includes(e.name)) {
                e.time = parseFloat(e.time);
                e.failed = e.status == "passed" ? 0 : 1
                set.push(e.name);
                testcases.push(e);
            } else {
                var idx = set.indexOf(e.name);
                testcases[idx].time = testcases[idx].time + parseFloat(e.time);
                if (e.status == "failed") {
                    testcases[idx].failed = testcases[idx].failed + 1;
                }
            }
        });
        i++;
    }
    // sort by time first then by # failures (descending so longest / highest failures)
    testcases.sort(sortByFailure);
    // DEBUG
    testcases.forEach(e => {
        e.time = e.time.toFixed(2);
    });
    console.log(columnify(testcases, {
        columns: ['name', 'time', 'failed']
    }));
}