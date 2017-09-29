import AWS           from 'aws-sdk'

import configuration from 'services/configuration'

/**
 * lazilyCreateCert will request a certificate if one does not already exist.
 */
export async function lazilyCreateCert({
  domain,
} = {}) {
  const cert = await getCertForDomain({domain})
  if (cert) {
    return cert
  }

  return await createCertForDomain({domain})
}

/**
 * createCertForDomain will request a certificate for the given domain.
 */
export async function createCertForDomain({
  domain,
} = {}) {
  const serviceObject = getServiceObject()

  const params = {
    DomainName: domain,
    // TODO add naked url here, also search based on this so you dont need two
    // cloudfront distributions
    SubjectAlternativeNames: [
      '',
    ],
    // DomainValidationOptions: [
    //   {
    //     DomainName      : 'STRING_VALUE',
    //     ValidationDomain: 'STRING_VALUE',
    //   },
    // ],
  }
  return await serviceObject.requestCertificate(params).promise()
}

/**
 * getCertForDomain will get the certificate arn for the given domain.
 *
 * @returns {object}
 * { CertificateArn: string, DomainName: string }
 */
export async function getCertForDomain({
  domain = '',
} = {}) {
  return (await getAllCerts()).filter(c => c.DomainName === domain)[0]
}

export async function describeCertificate({
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

export async function getAllCerts() {
  const {
    CertificateSummaryList,
  } = await getServiceObject().listCertificates().promise()
  return CertificateSummaryList
}

export async function deleteCert({
  arn,
}) {
  const params = {
    CertificateArn: arn,
  }
  return await getServiceObject().deleteCertificate(params).promise()
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
