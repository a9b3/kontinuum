#!/usr/bin/env bash
j
usage() {
cat << EOF
required
./script.sh --name <name> --root <root>

OPTIONS:
  -h              help

REQUIRED OPTIONS:
  --name                    subdomain name eg. foo.example.com
  --root                    root domain eg. example.com
  --target-hosted-zone-id   visit http://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region
  --target-dns-name         visit http://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region
EOF
}

# check if awscli and jq are installed
hash aws 2>/dev/null || { echo >&2 "Require aws-cli to be installed run pip install awscli"; exit 1; }
hash jq 2>/dev/null || { echo >&2 "Require jq"; exit 1; }

# get variables from command line flags
while test $# -gt 0; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --root*)
      shift
      root=$1
      shift
      ;;
    --name*)
      shift
      name=$1
      shift
      ;;
    --target-hosted-zone-id*)
      shift
      target_hosted_zone_id=$1
      shift
o     ;;
    --target-dns-name*)
      shift
      target_dns_name=$1
      shift
      ;;
    *)
      break
      ;;
  esac
done

source=$1

# Check if required args are passed in
if [[ -z $name ]] || [[ -z $root ]]; then
  usage
  exit 1
fi

# Create hosted zone if it doesn't exists otherwise don't do anything.
#
# @param {!string} root - root uri eg. "foo.com." note the trailing period.
lazy_create_root_hosted_zones() {
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
upsert_resource_record_sets() {
  name=$1
  hosted_zone_id=$2
  # IMPORTANT: HostedZoneId for the alias target has to be the same as the s3
  # bucket, refer to link below
  #
  # http://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region
  #
  # also, it cannot be retreived via cli SMH
  # https://forums.aws.amazon.com/thread.jspa?threadID=116724
  target_hosted_zone_id=${3:-"Z3BJ6K6RIION7M"} # this value is for us-west-2
  target_dns_name=${4:-"s3-website-us-west-2.amazonaws.com."}

  aws route53 change-resource-record-sets --hosted-zone-id $hosted_zone_id --change-batch "$(echo '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "AliasTarget": {
            "HostedZoneId": "<target_hosted_zone_id>",
            "DNSName": "<target_dns_name>",
            "EvaluateTargetHealth": false
          },
          "Name": "<name>",
          "Type": "A"
        }
      }
    ],
    "Comment": "Creating an alias for <name>"
  }' | sed \
    -e "s/<name>/$name./g" \
    -e "s/<target_dns_name>/$target_dns_name/g" \
    -e "s/<target_hosted_zone_id>/$target_hosted_zone_id/g")"
}

lazy_create_root_hosted_zones $root

hosted_zone_id="$(aws route53 list-hosted-zones \
  | jq -r '.HostedZones[] | select(.Name=="'$root'.") | .Id')"

upsert_resource_record_sets $name $hosted_zone_id $target_hosted_zone_id $target_dns_name

# if root is name that means this is an index route so we need to also create www.
if [ $name == $root ]; then
  upsert_resource_record_sets www.$root $hosted_zone_id $target_hosted_zone_id $target_dns_name
fi
