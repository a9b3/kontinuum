import inquirer from 'inquirer'

import * as acm  from '../../services/acm'

export default async function selectCertificates() {
  const certs = await acm.getAllCerts()
  const selectedDomains = await inquirer.prompt([
    {
      type   : 'checkbox',
      message: 'Select certificates',
      name   : 'certs',
      choices: certs.map(c => ({name: c.DomainName})),
    },
  ])
  return certs.filter(c => selectedDomains.certs.includes(c.DomainName))
}
