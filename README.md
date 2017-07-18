# Kontinuum

A set of services and tools to help with deployment.

- [kontinuum-route53](https://github.com/esayemm/kontinuum/tree/master/packages/kontinuum-route53)
- [kontinuum-s3-deploy](https://github.com/esayemm/kontinuum/tree/master/packages/kontinuum-s3-deploy)

## Setup Environment

These scripts are just wrappers around aws-cli so first you need the cli. You will need python and pip because awscli is a python package. Also requires jq.

```
brew install python jq
pip install awscli
```

### Setup Env Vars

Each script will reference the following env vars.

```
AWS_DEFAULT_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

#### How to get these values

[Region Default List](http://docs.aws.amazon.com/general/latest/gr/rande.html) eg. `us-west-2`

[AWS Best Practices](http://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html?icmpid=docs_iam_console)

*TL;DR*

1. [Create New Group](https://console.aws.amazon.com/iam/home?region=us-west-2#/groups), attach the following policies.
	
	- AmazonS3FullAccess
	- AmazonRoute53FullAccess
	
2. [Create IAM User](https://console.aws.amazon.com/iam/home?region=us-west-2#/users), select `programmatic access` for access type. Add user to the group you just created.
3. 	You can download the csv and save it in a safe location. This file contains your `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.


4. Run `aws configure`


## Usage

### Deploy static site to s3 and setup route53 routing.

```json
{
	"scripts": {
		"deploy:s3": "",
		"deploy:route53": "",
		"deploy": ""
	}
}
```