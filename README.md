# kontinuum

A set of services and tools to help with deployment.

## Usage

#### Deploy a static site to aws

**Prereq** Buy domain name on aws route53, which will automatically create a hosted zone for you.

*Note: First time running this script you will need to manually validate the
certificate via your email so the certificates become valid in aws. Then run the
script again*

All steps will be performed lazily.

1. Creates certs using ACM.
2. Creates buckets in s3.
3. Creates a cloudfront distribution.
4. Creates A records in route53.

Add the script as a dev dep.

`yarn add kontinuum-push --dev`

Now add a npm script to call the push script.

```json
{
	"scripts": {
		"deploy": "./node_modules/kontinuum-push/build/bin/index.js push --domain foo.example.com --source ./build"
	}
}
```

**IMPORTANT** First time running, this will take like an hour to propagate, you
might see access denied aws errors in the meantime if you try hitting your
domain.

## Setup Environment

**Important:** Do this in the environment before running the script.

These scripts are just wrappers around aws-cli so first you need the cli. You will need python and pip because awscli is a python package. Also requires jq.

```
brew install python jq
pip install awscli
```

#### Setup Env Vars (Also Needed For CI)

Each script will reference the following env vars.

```
AWS_DEFAULT_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

List of regions for the env var `AWS_DEFAULT_REGION`: [Region Default List](http://docs.aws.amazon.com/general/latest/gr/rande.html) eg. `us-west-2`

#### Set up IAM User in aws

[AWS Best Practices](http://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html?icmpid=docs_iam_console)

*TL;DR*

1. [Create New Group](https://console.aws.amazon.com/iam/home?region=us-west-2#/groups), attach the following policies.

	- AmazonS3FullAccess
	- AmazonRoute53FullAccess

2. [Create IAM User](https://console.aws.amazon.com/iam/home?region=us-west-2#/users), select `programmatic access` for access type. Add user to the group you just created.
3. 	You can download the csv and save it in a safe location. This file contains your `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

#### Configure awscli

`aws configure`

You will be prompted for `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
