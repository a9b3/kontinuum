# Kontinuum

A set of services and tools to help with deployment.

- [kontinuum-route53](https://github.com/esayemm/kontinuum/tree/master/packages/kontinuum-route53)
- [kontinuum-s3-deploy](https://github.com/esayemm/kontinuum/tree/master/packages/kontinuum-s3-deploy)



## Usage

### Deploy static site to s3 and setup route53 routing.

You can first upload static files to a s3 bucket and then point route53 to the bucket.

`yarn add kontinuum-route53 kontinuum-s3-deploy --dev`

```json
{
	"scripts": {
		"deploy:s3": "./node_modules/kontinuum-s3-deploy/script.sh --name foo.com --is-index ./build",
		"deploy:route53": "./node_modules/kontinuum-route53/script.sh --name foo.com --root foo.com",
		"deploy": "npm run deploy:s3 && npm run deploy:route53"
	}
}
```


## Setup Environment

These scripts are just wrappers around aws-cli so first you need the cli. You will need python and pip because awscli is a python package. Also requires jq.

```
brew install python jq
pip install awscli
```

### Setup Env Vars (Also Needed For CI)

Each script will reference the following env vars.

```
AWS_DEFAULT_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

#### How to get these values?

`AWS_DEFAULT_REGION`: [Region Default List](http://docs.aws.amazon.com/general/latest/gr/rande.html) eg. `us-west-2`

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