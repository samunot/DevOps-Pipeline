# Project
Spring 2018 CSC 519 Group Project

# Test + Analysis Milestone:

## [Screencast](https://youtu.be/abHUSmj-fVY)

## Report

### Coverage/Jenkins Support

#### Experience

Adding coverage reports for the iTrust project in Jenkins was fairly straightforward. All that was required was a plugin called JaCoCo needed to be installed. When iTrust is built and tested a JaCoCo executable is created which the plugin uses to display the coverage of all the files for each build.

#### Issues

There were no issues with this except figuring out how the plugin was grabbing coverage reports generated from building the project.

### Commit Fuzzer

#### Experience

For fuzzing, a script was written in JavaScript which goes through all the relevant source code and swaps operators such as != or == and commits changes. Once changes were committed, another job was triggered to run the tests to generate the test reports for prioritization analysis. Then the changed files were reset for another fuzz/commit/test cycle.

1. What type of problems do you think the fuzzer discovered?

The fuzzer was able to find redundant test cases.

2. What are some ways fuzzing operations could be extended in the future?

There are lots of fuzzing operations that could be used in the future like: swapping >, <, >=, <= operators with one another, change content of strings or replace with empty string, swapping 0s with 1s and many more.

3. Why do you think those tests were ranked the highest?

A lot of the tests that were ranked the longest running and have the largest amount of failures deal with API* Classes like `testPatientAPI` that test API calls with many inputs or other Classes like `testPreScheduledOfficeVisit` that are creating large Models testing many attributes. These may take some time to run compared to simpler unit tests like `testCodes()` which only tests a small form object with just three attributes.

#### Issues

There were issues compiling the project when fuzzing some operators like >, <, >=, <= so we had to remove these so that the project could compile and be tested. Executing 100 builds took up a lot of space on the ec2 machine so we had to get a bigger machine.

### Test Prioritization

#### Experience

A script was written in JavaScript that goes through every build and its reports. For each testcase the script maintains the stats on its total running time and its total failure count. The two stats for each testcase will update as the script goes through every build's reports. In the end, the testcases are printed sorted by failure and longest total running time.

#### Issues

Once fuzzing was successful, there weren't very many issues with the test prioritization script. The only obstacle was figuring out where the test reports would be and figuring out the attributes of the testcases in the xml report files.

### Test Generation

#### Experience

To generate the tests we used the Esprima ECMAScript parser to parse the checkbox.io source code.
1. We first search for route definitions (e.g. `app.get('/uri/')`).
2. After identifying a route definition we examined the handler functions associated with each route definition, looking for:
    * Parameters expected in the endpoint URIs.
    * Parameters expected as query parameters.
    * Parameters expected as form parameters.
3. After gathering all the parameters for a specific routing definition we generated a list of constraints for the parameters.
4. Using the constraints, we generated permutations of invocations of the endpoints using the `request` module.

We ended up with 26 generated tests. Our code coverage was as follows:

| %     | Stats      |   x/x   |
| -----:| ---------- | -------:|
|71.43% | Statements | 230/322 |
|55.29% | Branches   |   47/85 |
|64.52% | Functions  |   60/93 |
|71.88% | Lines      | 230/320 |

#### Issues

* We had trouble mocking the database in checkbox.io, so we resorted to creating fixtures in an actual mongo db.
* There were some bugs in the checkbox.io code that wasted our time.
   * MONGO_PORT was used incorrectly.
   * Some email settings were hard-coded.
   * The database connection code has a race condition.
* We generated many more testcases initially, but checkbox.io would simply crash if fed bad input. We ended up
  removing most constraints that used 'bad' data, leaving only a few that would fail, but not crash the application.

## Contributions

Shubham incorporated Jenkins coverage reports with JaCoCo plugin, modifed and organized Ansible playbook to create and run jobs to support coverage, fuzzing, committing and testing for iTrust.

