import AWS           from 'aws-sdk'

import configuration from 'services/configuration'

export async function upsertARecordToCloudfront({
  rootDomain,
  domain,
  cloudFrontDNSName, // cloudfront distribution dns name
}) {
  const hostedZone = await getHostedZoneGivenRootDomain({rootDomain})
  const CLOUD_FRONT_HOSTED_ZONE_ID='Z2FDTNDATAQYW2'

  const params = {
    ChangeBatch: {
      Changes: [
        {
          Action             : 'UPSERT',
          "ResourceRecordSet": {
            "AliasTarget": {
              "HostedZoneId"        : CLOUD_FRONT_HOSTED_ZONE_ID,
              "DNSName"             : cloudFrontDNSName,
              "EvaluateTargetHealth": false,
            },
            "Name": domain,
            "Type": "A",
          },
        },
      ],
    },
    HostedZoneId: hostedZone.Id,
  }
  return await getServiceObject().changeResourceRecordSets(params).promise()
}

export async function lazilyCreateRootHostedZone({rootDomain, log}) {
  let hostedZone = await getHostedZoneGivenRootDomain({rootDomain})
  if (!hostedZone) {
    log(chalk.green(`creating route53 hosted zone for ${rootDomain}`))
    hostedZone = await createHostedZoneForRootDomain({rootDomain})
  }

  return hostedZone
}

export async function createHostedZoneForRootDomain({rootDomain}) {
  const params = {
    CallerReference: `route53:${rootDomain}:${Date.now()}`,
    Name           : rootDomain,
  }
  return await getServiceObject().createHostedZone(params).promise()
}

export async function getHostedZoneGivenRootDomain({rootDomain}) {
  const { HostedZones } = await getServiceObject().listHostedZones().promise()
  return HostedZones.filter(h => h.Name === `${rootDomain}.`)[0]
}

const getServiceObject = (() => {
  let route53ServiceObject
  /**
   * getServiceObject will lazily create the ACM service object.
   */
  return function() {
    if (route53ServiceObject) {
      return route53ServiceObject
    }

    route53ServiceObject = new AWS.Route53({
      ...configuration,
    })
    return route53ServiceObject
  }
})()
