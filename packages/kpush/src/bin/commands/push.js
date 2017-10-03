import fs              from 'fs'
import path            from 'path'
import invariant       from 'invariant'
import chalk           from 'chalk'

import * as acm        from 'services/acm'
import * as s3         from 'services/s3'
import * as cloudfront from 'services/cloudfront'
import * as route53    from 'services/route53'

/**
 * Push will deploy a given directory to the given domain.
 *
 * @param {!string} domain - Must be in the format of foo.example.com,
 * meaning no bar.foo.example.com or bar.example.com.au
 * @param {!path} source
 */
export default async function push({
  domain,
  source,
  log = console.log,
} = {}) {
  validateArguments({domain, source})
  const rootDomain = extractRootDomain(domain)

  const acmResults = await acm.lazilyCreateRootCert({rootDomain})
  if (acmResults.created) {
    log(chalk.yellow(`${rootDomain} requested a certificate, check your email to confirm.`))
    return false
  } else if (acmResults.cert.Status !== 'ISSUED') {
    log(chalk.red(`${d}'s certificate status isn't issued you might want to delete and
      try again and make sure to validate the email sent to the email associated with your amazon aws account.`))
    return false
  }

  await s3.lazilyCreateSPABucket({domain, log})
  await s3.sync({domain, source: path.resolve(source), log})

  const cfResults = await cloudfront.lazilyCreateDistribution({
    domain,
    arn    : acmResults.cert.CertificateArn,
    aliases: [domain, isRootDomain(domain) && `www.${domain}`].filter(Boolean),
  })
  if (!cfResults.created) {
    log(`Creating cloudfront invalidation for ${domain}`)
    await cloudfront.createInvalidation({ DistributionId: cfResults.distribution.Id })
  } else {
    log(`Creating cloudfront distribution for ${domain}`)
  }

  await route53.lazilyCreateRootHostedZone({rootDomain, log})
  await route53.upsertARecordToCloudfront({rootDomain, domain, cloudFrontDNSName: cfResults.distribution.DomainName})
  if (isRootDomain(domain)) {
    await route53.upsertARecordToCloudfront({rootDomain, domain: `www.${domain}`, cloudFrontDNSName: cfResults.distribution.DomainName})
  }
}

function extractRootDomain(domain) {
  const tokens = domain.split('.')
  return tokens.length === 3 ? tokens.slice(1).join('.') : domain
}

function isRootDomain(domain) {
  return domain.split('.').length === 2
}

function validateArguments({
  domain,
  source,
}) {
  const domainSplitLength = domain.split('.').length
  invariant(domainSplitLength >= 2 && domainSplitLength <= 3, `'domain' must be in this format foo.example.com or example.com`)
  invariant(fs.existsSync(source), `'source' must be a valid file path.`)
}
