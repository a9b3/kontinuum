#!/bin/bash

# Push will lazily create and update resources in aws given a domain. This will
# handle all the necessary steps to get a static site deployed with https. You
# still have to buy the domain name yourself manually in route53 as well as
# validate the certificate in your email.
#
# 1. S3
#   a. Create S3 bucket if it doesn't exist.
#   b. Sync S3 bucket.
# 2. ACM
#   a. Create certificate if it doesn't exist.
# 3. Cloudfront
#   a. Create cloudfront distribution if it doesn't exist.
#   b. else, invalidate cloudfront.
# 4. Route53
#   a. Create A record if it doesn't exist.

###############################################################################
# Init
###############################################################################

usage() {
cat << EOF
required
./push.sh --domain <domain> --source <source> --root <root> [--include-www]

OPTIONS:
  --help, -h      Display help.

REQUIRED OPTIONS:
  --domain        Domain name you desire. eg. foo.example.com
  --source        Directory to upload.
  --root          Root domain. eg. example.com. Even if domain is example.com
                  you still have to specify the root, which is also example.com

OPTIONAL:
  --include-www   Also create a record for www.example.com. eg. if domain is
                  example.com, this flag will also create www.example.com.
EOF
}

# check if awscli is installed
hash aws 2>/dev/null || { echo >&2 "Require aws-cli to be installed run pip install awscli"; exit 1; }

# get variables from command line flags
while test $# -gt 0; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --domain*)
      shift
      domain=$1
      shift
      ;;
    --root*)
      shift
      root=$1
      shift
      ;;
    --source*)
      shift
      source=$1
      shift
      ;;
    --include-www*)
      shift
      includeWWW=true
      ;;
    *)
      break
      ;;
  esac
done

# Check if required args are passed in
if [[ -z $domain ]] || [[ -z $source ]] || [[ -z $root ]]; then
  usage
  exit 1
fi

###############################################################################
# Commands
###############################################################################

# Request a certificate if it does not exist for the given domain name.
#
# ex.
# ./acm_request_certificate_if_not_exist.sh foo.example.com
acm_request_certificate_if_not_exist() {
  domain=$1

  request_cert() {
    domain=$1

    domain_exists=$(aws acm --region us-east-1 list-certificates | jq '.CertificateSummaryList[] | select(.DomainName == "'$domain'")')

    if [ -n "$domain_exists" ]; then
      echo $domain already exists
      return
    fi

    # Must use us-east-1 for acm or else it won't work.
    aws acm request-certificate --region us-east-1 --domain-name $domain
  }

  request_cert $domain
}

acm_get_certificate_arn() {
  domain=$1
  acm_certificate_arn=$(aws acm --region us-east-1 list-certificates | jq -r '.CertificateSummaryList[] | select(.DomainName == "'$domain'") | .CertificateArn')
  echo $acm_certificate_arn
}

acm_lazy_create_cert() {
  root=$1

  domain_exists=$(aws acm --region us-east-1 list-certificates | jq '.CertificateSummaryList[] | select(.DomainName == "'$root'")')
  if [ ! -n "$domain_exists" ]; then
    echo $domain requires email validation
    exit 0
  fi

  domain_exists=$(aws acm --region us-east-1 list-certificates | jq '.CertificateSummaryList[] | select(.DomainName == "'*.$root'")')
  if [ ! -n "$domain_exists" ]; then
    echo *.$domain requires email validation
    exit 0
  fi

  acm_request_certificate_if_not_exist "*.$root"
  acm_request_certificate_if_not_exist $root
}

s3_make_bucket() {
  domain=$1

  aws s3 mb s3://$domain &&
  aws s3api put-bucket-policy --bucket $domain --policy "$(echo '{
    "Version":"2012-10-17",
    "Statement":[{
    "Sid":"PublicReadGetObject",
          "Effect":"Allow",
      "Principal": "*",
        "Action":["s3:GetObject"],
        "Resource":["arn:aws:s3:::example.com/*"
        ]
      }
    ]
  }' | sed -e "s/example\.com/$domain/g")" &&

  # let single page apps handle routes
  aws s3 website s3://$domain/ --index-document index.html --error-document index.html || { exit 1; }
}

s3_make_redirect_bucket() {
  from=$1
  to=$2

  aws s3 mb s3://$from &&
  aws s3api put-bucket-website --bucket $from --website-configuration "$(echo '{
    "RedirectAllRequestsTo": {
      "HostName": "example.com"
    }
  }' | sed -e "s/example\.com/$to/g")" || { exit 1; }
}