Nischal wrote the test prioritization analysis script and helped edit/commentate on the screencast for coverage and fuzz/commits for iTrust.

Luis worked on test generation and testing/coverage for checkbox.io as well as screencasting how that is done.

## Setup

To successfully execute this project you must:

* [Configure your AWS credentials](#configure-aws-credentials)
* [Install Ansible and the dependencies](#install-ansible-and-dependencies) needed by the Ansible modules used by this project.
* Create an EC2 IAM Role named `csc519-jenkins` that has all rights to EC2 and IAM.

The project provides a `Pipfile` that when used with the **Pipenv** utility will
install **Ansible** and its dependencies.

### Configure AWS Credentials

This project provisions an EC2 instance on AWS in order to run Jenkins on it.
You need an AWS account to run our project.

#### ~/.aws/credentials

Add your AWS access key id and secret to the `~/.aws/credentials` file:

```ini
[default]
aws_access_key_id=XXXXXXXXXXXXXXXXXXXX
aws_secret_access_key=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

If you already have some default credentials defined and do not want to clobber
them, define your credentials in a new profile section. For example to add a new
profile named `csc519`, add the following section to your `~/.aws/credentials`
file:

```ini
[profile csc519]
aws_access_key_id=XXXXXXXXXXXXXXXXXXXX
aws_secret_access_key=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

#### ~/.aws/config

Define the default AWS regions to use for your profiles in the `~/.aws/config`
file:

```ini
[default]
region=us-east-1

[csc519]
region=us-east-1
```

### Install Pipenv

**Pipenv** is a tool to manage Python virtual environments. We used it on this
project to ensure that we are all using the same versions of the python
libraries we depend on.

See https://docs.pipenv.org for more information.

#### Install Pipenv on macOS

There are numerous ways to get **pip** and **pipenv** installed on macOS. This
guide should work for most people.

First, see if **pip** is already installed:

```console
$ pip --version
pip 9.0.1 from /Library/Python/2.7/site-packages (python 2.7)
```

If **pip** is not installed, run the following commands to install:

```console
$ curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
$ sudo python get-pip.py
```

Next, use **pip** to install **pipenv**:

```console
$ sudo pip install pipenv
```

### Install Ansible and Dependencies

From the project directory (which contains the `Pipfile` and `Pipfile.lock`
files), run the following command to install **Ansible** and its dependencies:

```console
$ pipenv install
```

To activate the virtual environment:

```console
$ pipenv shell
(project---XxXxXx) $
```

Always run the `ansible-playbook` command from within this virtual environment.
Alternatively, you can run `ansible-playbook` from outside the virtual environment as follows:

```console
$ pipenv run ansible-playbook
```

The `pipenv run` command will activate the virtual environment for the duration of the command.

## Provisioning and Configuring the Jenkins Server

### Set the `unique_id`

Open the `jenkins-defaults.yaml` file. It will contain a commented out
`unique_id` line:

```yaml
---
#unique_id: "0000"
aws:
  ec2:
    ...
```

Uncomment the line, and edit the value:

```yaml
---
unique_id: "my_id_23"
aws:
  ec2:
    ...
```

If you ever need to re-create the Jenkins ec2 instance, you will need to change
the value of `unique_id`. This is due to the rather Draconian definition of
idempotent used by AWS, in which once created, an instance can never be
re-configured.

### Execute the Playbook

Execute the `jenkins.yaml` playbook to provision a server on AWS EC2 and
configure it to run Jenkins:

```console
(project---XxXxXx) $ ansible-playbook jenkins.yaml
```

### SSH Into the Jenkins Server

You can ssh into the Jenkins server as follows:

```console
$ ssh -i aws-private.key ec2-user@111.111.111.111
```

> Locate the ip address of the Jenkins server in either the output of the
> playbook execution, in your `~/.ssh/known_hosts` file, or by execting the
> `ec2.py` script.
