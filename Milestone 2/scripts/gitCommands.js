const execSync = require('child_process').execSync;
execSync(`git add .`)
var statusOutput = execSync(`git status`)
console.log(statusOutput.toString())
execSync(`git commit -m 'Commit fuzzing'`)
execSync(`rm source_java_files.txt`)
var status = execSync(`cd iTrust2 && sudo mvn compile && echo $?`)
status = status.toString().slice(-4);
console.log(status)
if (status.includes('0')) {
    console.log('waiting...');
    execSync(`java -jar /tmp/jenkins-cli.jar -s http://localhost:8080/ build 'iTrustReports' -s || exit 0`)
}
execSync(`git reset --hard HEAD~1`);