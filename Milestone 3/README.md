# Milestone: DEPLOYMENT



### Components

Our production infrastructure and deployment pipeline support the following properties. Here we describe how we accomplished each of the components.

* **Deployment + Rolling Update:**

For our deployment strategy, we first kick off the `jenkins.yaml` ansible [script](Deployment_RollingUpdate/jenkins.yaml) that deploys and provisions iTrust and checkbox.io on ec2 instances. In our demo, we show how Jenkins has been automatically configured for each project such that the build is triggered by a change of code to branch `production` by selecting the 'Polling SCM' option (more on this later). This option provided by the Github plugin allows Jenkins to periodically check if the project has been updated to our repo and trigger build accordingly. Note that initially, when the `jenkins.yaml` ansible script finishes, we have deployed several instances of iTrust and one of checkbox.io.

1. iTrust + MySQL

Referring back to the Deployment strategy described earlier, the `jenkins.yaml` ansible [script](Deployment_RollingUpdate/jenkins.yaml) had deployed 5 ec2 instances of iTrust using the `create-iTrust-servers.yml` ansible [script](Deployment_RollingUpdate/scripts/create-iTrust-servers.yml) and 1 ec2 instance for our MySQL using the `mysql-configure.yml` ansible [script](Deployment_RollingUpdate/scripts/mysql-configure.yml). Only a single instance of a MySQL server is being used by all of the application instances. The iTrust instances can talk to one instance of a MySQL server by configuring MySQL to allow connections from the iTrust servers.

This is the overall architecture for rolling update to work:

![deploy and reploy](https://github.ncsu.edu/itrust-no-one/project/blob/milestone3/Deployment_RollingUpdate/imgs/deploy_reploy.png?raw=true)

Jenkins polls the application repository for changes and triggers builds. Once builds are successful, it deploys or reploys into ec2 instances. The iTrust instances will still be able to connect to the MySQL instance. Jenkins also has access to the MySQL instance, which Jenkins uses to do the `mvn` commands like `mvn war:war` for generating the WAR files for iTrust.

2. Build trigger on `git push`

Once a build is triggered upon a `git push` and completed successfully, the ansible [script](Deployment_RollingUpdate/scripts/iTrust-configure.yml) `iTrust-configure.yml` reploys and configures iTrust instances one by one. We accomplish this by using ansible's `serial` [option](https://github.ncsu.edu/itrust-no-one/project/blob/e6fd86fca0e9aa26572beb474f4c255511306bc4/Deployment_RollingUpdate/scripts/iTrust-configure.yml#L17) and setting it to 1, meaning it runs the play on one host at a time instead of the default behavior of running it on all hosts in parallel. Note that when the initial build from running `jenkins.yaml` completes, the builds for both projects are automatically triggered because of the 'Polling SCM' option being set in the [build-jobs](Deployment_RollingUpdate/build-jobs).

3. Heartbeat monitor of iTrust servers

Finally, in the demo, we show a simple heartbeat log of our servers and show that as one iTrust server becomes unavailable, the rest are still operational. We accomplish this using our `monitor.js` [script](Deployment_RollingUpdate/monitor.js) in JavaScript to print out the status code of requesting the URLs of each of the iTrust servers every 2.5 seconds.

* **Infrastructure Upgrade**

We created a 4-node kubernetes cluster (1 master node and 3 worker nodes) using the `kubeadm` tool and an [ansible playbook](Infrastructure/kube-provision.yaml). We ran into some trouble with the networking of the pods themselves and were unable to get a working checkbox deployment on the cluster. [Demo Playback](https://youtu.be/drvCb64TiGQ).

* **Canary Release**.

For our Canary Release strategy, we first provision one [stable](https://github.ncsu.edu/itrust-no-one/project/blob/milestone3/Canary%20Relase/stableIP.txt) and one [canary](https://github.ncsu.edu/itrust-no-one/project/blob/milestone3/Canary%20Relase/canaryIP.txt) instance of checkbox and save the IP in respective .txt files (one can provision n stable instances). Stable checkbox instance has node server, nginx server and shared MongoDB server running in a container. MongoDB server is exposed to the public so that we maintain only one instance of MongoDB. The canary instance has only nginx server and a node server, it is querying stable instance's MongoDB server. We start our [proxy server](https://github.ncsu.edu/itrust-no-one/project/blob/milestone3/Canary%20Relase/canaryRelase.js) which is primarily doing two things:
1. Redirecting 80% traffic to the stable instance and 20% traffic to the canary instance (if an alert has not been set and canary is functional) else it redirects 100% traffic to the stable instance.
2. Heartbeat mechanism which continuously sends a request to Canary instance and if it doesn't respond we raise an alert and the proxy server will start redirecting traffic to only stable instance.

![canary release](https://media.github.ncsu.edu/user/6324/files/2bfc3c2c-418a-11e8-82db-c1683d51bd4c)

### [Screencast](https://youtu.be/1wnfNaBePmE)
