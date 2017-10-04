import AWS           from 'aws-sdk'

import configuration from 'services/configuration'

/**
 * lazilyCreateRootCert will request a certificate if one does not already exist.
 *
 * @returns {object}
 * { cert: { CertificateArn: string, DomainName: string }, created: boolean }
 */
export async function lazilyCreateRootCert({
  rootDomain,
} = {}) {
  const cert = await getCertForRootDomain({rootDomain})
  if (cert) {
    return { cert, created: false }
  }

  const result = await createCertForRootDomain({rootDomain})
  return { cert: result, created: true }
}

export async function deleteCert({
  arn,
}) {
  const params = {
    CertificateArn: arn,
  }
  return await getServiceObject().deleteCertificate(params).promise()
}

/**
 * createCertForRootDomain will request a certificate for the given domain.
 *
 * @returns {object}
 * { CertificateArn: string, DomainName: string }
 */
async function createCertForRootDomain({
  rootDomain,
} = {}) {
  const serviceObject = getServiceObject()

  const params = {
    DomainName             : `*.${rootDomain}`,
    SubjectAlternativeNames: [
      rootDomain,
    ],
  }
  const { CertificateArn } = await serviceObject.requestCertificate(params).promise()
  return await describeCertificate({ arn: CertificateArn })
}

/**
 * getCertForRootDomain will get the certificate arn for the given domain.
 *
 * @returns {object}
 * { CertificateArn: string, DomainName: string }
 */
async function getCertForRootDomain({
  rootDomain = '',
} = {}) {
  const certs = await getAllCerts()
  const certsDetail = await Promise.all(certs.map(cert => describeCertificate({ arn: cert.CertificateArn })))
  return certsDetail.filter(detail => detail.SubjectAlternativeNames.includes(rootDomain))[0]
}

/**
 * @returns {object}
 * { CertificateArn: string, DomainName: string }
 */
async function describeCertificate({
  arn,
}) {
  const params = {
    CertificateArn: arn,
  }
  const {
    Certificate,
  } = await getServiceObject().describeCertificate(params).promise()
  return Certificate
}

/**
 * @returns {array<object>}
 * [{ CertificateArn: string, DomainName: string }]
 */
async function getAllCerts() {
  const {
    CertificateSummaryList,
  } = await getServiceObject().listCertificates().promise()
  return CertificateSummaryList
}


const getServiceObject = (() => {
  let acmServiceObject
  /**
   * getServiceObject will lazily create the ACM service object.
   */
  return function() {
    if (acmServiceObject) {
      return acmServiceObject
    }

    acmServiceObject = new AWS.ACM({
      ...configuration,
      // Only us-east-1 is supported for acm.
      region: 'us-east-1',
    })
    return acmServiceObject
  }
})()
