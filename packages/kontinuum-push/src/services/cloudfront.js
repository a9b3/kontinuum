import AWS from 'aws-sdk'

import configuration from 'services/configuration'

/**
 * @param {string} domain
 * @param {string} aliases - cname associated with this distribution.
 * @param {string} arn - CertificateArn
 * @returns {object}
 * {
 *   distribution: {
 *     Id: string,
 *     ARN: string,
 *     Status: string,
 *     DomainName: string,
 *     Aliases: {
 *       Items: [string]
 *     }
 *   },
 *   created: boolean,
 * }
 */
export async function lazilyCreateDistribution({
  domain,
  aliases,
  arn,
}) {
  const distribution = await getDistributionGivenDomain({domain})
  if (distribution) {
    return { distribution, created: false }
  }

  const result = await createDistribution({
    domain,
    aliases,
    arn,
  })
  return {distribution: result, created: true}
}

/**
 * @returns {object}
 * {
 *   Id: string,
 *   ARN: string,
 *   Status: string,
 *   DomainName: string,
 *   Aliases: {
 *     Items: [string]
 *   }
 * }
 * Look for Status === 'Deployed'
 */
export async function createDistribution({
  domain,
  aliases = [],
  arn,
}) {
  const s3BucketOriginId = `S3-${domain}`
  const s3BucketDomainName = `${domain}.s3.amazonaws.com`
  const param = {
    "DistributionConfig": {
      "CallerReference": `${domain}:${aliases.join(',')}:${Date.now()}`,
      "Aliases"        : {
        "Quantity": aliases.length,
        "Items"   : aliases,
      },
      "DefaultRootObject": "/index.html",
      "Origins"          : {
        "Quantity": 1,
        "Items"   : [
          {
            "Id"            : s3BucketOriginId,
            "DomainName"    : s3BucketDomainName,
            "OriginPath"    : "",
            "S3OriginConfig": {
              "OriginAccessIdentity": "",
            },
          },
        ],
      },
      "DefaultCacheBehavior": {
        "TargetOriginId" : s3BucketOriginId,
        "ForwardedValues": {
          "QueryString": true,
          "Cookies"    : {
            "Forward": "none",
          },
          "Headers": {
            "Quantity": 0,
          },
        },
        "TrustedSigners": {
          "Enabled" : false,
          "Quantity": 0,
        },
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL"              : 0,
        "AllowedMethods"      : {
          "Quantity": 2,
          "Items"   : [
            "HEAD",
            "GET",
          ],
          "CachedMethods": {
            "Quantity": 2,
            "Items"   : [
              "HEAD",
              "GET",
            ],
          },
        },
        "SmoothStreaming": false,
        "DefaultTTL"     : 86400,
        "MaxTTL"         : 31536000,
        "Compress"       : true,
      },
      "CacheBehaviors": {
        "Quantity": 0,
      },
      "CustomErrorResponses": {
        "Quantity": 1,
        "Items"   : [
          {
            "ErrorCode"         : 403,
            "ResponsePagePath"  : "/index.html",
            "ResponseCode"      : "200",
            "ErrorCachingMinTTL": 300,
          },
        ],
      },
      "Comment"          : "",
      "PriceClass"       : "PriceClass_All",
      "Enabled"          : true,
      "ViewerCertificate": {
        "ACMCertificateArn"     : `${arn}`,
        "SSLSupportMethod"      : "sni-only",
        "MinimumProtocolVersion": "TLSv1",
        "Certificate"           : `${arn}`,
        "CertificateSource"     : "acm",
      },
      "Restrictions": {
        "GeoRestriction": {
          "RestrictionType": "none",
          "Quantity"       : 0,
        },
      },
      "WebACLId": "",
    },
  }
  const { Distribution } = await getServiceObject().createDistribution(param).promise()
  return Distribution
}

/**
 * @returns {object}
 * {
 *   Id: string,
 *   ARN: string,
 *   Status: string,
 *   DomainName: string,
 *   Aliases: {
 *     Items: [string]
 *   }
 * }
 * Look for Status === 'Deployed'
 */
async function getDistributionGivenDomain({
  domain,
} = {}) {
  const distributions = await listDistributions()
  return distributions.filter(a => a.Aliases.Items.includes(domain))[0]
}

export async function createInvalidation({
  DistributionId,
}) {
  const params = {
    DistributionId,
    InvalidationBatch: {
      CallerReference: `${DistributionId}:${Date.now()}`,
      Paths          : {
        Quantity: 1,
        Items   : [
          '/*',
        ],
      },
    },
  }
  return await getServiceObject().createInvalidation(params).promise()
}

async function listDistributions() {
  const {
    DistributionList: {
      Items,
    },
  } = await getServiceObject().listDistributions().promise()
  return Items
}

const getServiceObject = (() => {
  let cloudfrontServiceObject
  /**
   * getServiceObject will lazily create the ACM service object.
   */
  return function() {
    if (cloudfrontServiceObject) {
      return cloudfrontServiceObject
    }

    cloudfrontServiceObject = new AWS.CloudFront({
      ...configuration,
    })
    return cloudfrontServiceObject
  }
})()
