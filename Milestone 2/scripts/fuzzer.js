var fs = require("fs"),
    slash = require('slash'),
    LineReaderSync = require("line-reader-sync"),
    linebyline = require('line-by-line'),
    path = slash(__dirname);

const execSync = require('child_process').execSync;
var itrust = slash("iTrust2/src/main/java/edu/ncsu/csc/itrust2");

function fuzzRandomFiles() {
    execSync(`find ${path}/${itrust} -type f -name '*.java' > ${path}/source_java_files.txt`);
    lineReader = new LineReaderSync("source_java_files.txt");
    var listOfFiles = lineReader.toLines();
    if (listOfFiles.length == 0) {
        return;
    }

    var i = 0
    while (i < listOfFiles.length) {
        var chance = Math.random() >= 0.50;
        if (chance) {
            console.log(listOfFiles[i]);
            if (listOfFiles[i].toLowerCase().includes("models")) {
                i++;
                continue;
            }
            editFile(listOfFiles[i]);
        }
        i++;
    }
}

function editFile(file) {
    var content = "";
    var file = file.replace(/\n|\r/g, "");
    lineReader = new linebyline(file, {
        encoding: 'utf8',
        skipEmptyLines: false
    });

    lineReader.on('error', function(err) {
        console.log(err + "\nError in file: " + file);
    });

    lineReader.on('line', function(line) {
        var temp = line;
        var chance = Math.random() >= 0.6;
        if (chance) {
            if (temp.includes("username") || temp.includes("password")) {
                // continue;
            } else {
                if (temp.includes("==")) {
                    temp = temp.replace(/==/g, '!=');
                } else if (temp.includes("!=")) {
                    temp = temp.replace(/!=/g, '==');
                }
            }

        }

        line = temp;
        content += line + "\n";
    });

    lineReader.on('end', function() {
        fs.writeFileSync(file, content);
    });
}


fuzzRandomFiles();