import fs              from 'fs'
import path            from 'path'
import invariant       from 'invariant'
import chalk           from 'chalk'

import * as acm        from 'services/acm'
import * as s3         from 'services/s3'
import * as cloudfront from 'services/cloudfront'

/**
 * Push will deploy a given directory to the given domain.
 *
 * 1. Determine if domain is a root domain.
 * 2. Check if certs exist for root domain and wildcard root domain.
 *    no
 *      - create cert for domain
 *          if root domain
 *            - create cert for root domain
 *      - exit application
 *    yes
 *      - continue
 * 3. Check if s3 bucket exists.
 *    no
 *      - create s3 bucket for domain
 *    yes
 *      - continue
 *    - upload source to s3 bucket
 * 4. Check if cloudfront distribution exists.
 *    no
 *      - create distribution for domain
 *          if root domain
 *            - create distribution for root domain
 *    yes
 *      - continue
 * 5. Check if route53 record exists for domain
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

  // const rootDomain = getRootDomain(domain)
  // const certDomains = [
  //   rootDomain,
  //   `*.${rootDomain}`,
  // ]
  // const certs = await Promise.all(certDomains.map(async d => {
  //   const cert = await acm.getCertForDomain({domain: d})
  //   const certDetails = await acm.describeCertificate({ arn: cert.CertificateArn })
  //   if (!cert) {
  //     await acm.lazilyCreateCert({domain: d})
  //     log(chalk.yellow(`${d} requested a certificate check your email to confirm.`))
  //   }
  //   if (cert && certDetails.Status !== 'ISSUED') {
  //     log(chalk.red(`${d}'s certificate status isn't issued you might want to delete and
  //     try again and make sure to validate the email sent to the email associated with your amazon aws account.`))
  //     return false
  //   }
  //   log(`${d} certificate status is ${certDetails.Status}`)
  //   return cert
  // }))
  // if (certs.some(cert => !cert)) {
  //   return
  // }
  //
  // await s3.lazilyCreateSPABucket({domain, log})
  // await s3.sync({domain, source: path.resolve(source), log})

  const d = await cloudfront.getDistributionGivenDomain({domain})
  if (d.length === 0) {
    log(`Creating cloudfront distribution for ${domain}`)
    await cloudfront.createDistribution({
      domain,
      arn  : await acm.getCertForDomain({domain}),
      alias: domain,
    })
  }
  if (isRootDomain(domain)) {
    const wwwDistribution = await cloudfront.getDistributionGivenDomain({domain: `www.${domain}`})
    if (wwwDistribution.length === 0) {
      log(`Creating cloudfront distribution for www.${domain} as well`)
      await cloudfront.createDistribution({
        domain: `www.${domain}`,
        arn   : await acm.getCertForDomain({domain: `*.${domain}`}),
        alias : `www.${domain}`,
      })
    }
  }
  acm.getCertForDomain({domain})
  console.log(d)
}

function getRootDomain(domain) {
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