# ex.
#
# ./cloudfront_get_domain.sh foo.example.com
# => dd9adjsdj39dj.cloudfront.net
cloudfront_get_domain() {
  domain=$1
  cloudfront_domain=$(aws cloudfront list-distributions | jq -r '.DistributionList.Items[] | select(.Aliases.Items[0]=="'$domain'") | .DomainName')
  echo $cloudfront_domain
}

# Create a cloudfront distribution with the following configs.
# - default root /index.html
# - error root /index.html, allows single page apps to work
# - http2
# - cache HEAD, GET
#
# ex.
#
# ./cloudfront_create_distribution.sh foo.example.com foo.example.com arn:aws:acm:us-east-1:asdoijaiodjisdjoad:certificate/aoisjdioasjdioj
cloudfront_create_distribution() {
  # s3 bucket name
  # eg. foo.example.com
  domain=$1
  # Specify if it's different than domain, what you want the public address to be.
  cname=$2
  acm_certificate_arn=$3

  # Variables
  CALLER_REFERENCE="$domain-$(date)"
  S3_ORIGIN_ID="S3-$domain"
  S3_DOMAIN_NAME="$domain.s3.amazonaws.com"
  ALTERNATIVE_CNAME=$cname
  ACM_CERTIFICATE_ARN=$acm_certificate_arn

  echo $ACM_CERTIFICATE_ARN

  config=$(echo '{
      "DistributionConfig": {
          "CallerReference": "<CALLER_REFERENCE>",
          "Aliases": {
              "Quantity": 1,
              "Items": [
                "<ALTERNATIVE_CNAME>"
              ]
          },
          "DefaultRootObject": "/index.html",
          "Origins": {
              "Quantity": 1,
              "Items": [
                  {
                      "Id": "<S3_ORIGIN_ID>",
                      "DomainName": "<S3_DOMAIN_NAME>",
                      "OriginPath": "",
                      "S3OriginConfig": {
                          "OriginAccessIdentity": ""
                      }
                  }
              ]
          },
          "DefaultCacheBehavior": {
              "TargetOriginId": "<S3_ORIGIN_ID>",
              "ForwardedValues": {
                  "QueryString": true,
                  "Cookies": {
                      "Forward": "none"
                  },
                  "Headers": {
                      "Quantity": 0
                  },
                  "QueryStringCacheKeys": {
                      "Quantity": 1,
                      "Items": [
                          "version"
                      ]
                  }
              },
              "TrustedSigners": {
                "Enabled": false,
                "Quantity": 0
              },
              "ViewerProtocolPolicy": "redirect-to-https",
              "MinTTL": 0,
              "AllowedMethods": {
                  "Quantity": 2,
                  "Items": [
                      "HEAD",
                      "GET"
                  ],
                  "CachedMethods": {
                      "Quantity": 2,
                      "Items": [
                          "HEAD",
                          "GET"
                      ]
                  }
              },
              "SmoothStreaming": false,
              "DefaultTTL": 86400,
              "MaxTTL": 31536000,
              "Compress": true,
              "LambdaFunctionAssociations": {
                  "Quantity": 0
              }
          },
          "CacheBehaviors": {
              "Quantity": 0
          },
          "CustomErrorResponses": {
              "Quantity": 1,
              "Items": [
                  {
                      "ErrorCode": 403,
                      "ResponsePagePath": "/index.html",
                      "ResponseCode": "200",
                      "ErrorCachingMinTTL": 300
                  }
              ]
          },
          "Comment": "",
          "PriceClass": "PriceClass_All",
          "Enabled": true,
          "ViewerCertificate": {
              "ACMCertificateArn": "'$ACM_CERTIFICATE_ARN'",
              "SSLSupportMethod": "sni-only",
              "MinimumProtocolVersion": "TLSv1",
              "Certificate": "'$ACM_CERTIFICATE_ARN'",
              "CertificateSource": "acm"
          },
          "Restrictions": {
              "GeoRestriction": {
                  "RestrictionType": "none",
                  "Quantity": 0
              }
          },
          "WebACLId": "",
          "HttpVersion": "http2",
          "IsIPV6Enabled": true
      }
  }' | sed \
    -e "s/<CALLER_REFERENCE>/$CALLER_REFERENCE/g" \
    -e "s/<S3_ORIGIN_ID>/$S3_ORIGIN_ID/g" \
    -e "s/<S3_DOMAIN_NAME>/$S3_DOMAIN_NAME/g" \
    -e "s/<ALTERNATIVE_CNAME>/$ALTERNATIVE_CNAME/g")

  aws cloudfront create-distribution --cli-input-json "$config"
}

