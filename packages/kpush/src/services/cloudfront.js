import AWS from 'aws-sdk'

import configuration from 'services/configuration'

export async function createDistribution({
  domain,
  alias,
  arn,
}) {
  const s3BucketOriginId = `S3-${domain}`
  const s3BucketDomainName = `${domain}.s3.amazonaws.com`
  const param = {
    "DistributionConfig": {
      "CallerReference": `${domain}:${alias}:${Date.now()}`,
      "Aliases"        : {
        "Quantity": 1,
        "Items"   : [
          alias,
        ],
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
          "QueryStringCacheKeys": {
            "Quantity": 1,
            "Items"   : [
              "version",
            ],
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
        "SmoothStreaming"           : false,
        "DefaultTTL"                : 86400,
        "MaxTTL"                    : 31536000,
        "Compress"                  : true,
        "LambdaFunctionAssociations": {
          "Quantity": 0,
        },
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
      "WebACLId"     : "",
      "HttpVersion"  : "http2",
      "IsIPV6Enabled": true,
    },
  }
  return await getServiceObject().createDistribution(param).promise()
}

export async function getDistributionGivenDomain({
  domain,
} = {}) {
  const distributions = await listDistributions()
  return distributions.filter(a => a.Aliases.Items.includes(domain))
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
