## Kontinuum Push

A simple script that will create all necessary resources in aws to host and
deploy a static site.

#### Prereq

Purchase domain name on [Route53](https://console.aws.amazon.com/route53/home#DomainListing:).

After puchasing a domain name aws will create a hosted zone automatically and
you will be able to run the script to push your site to aws. Be sure to read the
main readme to set up your environment.

After your environment is set up you can run the script.

```
./node_modules/kontinuum/push.sh --domain foo.com --source ./build --root foo.com --include-www
```
