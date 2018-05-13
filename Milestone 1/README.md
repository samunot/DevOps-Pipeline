# Project
Spring 2018 CSC 519 Group Project

# CM Milestone:

## [Screencast](https://youtu.be/lXmeRAEcbg8)

## Report

### Ansible

### Experience

Using Ansible to automate the provisioning and configuration of EC2 instances on Amazon Web Services (AWS) was fairly straightforwad.

1. Once you figure out all the dependencies of your server, you can use a handful of modules to automate this process.
2. Managing and dynamically adding new EC2 host keys was easy using modules like `known_hosts` and `add_host`.
3. With the `add_host` module, it allowed an in-memory inventory which was ideal for referencing newly created host in a subsequent play.
4. The support for creating EC2 instances idempotently was lacking. We could create an instance using an `id`, but we could never alter that instance in any way. In this scenario "idempotent" support was simply failed the task if you ever attempted to run the task with different parameters. Complicating matter further, the `id` used could never be used again, even after terminating an instance.

### Issues

1. In some instances, it can be hard to compose the right sequence of tasks in order to install depedencies correctly. This was the case with services like MySQL where the user and password had to be set before installation.
2. Initially it can be difficult to deal with conditional tasks like waiting for an SSH port to be availabe or a service to be started. This may result in confusing stateful logic.


### Jenkins

#### Experience

Overall, it was a great experience working with Jenkins.

1. Once you set you up your projects, one can automate future builds and observe the output of each build.
2. It has an array of plugins which makes everything quite hassle-free such as Jenkins Job Builder plugins to allow the developer to write configuration in more user-friendly YAML format.
3. As it is written in Java, it makes it platform independent.
4. Installation of Jenkins was easy using an Ansible playbook.
5. Jenkins seems to have moved on to the new Pipeline feature along with a `JenkinsFile` instead of simple Projects and Jobs. This made browsing the latest documentation frustrating as it kept referring to the new formats almost exclusively.

#### Issues

Despite the configuration and automation power that Jenkins provided, it had its challenges.

1. Setting git credentials automatically was a challenge. A groovy script was used to make this easier when running the Ansible playbook to prompt user for username and password.
2. Configuring the Jenkins installation was also tricky. The default setup wizard had to stopped by changing some attributes in config files, and security needed to be disabled.
3. Dealing with errors can sometimes be hard to pin point, but can be alleviated with the `-vvvv` option when running the play for extra information.
4. We played around with using Docker to execute the builds in Jenkins. While we did have some success, we didn't have time to integrate it into our final solution. We did end up using docker to run the checkbox.io application on the post-install ec2 instance we created. This minimized the amount of configuration that had to occur on the instance as the configuration was contained within a script file that started all the necessary docker containers.

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