s3_lazy_create_bucket() {
  domain=$1
  includeWWW=$2

  domain_exists=$(aws s3 ls | grep " $domain")
  if [ ! -n "$domain_exists" ]; then
    echo creating s3 bucket for $domain
    s3_make_bucket $domain || { exit 1; }
  else
    echo s3 bucket for $domain already exists
  fi

  if [ "$includeWWW" = true ]; then
    domain_exists=$(aws s3 ls | grep "www.$domain")
    if [ ! -n "$domain_exists" ]; then
      echo creating s3 bucket for www.$domain
      s3_make_redirect_bucket www.$domain $domain || { exit 1; }
    else
      echo s3 bucket for www.$domain already exists
    fi
  fi
}

cloudfront_lazy_create_distribution() {
  domain=$1
  root=$2
  includeWWW=$3

  if [ -z "$(cloudfront_get_domain $root)" ]; then
    cloudfront_create_distribution $domain $domain $(acm_get_certificate_arn *.$root)
  fi

  if [ "$includeWWW" = true ]; then
    if [ -z "$(cloudfront_get_domain www.$root)" ]; then
      cloudfront_create_distribution www.$domain www.$domain $(acm_get_certificate_arn *.$root)
    fi
  fi
}

# Create hosted zone if it doesn't exists otherwise don't do anything.
#
# @param {!string} root - root uri eg. "foo.com." note the trailing period.
route53_lazy_create_hosted_zone() {
  root=$1

  hosted_zone_exists="$(aws route53 list-hosted-zones | jq -r '.HostedZones[] | select(.Name=="'$root'.")')"
  # early return if hosted zone already exists
  [[ ! -z $hosted_zone_exists ]] && return

  aws route53 create-hosted-zone --name $root. --caller-reference $root
}

# Create a record set.
#
# @param {!string} name
# @param {!string} hosted_zone_id - from list-hosted-zones hosted zones id
# @param {!string} target_hosted_zone_id - http://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region
# @param {!string} target_dns_name - http://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region
route53_upsert_a_record_alias() {
  domain=$1
  route53_hosted_zone_id=$2
  # IMPORTANT: HostedZoneId for the alias target has to be the same as the s3
  # bucket, refer to link below
  #
  # http://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region
  #
  # also, it cannot be retreived via cli SMH
  # https://forums.aws.amazon.com/thread.jspa?threadID=116724
  target_hosted_zone_id=${3:-"Z3BJ6K6RIION7M"} # this value is for us-west-2
  target_dns_name=${4:-"s3-website-us-west-2.amazonaws.com."}

  aws route53 change-resource-record-sets --hosted-zone-id $route53_hosted_zone_id --change-batch "$(echo '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "AliasTarget": {
            "HostedZoneId": "<target_hosted_zone_id>",
            "DNSName": "<target_dns_name>",
            "EvaluateTargetHealth": false
          },
          "Name": "<domain>",
          "Type": "A"
        }
      }
    ],
    "Comment": "Creating an alias for <domain>"
  }' | sed \
    -e "s/<domain>/$domain./g" \
    -e "s/<target_dns_name>/$target_dns_name/g" \
    -e "s/<target_hosted_zone_id>/$target_hosted_zone_id/g")"
}

route53_lazy_create_a_record() {
  domain=$1
  root=$2
  includeWWW=$3

  route53_lazy_create_hosted_zone $root

  # http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-route53-aliastarget.html
  # Cloudfront hosted zone id is ALWAYS this value.
  CLOUD_FRONT_HOSTED_ZONE_ID=Z2FDTNDATAQYW2
  route53_hosted_zone_id="$(aws route53 list-hosted-zones \
    | jq -r '.HostedZones[] | select(.Name=="'$root'.") | .Id')"

  cloudfront_target_dns_name=$(cloudfront_get_domain $domain)
  route53_upsert_a_record_alias $domain $route53_hosted_zone_id $CLOUD_FRONT_HOSTED_ZONE_ID $cloudfront_target_dns_name

  if [ "$includeWWW" = true ]; then
    cloudfront_target_dns_name=$(cloudfront_get_domain www.$root)
    route53_upsert_a_record_alias www.$root $route53_hosted_zone_id $CLOUD_FRONT_HOSTED_ZONE_ID $cloudfront_target_dns_name
  fi
}

###############################################################################
# Main
###############################################################################

main() {
  domain=$1
  root=$2
  source=$3
  includeWWW=$4

  acm_lazy_create_cert $root
  s3_lazy_create_bucket $domain $includeWWW
  aws s3 sync $source s3://$domain --delete
  cloudfront_lazy_create_distribution $domain $root $includeWWW
  route53_lazy_create_a_record $domain $root $includeWWW
}

main $domain $root $source $includeWWW
