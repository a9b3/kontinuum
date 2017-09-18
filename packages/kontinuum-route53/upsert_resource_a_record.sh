#!/usr/bin/env bash

usage() {
cat << EOF
required
./upsert_resource_a_record.sh --name <name> --root <root> --ip <ip_address>

OPTIONS:
  -h              help

REQUIRED OPTIONS:
  --name                    subdomain name eg. foo.example.com
  --root                    root domain eg. example.com
  --ip                      ip address
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
    --ip*)
      shift
      ip_address=$1
      shift
      ;;
    *)
      break
      ;;
  esac
done

# Check if required args are passed in
if [[ -z $name ]] || [[ -z $root ]] || [[ -z $ip ]]; then
  usage
  exit 1
fi

###############################################################################
# FUNCTIONS
###############################################################################

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

# upsert_resource_a_record will create an 'A Record' with the value of an ip address.
#
# @param {!string} name - eg. foo.example.com
# @param {!string} hosted_zone_id - from list-hosted-zones hosted zones id
# @param {!string} ip_address
upsert_resource_a_record() {
  name=$1
  hosted_zone_id=$2
  ip_address=$3

  aws route53 change-resource-record-sets --hosted-zone-id $hosted_zone_id
  --change-batch "$(echo '{
      "Changes": [
        {
          "Action": "UPSERT",
          "ResourceRecordSet": {
            "ResourceRecords": [
              {
                "Value": "<ip_address>"
              }
            ]
            "Name": "<name>",
            "Type": "A"
          }
        }
      ],
      "Comment": "Creating an alias for <name>"
  }' | sed  \
    -e "s/<ip_address>/$ip_address/g" \
    -e "s/<name>/$name./g")"
}

###############################################################################
# MAIN
###############################################################################

lazy_create_root_hosted_zones $root

hosted_zone_id="$(aws route53 list-hosted-zones \
  | jq -r '.HostedZones[] | select(.Name=="'$root'.") | .Id')"

upsert_resource_a_record $name $hosted_zone_id $ip_address

# if root is name that means this is an index route so we need to also create www.
if [ $name == $root ]; then
  upsert_resource_a_record www.$root $hosted_zone_id $ip_address
fi
